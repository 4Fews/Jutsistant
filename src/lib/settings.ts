import { useSyncExternalStore } from 'react'

export interface Settings {
  /** kapan terakhir kali export backup dijalankan */
  lastBackupAt: number | null
  /** data contoh sudah pernah dibuat (agar tidak muncul lagi setelah dihapus) */
  seeded: boolean
  /** cursor sinkronisasi cloud — tarik perubahan server sejak waktu ini */
  lastSyncAt: number | null
  /** migrasi data lokal ke cloud sudah pernah ditawarkan/selesai untuk user ini */
  migratedUserId: string | null
  /** akun yang terakhir masuk di perangkat ini — dipakai sebagai jaring
   *  pengaman supaya pengguna tidak terkunci dari cache-nya sendiri saat offline */
  lastUserId: string | null
}

const KEY = 'semesta.settings'
const DEFAULTS: Settings = {
  lastBackupAt: null,
  seeded: false,
  lastSyncAt: null,
  migratedUserId: null,
  lastUserId: null,
}

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let current = read()
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* mode privat: pengaturan tidak tersimpan, aplikasi tetap jalan */
  }
  listeners.forEach((l) => l())
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => DEFAULTS,
  )
}
