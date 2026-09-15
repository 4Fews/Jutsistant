import { addDays, endOfDay, set as setTime, startOfDay } from 'date-fns'
import { db } from './db'
import { DEMO_PREFIX } from './id'
import { getSettings, updateSettings } from './settings'
import type { Course, Task } from '@/types'

/**
 * Data contoh agar aplikasi tidak kosong saat pertama dibuka.
 * Semua id berawalan "demo-" sehingga bisa dihapus tanpa
 * menyentuh data asli yang sudah Anda buat sendiri.
 */

const now = () => Date.now()

function at(dayOffset: number, hh: number, mm: number): number {
  return setTime(addDays(new Date(), dayOffset), {
    hours: hh,
    minutes: mm,
    seconds: 0,
    milliseconds: 0,
  }).getTime()
}

function endOf(dayOffset: number): number {
  return endOfDay(addDays(new Date(), dayOffset)).getTime()
}

function demoCourses(): Course[] {
  const t = now()
  const base = { archived: false, createdAt: t, updatedAt: t }
  return [
    {
      ...base,
      id: `${DEMO_PREFIX}c1`,
      name: 'Kalkulus II',
      lecturer: 'Dr. Wulandari',
      color: 'coral',
      icon: '📐',
      order: 0,
      schedule: [
        { id: `${DEMO_PREFIX}s1`, day: 1, start: '07:30', end: '09:10', room: 'R.301' },
        { id: `${DEMO_PREFIX}s2`, day: 3, start: '13:00', end: '14:40', room: 'R.301' },
      ],
    },
    {
      ...base,
      id: `${DEMO_PREFIX}c2`,
      name: 'Algoritma & Pemrograman',
      lecturer: 'Budi Santoso, M.Kom.',
      color: 'sky',
      icon: '💻',
      order: 1,
      schedule: [
        { id: `${DEMO_PREFIX}s3`, day: 2, start: '09:20', end: '11:00', room: 'Lab B' },
        { id: `${DEMO_PREFIX}s4`, day: 4, start: '09:20', end: '11:00', room: 'Lab B' },
      ],
    },
    {
      ...base,
      id: `${DEMO_PREFIX}c3`,
      name: 'Fisika Dasar',
      lecturer: 'Prof. Hartono',
      color: 'mint',
      icon: '🧪',
      order: 2,
      schedule: [{ id: `${DEMO_PREFIX}s5`, day: 1, start: '13:00', end: '15:30', room: 'R.205' }],
    },
    {
      ...base,
      id: `${DEMO_PREFIX}c4`,
      name: 'Bahasa Inggris Akademik',
      lecturer: 'Ms. Ayu',
      color: 'lilac',
      icon: '🗣️',
      order: 3,
      schedule: [{ id: `${DEMO_PREFIX}s6`, day: 5, start: '08:00', end: '09:40', room: 'R.102' }],
    },
  ]
}

function demoTasks(): Task[] {
  const t = now()
  const base = { createdAt: t, updatedAt: t, completedAt: null as number | null }
  return [
    // sengaja mencakup semua tingkat urgensi supaya indikator warnanya terlihat
    {
      ...base,
      id: `${DEMO_PREFIX}t1`,
      title: 'Kumpulkan latihan soal integral parsial',
      courseId: `${DEMO_PREFIX}c1`,
      dueAt: endOf(-1),
      hasTime: false,
      priority: 'tinggi',
      status: 'belum',
      progress: 0,
    },
    {
      ...base,
      id: `${DEMO_PREFIX}t2`,
      title: 'Laporan praktikum gerak parabola',
      note: 'Sertakan grafik dan analisis galat.',
      courseId: `${DEMO_PREFIX}c3`,
      dueAt: at(0, 23, 59),
      hasTime: true,
      priority: 'tinggi',
      status: 'jalan',
      progress: 60,
    },
    {
      ...base,
      id: `${DEMO_PREFIX}t3`,
      title: 'Tugas 3 — sorting & searching',
      courseId: `${DEMO_PREFIX}c2`,
      dueAt: at(2, 17, 0),
      hasTime: true,
      priority: 'sedang',
      status: 'jalan',
      progress: 25,
    },
    {
      ...base,
      id: `${DEMO_PREFIX}t4`,
      title: 'Baca bab 4 sebelum kuis',
      courseId: `${DEMO_PREFIX}c1`,
      dueAt: endOf(4),
      hasTime: false,
      priority: 'rendah',
      status: 'belum',
      progress: 0,
    },
    {
      ...base,
      id: `${DEMO_PREFIX}t5`,
      title: 'Essay 500 kata: pengalaman semester pertama',
      courseId: `${DEMO_PREFIX}c4`,
      dueAt: endOf(6),
      hasTime: false,
      priority: 'sedang',
      status: 'belum',
      progress: 0,
    },
    {
      ...base,
      id: `${DEMO_PREFIX}t6`,
      title: 'Kuis Algoritma bab 1–3',
      courseId: `${DEMO_PREFIX}c2`,
      dueAt: at(9, 9, 20),
      hasTime: true,
      priority: 'tinggi',
      status: 'belum',
      progress: 0,
    },
    {
      ...base,
      id: `${DEMO_PREFIX}t7`,
      title: 'Bayar UKT semester ini',
      courseId: null,
      dueAt: endOf(12),
      hasTime: false,
      priority: 'tinggi',
      status: 'belum',
      progress: 0,
    },
    {
      ...base,
      id: `${DEMO_PREFIX}t8`,
      title: 'Revisi laporan minggu lalu',
      courseId: `${DEMO_PREFIX}c3`,
      dueAt: endOf(-3),
      hasTime: false,
      priority: 'sedang',
      status: 'selesai',
      progress: 100,
      completedAt: startOfDay(addDays(new Date(), -3)).getTime(),
    },
  ]
}

export async function hasDemoData(): Promise<boolean> {
  const c = await db.courses.where('id').startsWith(DEMO_PREFIX).count()
  if (c > 0) return true
  const t = await db.tasks.where('id').startsWith(DEMO_PREFIX).count()
  return t > 0
}

export async function insertDemoData(): Promise<void> {
  await db.transaction('rw', db.courses, db.tasks, async () => {
    await db.courses.bulkPut(demoCourses())
    await db.tasks.bulkPut(demoTasks())
  })
  updateSettings({ seeded: true })
}

export async function clearDemoData(): Promise<void> {
  await db.transaction('rw', db.courses, db.tasks, async () => {
    await db.courses.where('id').startsWith(DEMO_PREFIX).delete()
    await db.tasks.where('id').startsWith(DEMO_PREFIX).delete()
  })
}

/**
 * Dipanggil sekali saat app mulai. Hanya mengisi kalau database benar-benar
 * kosong DAN data contoh belum pernah dibuat — jadi setelah Anda menghapusnya,
 * ia tidak akan muncul kembali.
 */
export async function seedIfFirstRun(): Promise<void> {
  if (getSettings().seeded) return
  const [courses, tasks] = await Promise.all([db.courses.count(), db.tasks.count()])
  if (courses > 0 || tasks > 0) {
    updateSettings({ seeded: true })
    return
  }
  await insertDemoData()
}
