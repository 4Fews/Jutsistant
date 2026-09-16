import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isCloudConfigured } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/authStore'
import { getSettings } from '@/lib/settings'

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <img src="./favicon.svg" alt="" className="h-12 w-12 animate-pulse rounded-xl" />
        <p className="text-[13px] text-ink-3">Memuat…</p>
      </div>
    </div>
  )
}

/**
 * Pintu masuk aplikasi.
 *
 * Kalau Supabase dikonfigurasi, seluruh isi aplikasi hanya bisa dibuka setelah
 * masuk. Ini yang mencegah kondisi "dipakai tanpa akun" — dulu di situlah data
 * contoh sempat bercampur dengan data asli yang ditarik dari cloud.
 *
 * Tanpa .env, tidak ada gerbang sama sekali: aplikasi berjalan lokal murni
 * persis seperti versi sebelum ada sinkronisasi.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()

  if (!isCloudConfigured) return <>{children}</>

  // sesi masih dipulihkan dari penyimpanan — jangan kedipkan layar login dulu
  if (auth.status === 'loading') return <Splash />

  if (auth.status === 'signed-out') {
    // Jaring pengaman: sedang offline dan token tidak bisa disegarkan, padahal
    // perangkat ini memang pernah dipakai masuk. Jangan kunci pengguna dari
    // datanya sendiri yang sudah tersimpan lokal — biarkan masuk, sinkronisasi
    // menyusul sendiri begitu online lagi.
    if (!navigator.onLine && getSettings().lastUserId) return <>{children}</>
    return <Navigate to="/masuk" replace />
  }

  return <>{children}</>
}
