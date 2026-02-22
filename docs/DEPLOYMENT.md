# GRAINZ AI – Supabase + Vercel Deployment

Production URL: **https://grainzai.vercel.app**

Bu rehber projeyi **Supabase** (backend + auth + Edge Functions) ve **Vercel** (frontend) üzerinde yayına almak için adımları özetler.

---

## 1. Supabase kurulumu

### 1.1 Proje oluşturma

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. Proje adı, şifre, region seç → **Create**
3. Proje hazır olunca **Settings → General** içinden şunları not al:
   - **Project URL** (örn. `https://xxxxx.supabase.co`)
   - **anon public** key (API → Project API keys)

### 1.2 Veritabanı migration’ları

Proje klasöründe:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`YOUR_PROJECT_REF` → Dashboard’daki proje URL’sindeki ref (örn. `abcdefghijklmnop`).

Migration’lar `supabase/migrations/` içindedir; `db push` ile uzak veritabanına uygulanır.

### 1.3 Auth (Google) ayarı

Google ile giriş için:

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. **OAuth 2.0 Client ID** oluştur (Web application), authorized redirect URI:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. **Supabase Dashboard** → Authentication → Providers → Google:
   - **Client ID** ve **Client Secret** gir → Save

### 1.4 Edge Functions secret’ları

Dashboard → **Project Settings → Edge Functions** veya **Secrets** bölümünde aşağıdakileri ekle:

| Secret | Açıklama | Zorunlu |
|--------|----------|--------|
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/) API key (chat) | Evet |
| `ANTHROPIC_API_KEY` | Anthropic API key (title + prompt generator) | Evet |
| `OPENROUTER_REFERER` | Kendi site URL’in (örn. `https://grainzai.vercel.app`) | Hayır |
| `OPENROUTER_APP_TITLE` | Uygulama adı (örn. `GRAINZ AI`) | Hayır |

Lokal test için `supabase/functions/.env` içinde de tanımlayabilirsin; bu dosya git’e eklenmemeli.

### 1.5 Edge Functions deploy

```bash
npx supabase functions deploy chat
npx supabase functions deploy title-generator
npx supabase functions deploy prompt-generator
```

İlk seferde login isteyebilir: `npx supabase login`.

### 1.6 Auth URL’lerine Vercel domain ekleme

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: Vercel’deki production URL (örn. `https://grainzai.vercel.app`)
- **Redirect URLs** listesine ekle:
  - `https://grainzai.vercel.app/**`
  - Preview için: `https://*.vercel.app/**` (isteğe bağlı)

Kaydet.

---

## 2. Vercel kurulumu

### 2.1 Projeyi Vercel’e bağlama

1. [Vercel Dashboard](https://vercel.com) → **Add New → Project**
2. **Import Git Repository** → GitHub’dan `gokmency/grainzai` seç
3. **Framework Preset**: Vite (otomatik seçilebilir)
4. **Build & Output** (genelde otomatik):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 2.2 Ortam değişkenleri (Environment Variables)

Proje → **Settings → Environment Variables** içinde ekle:

| Name | Value | Environment |
|------|--------|--------------|
| `VITE_SUPABASE_URL` | Supabase Project URL (örn. `https://xxxxx.supabase.co`) | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key | Production, Preview |

İsteğe bağlı (PostHog):

| Name | Value |
|------|--------|
| `VITE_POSTHOG_KEY` | PostHog project API key |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` (veya kendi host’un) |

**Not:** `VITE_` ile başlayan değişkenler build sırasında frontend’e gömülür; hassas key’leri sadece backend’de kullan.

### 2.3 Deploy

- **Deploy** butonuna bas veya `main` branch’e push et; Vercel otomatik build + deploy yapar.
- Domain: `https://<proje-adı>.vercel.app` (veya kendi domain’in).

---

## 3. Kontrol listesi

- [ ] Supabase projesi oluşturuldu
- [ ] `supabase db push` ile migration’lar uygulandı
- [ ] Google OAuth Client ID/Secret Supabase Auth’a eklendi
- [ ] `OPENROUTER_API_KEY` ve `ANTHROPIC_API_KEY` Supabase secrets’a eklendi
- [ ] `chat`, `title-generator`, `prompt-generator` Edge Functions deploy edildi
- [ ] Supabase Auth URL Configuration’da Vercel domain’i tanımlandı
- [ ] Vercel’de `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` tanımlandı
- [ ] Vercel deploy alındı ve site açılıyor

---

## 4. Sık karşılaşılan sorunlar

**CORS / 401:**  
Supabase Edge Functions’ta CORS `*` kullanılıyor; sorun çoğunlukla eksik/yanlış JWT veya Supabase URL/key’den kaynaklanır. Tarayıcı Network sekmesinden isteğin hangi domain’e gittiğini ve header’ları kontrol et.

**Auth redirect loop:**  
Redirect URL’lerin Supabase’te tam olarak eşleştiğinden emin ol (trailing slash, http/https). Site URL’i production domain’e ayarlı olmalı.

**Chat çalışmıyor:**  
Supabase’te `OPENROUTER_API_KEY` tanımlı mı, Edge Function log’larında hata var mı kontrol et. OpenRouter dashboard’dan kredi/limit kontrolü yap.

**Build hatası (Vercel):**  
`npm run build`’i lokalde çalıştırıp aynı hata oluşuyor mu bak. Node/npm sürümünü Vercel’de (Settings → General) 18+ yap.
