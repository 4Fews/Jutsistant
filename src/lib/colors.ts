import type { CSSProperties } from 'react'
import type { ColorKey } from '@/types'

export const COLOR_KEYS: ColorKey[] = ['coral', 'amber', 'lemon', 'mint', 'sage', 'sky', 'lilac', 'rose']

export const COLOR_LABEL: Record<ColorKey, string> = {
  coral: 'Koral',
  amber: 'Amber',
  lemon: 'Lemon',
  mint: 'Mint',
  sage: 'Sage',
  sky: 'Langit',
  lilac: 'Lilac',
  rose: 'Mawar',
}

/**
 * Menyuntik warna mata kuliah sebagai CSS variable lokal.
 * Pemakaian di child: bg-[var(--course-soft)], text-[var(--course)], dst.
 *
 * Warna mata kuliah tidak pernah dipakai untuk teks kecil yang penting —
 * hanya titik, garis, dan latar lembut — agar kontras tetap aman.
 */
export function courseVars(color: ColorKey): CSSProperties {
  return {
    '--course': `var(--c-${color})`,
    '--course-soft': `var(--c-${color}-soft)`,
  } as CSSProperties
}

/** Emoji pilihan untuk ikon mata kuliah. */
export const ICON_CHOICES = [
  '📐', '📊', '🧮', '📈', '💻', '⌨️', '🖥️', '🔌',
  '🧪', '🔬', '⚗️', '🧬', '🌡️', '⚛️', '🧲', '🛠️',
  '📚', '📖', '✍️', '🗣️', '🌏', '🏛️', '⚖️', '💰',
  '🎨', '🎬', '🎵', '📷', '🩺', '🌱', '🍀', '🚀',
]
