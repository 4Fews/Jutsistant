import { db } from './db'
import { isDemo } from './id'
import { getSettings, updateSettings } from './settings'
import { runSync } from './syncEngine'

export interface LocalCounts {
  courses: number
  tasks: number
  notes: number
  attachments: number
}

/** Data contoh (id berawalan "demo-") sengaja tidak pernah dihitung/diunggah. */
export async function countLocalData(): Promise<LocalCounts> {
  const [courses, tasks, notes, attachments] = await Promise.all([
    db.courses.toArray(),
    db.tasks.toArray(),
    db.notes.toArray(),
    db.attachments.toArray(),
  ])
  return {
    courses: courses.filter((c) => !isDemo(c.id)).length,
    tasks: tasks.filter((t) => !isDemo(t.id)).length,
    notes: notes.filter((n) => !isDemo(n.id)).length,
    attachments: attachments.length,
  }
}

export function needsMigrationPrompt(userId: string): boolean {
  return getSettings().migratedUserId !== userId
}

export function markMigrated(userId: string): void {
  updateSettings({ migratedUserId: userId })
}

/**
 * "Migrasi" pada dasarnya adalah satu siklus sync penuh: push mengunggah
 * seluruh data lokal aktif, pull menarik apa pun yang sudah ada di cloud
 * untuk akun ini. Aman dijalankan berkali-kali — upsert berdasarkan id
 * yang sama, tidak pernah membuat duplikat.
 */
export async function migrateLocalToCloud(): Promise<void> {
  await runSync()
}
