import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameYear,
  startOfDay,
} from 'date-fns'
import { id as localeId } from 'date-fns/locale/id'

export const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
export const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function fmtTime(ts: number): string {
  return format(ts, 'HH:mm')
}

/** "14 Sep" atau "14 Sep 2027" kalau beda tahun. */
export function fmtDate(ts: number): string {
  const d = new Date(ts)
  return isSameYear(d, new Date())
    ? format(d, 'd MMM', { locale: localeId })
    : format(d, 'd MMM yyyy', { locale: localeId })
}

/**
 * Label deadline yang enak dibaca:
 * "Terlambat 2 hari", "Hari ini · 23:59", "Besok", "Jumat", "14 Sep".
 */
export function fmtDue(dueAt: number, hasTime: boolean): string {
  const diff = differenceInCalendarDays(dueAt, Date.now())
  const jam = hasTime ? ` · ${fmtTime(dueAt)}` : ''

  if (dueAt < Date.now()) {
    if (diff === 0) return `Terlambat${jam}`
    const n = Math.abs(diff)
    return n === 1 ? 'Terlambat 1 hari' : `Terlambat ${n} hari`
  }
  if (diff === 0) return `Hari ini${jam}`
  if (diff === 1) return `Besok${jam}`
  if (diff <= 6) return `${HARI_PANJANG[new Date(dueAt).getDay()]}${jam}`
  return `${fmtDate(dueAt)}${jam}`
}

/** Untuk <input type="date"> — "2026-09-14" di waktu lokal. */
export function toDateInput(ts: number): string {
  return format(ts, 'yyyy-MM-dd')
}

/** Untuk <input type="time"> — "23:59" di waktu lokal. */
export function toTimeInput(ts: number): string {
  return format(ts, 'HH:mm')
}

/**
 * Gabungkan nilai input tanggal + jam menjadi timestamp lokal.
 * Tanpa jam, deadline jatuh di akhir hari agar "terlambat" baru berlaku
 * setelah hari itu benar-benar lewat.
 */
export function fromDateTimeInput(date: string, time: string | null): number | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  if (!time) return endOfDay(new Date(y, m - 1, d)).getTime()
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime()
}

export function todayStart(): number {
  return startOfDay(new Date()).getTime()
}

/** "3 hari lalu", "hari ini", dipakai untuk info backup terakhir. */
export function fmtAgo(ts: number): string {
  const diff = differenceInCalendarDays(Date.now(), ts)
  if (diff === 0) return 'hari ini'
  if (diff === 1) return 'kemarin'
  if (diff < 30) return `${diff} hari lalu`
  return fmtDate(ts)
}
