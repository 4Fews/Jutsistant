/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL project Supabase, mis. "https://xxxx.supabase.co". Kosong = mode lokal saja. */
  readonly VITE_SUPABASE_URL?: string
  /** Publishable/anon key Supabase — aman di frontend, dilindungi Row Level Security. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
