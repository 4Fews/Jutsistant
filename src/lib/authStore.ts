import { useSyncExternalStore } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isCloudConfigured, supabase } from './supabaseClient'
import { updateSettings } from './settings'

export type AuthStatus = 'unconfigured' | 'loading' | 'signed-out' | 'signed-in'

interface AuthState {
  status: AuthStatus
  user: User | null
  session: Session | null
}

let state: AuthState = isCloudConfigured
  ? { status: 'loading', user: null, session: null }
  : { status: 'unconfigured', user: null, session: null }

const listeners = new Set<() => void>()

function setState(patch: Partial<AuthState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

/**
 * Dipanggil sekali saat app mulai (lihat main.tsx), sama seperti initTheme().
 * Kalau .env tidak diisi, fungsi ini tidak melakukan apa-apa — status tetap
 * 'unconfigured' dan seluruh app berjalan seperti versi lokal murni.
 */
export function initAuth(): void {
  if (!supabase) return

  supabase.auth.getSession().then(({ data }) => {
    setState({
      status: data.session ? 'signed-in' : 'signed-out',
      session: data.session,
      user: data.session?.user ?? null,
    })
    if (data.session?.user) updateSettings({ lastUserId: data.session.user.id })
  })

  // Menangkap login, logout, dan refresh token otomatis — termasuk yang
  // terjadi di tab lain pada perangkat yang sama.
  supabase.auth.onAuthStateChange((event, session) => {
    setState({
      status: session ? 'signed-in' : 'signed-out',
      session,
      user: session?.user ?? null,
    })
    // Keluar secara sengaja mencabut jaring pengaman offline; sesi yang
    // sekadar kedaluwarsa tidak.
    if (event === 'SIGNED_OUT') updateSettings({ lastUserId: null })
    else if (session?.user) updateSettings({ lastUserId: session.user.id })
  })
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
    () => (isCloudConfigured ? { status: 'loading' as const, user: null, session: null } : state),
  )
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email atau password salah.'
  if (/email not confirmed/i.test(message)) return 'Email belum dikonfirmasi. Cek pengaturan akun di Supabase.'
  if (/failed to fetch|network/i.test(message)) return 'Tidak ada koneksi internet.'
  return message
}

/** Mengembalikan pesan error (Bahasa Indonesia) kalau gagal, atau null kalau berhasil. */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Sinkronisasi belum dikonfigurasi di aplikasi ini.'
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? translateAuthError(error.message) : null
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}
