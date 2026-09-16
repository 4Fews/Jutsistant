import { useSyncExternalStore } from 'react'

export type Theme = 'terang' | 'gelap' | 'sistem'

const KEY = 'semesta.theme'
const listeners = new Set<() => void>()

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'terang' || v === 'gelap' ? v : 'sistem'
  } catch {
    return 'sistem'
  }
}

let current: Theme = read()

function apply(t: Theme): void {
  const dark = t === 'gelap' || (t === 'sistem' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.getElementById('theme-color')?.setAttribute('content', dark ? '#16130F' : '#FBF7F2')
}

export function setTheme(t: Theme): void {
  current = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* mode privat: tema tetap berlaku untuk sesi ini */
  }
  apply(t)
  listeners.forEach((l) => l())
}

/** Akses non-hook — dipakai syncEngine.ts untuk membaca/menulis tema saat sinkronisasi. */
export function getTheme(): Theme {
  return current
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const t = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => 'sistem' as Theme,
  )
  return [t, setTheme]
}

/** Dipanggil sekali saat app mulai; ikut berubah bila tema sistem berubah. */
export function initTheme(): void {
  apply(current)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (current === 'sistem') {
      apply(current)
      listeners.forEach((l) => l())
    }
  })
}
