# Grainz3D: Prompt’tan OpenSCAD’e Tam Akış ve Altyapı

Bu belge, kullanıcı ana sayfada bir prompt yazıp gönderdiği anda tetiklenen **tüm kod akışını**, **veri modellerini** ve **altyapıyı** adım adım açıklar.

---

## 1. Genel Bakış

**Grainz3D**, kullanıcının doğal dil (ve isteğe bağlı görsel/STL) ile yazdığı isteği alıp:

1. Yeni bir **konuşma** ve **mesaj** oluşturur,
2. **OpenRouter** üzerinden seçilen LLM (Gemini, Claude, GPT vb.) ile sohbet eder,
3. LLM **araç çağrıları** (tool calls) ile OpenSCAD kodu üretir veya parametre günceller,
4. Üretilen kodu **streaming** ile anlık gösterir ve veritabanına yazar.

Kullanıcı arayüzü **React + Vite**, backend **Supabase** (PostgreSQL, Auth, Storage, Edge Functions), LLM erişimi **OpenRouter** API üzerinden sağlanır.

---

## 2. Kullanıcı Akışı (Yüksek Seviye)

```
[Ana sayfa: PromptView]
    ↓ Kullanıcı metin (+ isteğe bağlı resim/STL) yazar, "Send" tıklar
[TextAreaChat.handleSubmit]
    → Content nesnesi oluşturulur (text, images, mesh, model, thinking)
    → onSubmit(content) çağrılır → bu PromptView'daki handleGenerate
[PromptView.handleGenerate mutation]
    → 1) Supabase: conversations tablosuna yeni satır insert
    → 2) sendMessage(content) tetiklenir (await edilmez)
    → 3) generateConversationTitle(conversationId, content) arka planda çalışır
    → 4) onSuccess: /editor/:conversationId sayfasına yönlendirilir
[messageService: useSendContentMutation]
    → 1) insertMessageAsync: messages tablosuna user mesajı insert
    → 2) sendToParametricChat: Edge Function /functions/v1/chat'e POST (streaming)
[Edge Function: chat]
    → 1) JWT ile kullanıcı doğrulanır
    → 2) Konuşmadaki mesajlar çekilir, Tree ile dallanma yapısı kurulur
    → 3) Son user mesajına giden dal (branch) seçilir, mesajlar OpenRouter formatına dönüştürülür
    → 4) OpenRouter'a streaming isteği atılır (system prompt + mesajlar + tools)
    → 5) Gelen stream: delta.content (metin), delta.tool_calls (araç çağrıları) işlenir
    → 6) build_parametric_model / apply_parameter_changes tool'ları çalıştırılır → OpenSCAD kodu/artifact oluşur
    → 7) Her güncelleme: messages tablosunda assistant mesajı güncellenir + stream ile frontend'e JSON satırları gönderilir
[Frontend: messageService useParametricChatMutation]
    → Stream satır satır okunur, her satır bir Message (JSON); React Query cache güncellenir
    → onSuccess: messageInsertedConversationUpdate ile conversations listesi güncellenir
[Editor sayfası: EditorView / ParametricEditor]
    → Mesajlar ve artifact (OpenSCAD kodu + parametreler) gösterilir; OpenSCAD viewer ile 3B önizleme yapılır
```

---

## 3. Frontend: Prompt Girişi ve Gönderim

### 3.1 Bileşen Hiyerarşisi

- **PromptView** (`src/views/PromptView.tsx`): Ana sayfa. Yeni konuşma ID’si üretir (`crypto.randomUUID()`), `TextAreaChat` ve `handleGenerate` mutation’ını kullanır.
- **TextAreaChat** (`src/components/TextAreaChat.tsx`): Metin alanı, model seçici, resim/STL yükleme, “Send” butonu. `onSubmit` prop’u ile parent’a `Content` gönderir.

### 3.2 Content Nesnesinin Oluşturulması

Kullanıcı “Send”e bastığında `TextAreaChat.handleSubmit` çalışır:

```ts
// src/components/TextAreaChat.tsx (özet)
const content: Content = {
  ...(input.trim() !== '' && { text: input.trim() }),
  ...(userImages.length > 0 && { images: userImages.map((img) => img.id) }),
  ...(meshUpload && {
    mesh: { id: meshUpload.id, fileType: 'stl' },
    meshRenders: meshUpload.renderIds,
    meshBoundingBox: meshUpload.boundingBox,
    meshFilename: meshUpload.filename,
  }),
  model: model,           // örn. 'google/gemini-3.1-pro-preview'
  thinking: supportsThinking,
};
onSubmit(content);
```

- **text**: Kullanıcının yazdığı prompt metni.
- **images**: Yüklenen referans görsellerin storage ID’leri (Supabase Storage’a önceden yüklenmiş).
- **mesh / meshRenders / meshBoundingBox / meshFilename**: STL yüklemesi varsa mesh bilgisi ve çoklu açıdan render görselleri.
- **model**: Seçilen LLM (OpenRouter model ID’si).
- **thinking**: Model “thinking” destekliyorsa `true` (ek reasoning token’ları için).

`Content` tipi `shared/types.ts` içinde tanımlı; `artifact`, `toolCalls`, `error` vb. alanlar assistant mesajları için kullanılır.

### 3.3 PromptView.handleGenerate (useMutation)

1. **Supabase kontrolü**: `isSupabaseConfigured()` ve `supabase` client yoksa hata fırlatılır.
2. **Konuşma oluşturma**:
   - `supabase.from('conversations').insert([{ id: newConversationId, user_id, title: 'New Conversation' }]).select().single()`
   - Yeni konuşma tek satır olarak eklenir ve dönen `conversation` kullanılır.
3. **Mesaj gönderimi**: `sendMessage(content)` çağrılır (await edilmez). Bu, `useSendContentMutation`’ın `mutate`’idir; konuşma oluştuktan hemen sonra chat akışı başlar.
4. **Başlık üretimi (arka plan)**:
   - `generateConversationTitle(conversation.id, content)` çağrılır.
   - Bu fonksiyon `conversationService` içinde tanımlı; Supabase Edge Function `title-generator`’a POST atar, dönen `title` ile `conversations` satırı güncellenir.
5. **onSuccess**: `queryClient.invalidateQueries(['conversations'])` ve `navigate(\`/editor/${data.conversationId}\`)` ile kullanıcı editor sayfasına yönlendirilir.

---

## 4. Mesaj Servisi: User Mesajı ve Chat Çağrısı

### 4.1 useSendContentMutation (messageService.ts)

Bu mutation’ın `mutationFn`’ı:

1. **User mesajını veritabanına yazar**:
   - `insertMessageAsync({ role: 'user', content, parent_message_id: conversation.current_message_leaf_id, conversation_id })`
   - Supabase `messages` tablosuna bir satır insert edilir; RLS ve trigger ile `conversations.updated_at` ve `conversations.current_message_leaf_id` güncellenir.
2. **Parametric chat’i tetikler**:
   - `sendToParametricChat({ model, messageId: userMessage.id, conversationId, thinking })`
   - Bu, `useParametricChatMutation`’ın `mutateAsync`’idir.

### 4.2 useParametricChatMutation: Chat Edge Function Çağrısı

- **URL**: `{VITE_SUPABASE_URL}/functions/v1/chat`
- **Method**: POST
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer {session.access_token}` (Supabase Auth JWT).
- **Body**:
  - `conversationId`, `messageId` (yeni eklenen user mesajının ID’si), `model`, `newMessageId` (client’ta üretilen UUID), `thinking`.

Frontend stream’i şöyle işler:

- `response.body.getReader()` ile okur.
- Gelen chunk’lar `TextDecoder` ile decode edilir, satırlara bölünür (`\n`).
- Her satır bir **Message** (JSON) olarak parse edilir; `queryClient.setQueryData(['messages', conversationId], ...)` ile React Query cache’teki mesaj listesi güncellenir (streaming assistant mesajı tek bir mesaj olarak güncellenir).
- İlk geçerli mesajda `initialize()` çağrılarak `conversation.current_message_leaf_id` cache’te `newMessageId` yapılır.
- Stream bittiğinde dönen son `Message` mutation’ın return değeri olur; `onSuccess`’te `messageInsertedConversationUpdate` ile conversations listesi ve ilgili cache’ler güncellenir.

Hata durumunda `onError`’da toast ile hata mesajı gösterilir ve veritabanına “An error occurred while processing your request.” metinli bir assistant mesajı yazılır.

---

## 5. Veritabanı Şeması

### 5.1 conversations

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid | PK, genelde client’ta `crypto.randomUUID()` ile üretilir |
| user_id | uuid | auth.users(id) FK |
| title | text | Örn. "New Conversation"; title-generator ile güncellenir |
| created_at, updated_at | timestamptz | Otomatik |
| current_message_leaf_id | uuid | En son mesajın id’si (dallanmada “leaf”) |

RLS: Kullanıcı sadece kendi `user_id`’li konuşmaları görebilir / güncelleyebilir.

### 5.2 messages

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid | PK |
| conversation_id | uuid | conversations(id) FK |
| role | text | 'user' | 'assistant' |
| content | jsonb | Content tipi (text, model, images, artifact, toolCalls, vb.) |
| parent_message_id | uuid | Nullable; dallanma için üst mesaj |
| created_at | timestamptz | Otomatik |

Trigger: `update_conversation_leaf()` — her yeni mesaj insert’te ilgili `conversations` satırının `current_message_leaf_id` ve `updated_at` alanları güncellenir.

RLS: Kullanıcı sadece kendi konuşmalarındaki mesajlara erişir (conversations üzerinden user_id ile).

---

## 6. Edge Function: chat (Detaylı)

### 6.1 Giriş ve Auth

- **OPTIONS**: CORS preflight; 204 + CORS header’ları ile cevap verilir.
- **POST değilse**: 405.
- **JWT**: `Authorization` header’dan alınır; `getAnonSupabaseClient({ headers: { Authorization } })` ile Supabase client oluşturulur. `supabaseClient.auth.getUser()` ile kullanıcı doğrulanır; yoksa 401.

### 6.2 İstek Gövdesi

- `messageId`: Az önce eklenen user mesajının ID’si.
- `conversationId`, `model`, `newMessageId`, `thinking`.

### 6.3 Mesajların Çekilmesi ve Dallanma

- `supabaseClient.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true })` ile tüm mesajlar alınır.
- **Tree** (`shared/Tree.ts`): Mesajlar `id` ve `parent_message_id` ile bir ağaç yapısına dönüştürülür. `getPath(messageId)` ile “root’tan bu mesaja kadar” olan dal (branch) alınır. Böylece sadece bu sohbet dalındaki mesajlar LLM’e gönderilir (edit/retry dallanması desteklenir).

### 6.4 Placeholder Assistant Mesajı

- Veritabanına hemen bir assistant mesajı insert edilir: `id: newMessageId`, `role: 'assistant'`, `content: { model }`, `parent_message_id: messageId`. Bu mesaj stream boyunca güncellenecek.

### 6.5 Mesajların LLM Formatına Dönüştürülmesi (messagesToSend)

- **formatUserMessage** (`_shared/messageUtils.ts`): User mesajı için:
  - `content.text` varsa metin bloğu eklenir.
  - `content.error` varsa (derleme hatası) “fix this OpenSCAD error: …” metni eklenir.
  - `content.images`: Storage’dan ilgili dosyalar indirilir, base64’e çevrilir; OpenRouter/OpenAI uyumlu “image” blokları (data URL / base64) eklenir.
  - `content.meshRenders` + `meshBoundingBox` + `meshFilename`: STL için boyut ve konumlama talimatları + render görselleri base64 olarak eklenir.
- Assistant mesajları: `content.artifact?.code` varsa kod, yoksa `content.text` gönderilir (OpenRouter tarafı plain text bekler).

Sonuç, OpenAI/OpenRouter formatında `messagesToSend` dizisi: `{ role: 'user'|'assistant', content: string | array }`.

### 6.6 OpenRouter İsteği

- **URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Headers**: `Authorization: Bearer OPENROUTER_API_KEY`, `Content-Type: application/json`.
- **Body** (özet):
  - `model`: İstekte gelen model (örn. `google/gemini-3.1-pro-preview`).
  - `messages`: `[{ role: 'system', content: PARAMETRIC_AGENT_PROMPT }, ...messagesToSend]`.
  - `tools`: OpenAI-formatında tool tanımları (`build_parametric_model`, `apply_parameter_changes`).
  - `stream: true`, `max_tokens: 16000` (thinking açıksa `reasoning.max_tokens` ve daha yüksek `max_tokens`).

System prompt (**PARAMETRIC_AGENT_PROMPT**): Kullanıcıyla konuşan, OpenSCAD kodu üretmek veya parametre değiştirmek için bu iki tool’u kullanması gereken bir “Grainz3D” asistanı tanımı.

### 6.7 Stream İşleme (ReadableStream)

- OpenRouter’dan gelen SSE satırları (`data: {...}`) parse edilir.
- **delta.content**: Metin biriktirilir; `content.text` güncellenir, `streamMessage(controller, { ...newMessageData, content })` ile her güncelleme hem DB’ye yazılmadan önce hem de stream ile client’a JSON satırı olarak gönderilir (gerçek DB güncellemesi stream sonunda yapılır).
- **delta.tool_calls**: Tool call id, name, arguments biriktirilir. `finish_reason === 'tool_calls'` olduğunda `handleToolCall(currentToolCall)` çağrılır.

### 6.8 handleToolCall: build_parametric_model

- **Girdi**: `text`, `imageIds`, `baseCode`, `error` (JSON parse).
- **baseCode** veya **error** varsa konuşma bağlamına ek mesajlar eklenir; ardından **STRICT_CODE_PROMPT** ile ayrı bir OpenRouter çağrısı yapılır (non-streaming). Bu çağrı sadece OpenSCAD kodu üretir; markdown code block’ları temizlenir.
- **generateTitleFromMessages(messagesToSend)** ile başlık üretilir (aynı fonksiyon içinde basit bir title generation).
- Üretilen kod **parseParameters** ile parametre listesine ayrıştırılır; `content.artifact = { title, version: 'v1', code, parameters }` atanır. Tool call listeden çıkarılır, `streamMessage` ile güncel mesaj client’a gönderilir.

### 6.9 handleToolCall: apply_parameter_changes

- **Girdi**: `updates: [{ name, value }, ...]`.
- Mevcut veya önceki mesajdaki `content.artifact.code` “base code” olarak alınır.
- **parseParameter** ile mevcut parametreler okunur; her `updates` elemanı için regex ile script içindeki `name = value;` satırı yeni değerle değiştirilir (tip: number, boolean, string dönüşümü yapılır).
- Yeni `artifact` (aynı title/version, güncel code ve parse edilmiş parameters) oluşturulur; yine `streamMessage` ile gönderilir.

### 6.10 Fallback: Metinden OpenSCAD Çıkarma

- Stream bittiğinde eğer hiç tool call ile artifact oluşmadıysa ama `content.text` varsa, **extractOpenSCADCodeFromText** ile metin içinden OpenSCAD kodu (markdown blokları veya ham kod) çıkarılır. Çıkarılan kod geçerliyse yine `title`, `parseParameters` ile artifact oluşturulup `content` güncellenir.

### 6.11 Son Güncelleme ve Yanıt

- Tüm işlemler bittikten sonra `supabaseClient.from('messages').update({ content }).eq('id', newMessageData.id)` ile assistant mesajı kalıcı olarak güncellenir.
- Son mesaj bir kez daha `streamMessage` ile gönderilir, ardından stream kapatılır.
- Response header’ları: `Content-Type: text/plain`, `Cache-Control: no-cache`, `Connection: keep-alive`, CORS header’ları.

Hata durumunda exception yakalanır; `content` içinde en azından metin veya artifact yoksa “An error occurred while processing your request.” metni eklenir, mesaj yine DB’de güncellenir ve gerekirse 500 + JSON error body dönülür.

---

## 7. Title Generator Edge Function

- **Endpoint**: `/functions/v1/title-generator`
- **Girdi**: `content` (ilk user mesajının Content’i), `conversationId`.
- **Auth**: JWT zorunlu.
- **İş**: Anthropic Claude (`claude-3-haiku`) ile kısa bir başlık üretilir; `ANTHROPIC_API_KEY` kullanılır.
- **Çıktı**: `{ title: string }`. Frontend bu başlığı alıp `conversations` tablosunda ilgili satırı günceller.

---

## 8. OpenRouter ve Modeller

- Tüm sohbet ve kod üretimi **OpenRouter** üzerinden yapılır; doğrudan Google/Anthropic/OpenAI client kullanılmaz.
- **OPENROUTER_API_KEY** Edge Function ortam değişkeninde (veya Supabase secrets) tanımlı olmalı.
- Frontend’deki model listesi (`PARAMETRIC_MODELS`, `src/lib/utils.ts`): `google/gemini-3.1-pro-preview`, `anthropic/claude-opus-4.6`, `openai/gpt-5.2`, `anthropic/claude-sonnet-4.6` vb. OpenRouter model ID’leri; chat isteğinde `model` alanına aynen gönderilir.

---

## 9. Storage (Görseller ve STL)

- **Bucket**: `images` (private). Yol: `{user_id}/{conversation_id}/{image_id}` (veya mesh/STL için `mesh-{id}.stl`, `render-{id}-{i}.png`).
- **Frontend**: Resim/STL yükleme `TextAreaChat` ve ilgili mutation’larda; dosyalar Supabase Storage’a yüklenir, `Content.images` veya `meshRenders`/`meshFilename` vb. olarak saklanır.
- **Chat tarafı**: `formatUserMessage` içinde bu path’ler kullanılarak Storage’dan indirme yapılır; OpenRouter’a base64 veya data URL olarak gönderilir.

---

## 10. Auth

- **Supabase Auth**: Anonymous sign-in açık; kullanıcı giriş yapmadan anonim olarak konuşma başlatabilir. E-posta/Google ile sonradan bağlanabilir.
- **JWT**: Tüm Edge Function ve Supabase REST çağrıları `Authorization: Bearer {access_token}` ile yapılır; token `supabase.auth.getSession()` ile alınır.

---

## 11. Özet Diyagram (Veri Akışı)

```
[User] → TextAreaChat (Content) → PromptView.handleGenerate
         → conversations.insert
         → sendMessage(content)
         → insertMessageAsync(user message) → messages.insert
         → fetch(/functions/v1/chat) [stream]
              → chat: auth, messages.select, Tree.getPath, formatUserMessage
              → OpenRouter (stream) → tool_calls / text
              → handleToolCall → build_parametric_model → OpenRouter (code) → artifact
              → handleToolCall → apply_parameter_changes → artifact (patched code)
              → messages.update(assistant), stream each state to client
         → Frontend: reader.read() → setQueryData(messages) → UI güncellenir
         → navigate(/editor/:id)
[title-generator] (async) → conversations.update(title)
```

---

## 12. Opsiyonel: Prompt Generator (İlk Prompt Önerisi)

- **Bileşen**: `TextAreaChat` içinde “Wand” benzeri bir buton; tıklanınca mevcut metin (veya boş) ile **prompt-generator** Edge Function çağrılır.
- **Endpoint**: `/functions/v1/prompt-generator`
- **Backend**: Anthropic SDK ile `claude-3-haiku`; tek bir parametrik model prompt’u üretir (liste değil). `ANTHROPIC_API_KEY` gerekir.
- **Sonuç**: Dönen `prompt` metni textarea’ya yazılır; kullanıcı düzenleyip gönderebilir. Bu adım **konuşma/mesaj oluşturmaz**, sadece input alanını doldurur.

---

## 13. Dosya ve Modül Referansı

| Amaç | Dosya / Konum |
|------|----------------|
| Ana sayfa, konuşma oluşturma, yönlendirme | `src/views/PromptView.tsx` |
| Prompt girişi, Content oluşturma, resim/STL | `src/components/TextAreaChat.tsx` |
| User mesajı insert, chat mutation, stream işleme | `src/services/messageService.ts` |
| Konuşma CRUD, generateConversationTitle | `src/services/conversationService.ts` |
| Content, Message, ParametricArtifact, Parameter tipleri | `shared/types.ts` |
| Mesaj ağacı (dallanma) | `shared/Tree.ts` |
| Chat Edge Function (OpenRouter, tools, streaming) | `supabase/functions/chat/index.ts` |
| User mesajını LLM formatına (metin, resim, mesh) | `supabase/functions/_shared/messageUtils.ts` |
| OpenSCAD parametrelerini parse etme | `supabase/functions/_shared/parseParameter.ts` |
| CORS header’ları | `supabase/functions/_shared/cors.ts` |
| Başlık üretimi (Claude) | `supabase/functions/title-generator/index.ts` |
| İlk prompt önerisi (Claude) | `supabase/functions/prompt-generator/index.ts` |
| Veritabanı şeması (conversations, messages, trigger) | `supabase/migrations/20250830041942_initialize.sql.sql` |
| Supabase client (opsiyonel, env kontrolü) | `src/lib/supabase.ts` |

---

Bu doküman, prompt gönderildiği anda tetiklenen tüm kod yolunu ve altyapıyı tek referans olarak kullanmak için tasarlanmıştır. Belirli bir dosya veya satır için kod incelemesi gerekiyorsa ilgili bölüm başlıklarına ve yukarıdaki tabloya göre ilgili modüllere gidilebilir.
