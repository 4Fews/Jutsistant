import type { Task } from '@/types'

export type Urgency = 'selesai' | 'terlambat' | 'hari-ini' | 'segera' | 'normal' | 'tanpa-deadline'

/**
 * Satu-satunya sumber kebenaran untuk aturan urgensi.
 * Deadline tanpa jam disimpan pada 23:59 hari itu, jadi perbandingan
 * "< sekarang" berlaku seragam untuk keduanya.
 */
export function urgencyOf(task: Task, now: number = Date.now()): Urgency {
  if (task.status === 'selesai') return 'selesai'
  if (task.dueAt == null) return 'tanpa-deadline'
  if (task.dueAt < now) return 'terlambat'

  const hariIniAkhir = new Date(now)
  hariIniAkhir.setHours(23, 59, 59, 999)
  if (task.dueAt <= hariIniAkhir.getTime()) return 'hari-ini'

  const tigaHari = hariIniAkhir.getTime() + 3 * 86_400_000
  if (task.dueAt <= tigaHari) return 'segera'

  return 'normal'
}

interface UrgencyStyle {
  /** class warna teks untuk badge */
  text: string
  /** class warna latar lembut untuk badge */
  bg: string
  /** class warna garis penanda di sisi kiri kartu */
  bar: string
}

export const URGENCY_STYLE: Record<Urgency, UrgencyStyle> = {
  terlambat: { text: 'text-late', bg: 'bg-late-soft', bar: 'bg-late' },
  'hari-ini': { text: 'text-today', bg: 'bg-today-soft', bar: 'bg-today' },
  segera: { text: 'text-soon', bg: 'bg-soon-soft', bar: 'bg-soon' },
  normal: { text: 'text-ink-2', bg: 'bg-surface-2', bar: 'bg-transparent' },
  'tanpa-deadline': { text: 'text-ink-3', bg: 'bg-surface-2', bar: 'bg-transparent' },
  selesai: { text: 'text-done', bg: 'bg-done-soft', bar: 'bg-transparent' },
}

/** Urutan tampil: paling mendesak di atas, tugas selesai paling bawah. */
const RANK: Record<Urgency, number> = {
  terlambat: 0,
  'hari-ini': 1,
  segera: 2,
  normal: 3,
  'tanpa-deadline': 4,
  selesai: 5,
}

const PRIORITY_RANK = { tinggi: 0, sedang: 1, rendah: 2 } as const

export function compareTasks(a: Task, b: Task, now: number = Date.now()): number {
  const ra = RANK[urgencyOf(a, now)]
  const rb = RANK[urgencyOf(b, now)]
  if (ra !== rb) return ra - rb

  // dalam kelompok yang sama: deadline terdekat dulu
  if (a.dueAt != null && b.dueAt != null && a.dueAt !== b.dueAt) return a.dueAt - b.dueAt
  if (a.dueAt != null && b.dueAt == null) return -1
  if (a.dueAt == null && b.dueAt != null) return 1

  // lalu prioritas, lalu yang terbaru dibuat
  const pa = PRIORITY_RANK[a.priority]
  const pb = PRIORITY_RANK[b.priority]
  if (pa !== pb) return pa - pb
  return b.createdAt - a.createdAt
}
