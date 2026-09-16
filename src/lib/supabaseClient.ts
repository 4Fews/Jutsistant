import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * true hanya kalau kedua env var terisi. Dipakai di seluruh app untuk
 * menyembunyikan UI akun/sinkronisasi dan melewati sync sepenuhnya —
 * tanpa file .env, Semesta harus tetap berjalan persis seperti versi lokal.
 */
export const isCloudConfigured = Boolean(url && anonKey)

/**
 * null kalau belum dikonfigurasi. Setiap pemakai wajib mengecek
 * isCloudConfigured (atau null-check) dulu — TypeScript memaksa ini,
 * jadi tidak mungkin ada kode yang diam-diam mengasumsikan cloud selalu aktif.
 */
export const supabase = isCloudConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
