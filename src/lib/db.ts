import Dexie, { type Table } from 'dexie'
import type { Attachment, Course, Note, Task } from '@/types'

class SemestaDB extends Dexie {
  courses!: Table<Course, string>
  tasks!: Table<Task, string>
  notes!: Table<Note, string>
  attachments!: Table<Attachment, string>

  constructor() {
    super('semesta')
    // Indeks pertama adalah primary key. Sisanya indeks sekunder.
    this.version(1).stores({
      courses: 'id, order, archived',
      tasks: 'id, courseId, dueAt, status, priority',
    })
    // v2 menambah catatan dan lampiran. Dexie menaikkan database lama
    // secara otomatis tanpa menyentuh data yang sudah ada.
    this.version(2).stores({
      courses: 'id, order, archived',
      tasks: 'id, courseId, dueAt, status, priority',
      notes: 'id, courseId, taskId, updatedAt, pinned',
      attachments: 'id, noteId, createdAt',
    })
  }
}

export const db = new SemestaDB()

/**
 * Minta browser tidak membuang IndexedDB saat penyimpanan menipis.
 * Chrome/Android biasanya mengabulkan untuk PWA terpasang.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}
