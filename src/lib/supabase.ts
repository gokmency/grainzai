import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@shared/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean =>
  Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured()
  ? createClient<Database>(supabaseUrl!, supabaseKey!)
  : null;
