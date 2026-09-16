import Dexie, { type Table } from 'dexie'
import type { Attachment, Course, Note, Task } from '@/types'

/** Tabel yang ikut disinkronkan ke Supabase. */
export type SyncTable = 'courses' | 'tasks' | 'notes' | 'attachments'

/**
 * Ditulis saat sebuah baris dihapus lokal, supaya sync engine tahu perlu
 * menandai deleted_at di cloud juga. Dihapus lagi kalau penghapusannya
 * diurungkan (restore) sebelum sempat dikirim.
 */
export interface SyncTombstone {
  /** `${table}:${recordId}` — supaya unik lintas tabel tanpa index majemuk */
  key: string
  table: SyncTable
  recordId: string
  createdAt: number
}

/** Menandai id lampiran yang blob-nya sudah pasti terunggah ke Storage,
 *  supaya tidak diupload ulang setiap siklus sync. */
export interface UploadedBlob {
  attachmentId: string
}

class SemestaDB extends Dexie {
  courses!: Table<Course, string>
  tasks!: Table<Task, string>
  notes!: Table<Note, string>
  attachments!: Table<Attachment, string>
  syncTombstones!: Table<SyncTombstone, string>
  uploadedBlobs!: Table<UploadedBlob, string>

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
    // v3 menambah tabel bantu untuk sinkronisasi cloud. Tidak menyentuh
    // data yang sudah ada di tabel lain.
    this.version(3).stores({
      courses: 'id, order, archived',
      tasks: 'id, courseId, dueAt, status, priority',
      notes: 'id, courseId, taskId, updatedAt, pinned',
      attachments: 'id, noteId, createdAt',
      syncTombstones: 'key, table',
      uploadedBlobs: 'attachmentId',
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
