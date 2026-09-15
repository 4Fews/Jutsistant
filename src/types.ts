/** Semua timestamp adalah epoch milidetik (Date.now()). */

export type ColorKey = 'coral' | 'amber' | 'lemon' | 'mint' | 'sage' | 'sky' | 'lilac' | 'rose'

/** 0 = Minggu, 1 = Senin, ... 6 = Sabtu (sama seperti Date.getDay()). */
export type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface ClassSlot {
  id: string
  day: Day
  /** "HH:mm" waktu lokal, mis. "08:00" */
  start: string
  end: string
  room?: string
}

export interface Course {
  id: string
  name: string
  lecturer?: string
  color: ColorKey
  /** satu emoji */
  icon: string
  schedule: ClassSlot[]
  archived: boolean
  order: number
  createdAt: number
  updatedAt: number
}

export type Priority = 'rendah' | 'sedang' | 'tinggi'
export type Status = 'belum' | 'jalan' | 'selesai'

export interface Task {
  id: string
  title: string
  /** null = tugas umum, tidak terikat mata kuliah */
  courseId: string | null
  note?: string
  dueAt: number | null
  /** false = "seharian", jam tidak ditampilkan */
  hasTime: boolean
  priority: Priority
  status: Status
  /** 0-100 */
  progress: number
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

/** Simpul dokumen TipTap. Sengaja tidak mengimpor tipe TipTap agar
 *  lib/ tetap bebas dari editor dan bisa di-lazy-load terpisah. */
export interface NoteNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: NoteNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

export interface Note {
  id: string
  title: string
  /** null = catatan umum */
  courseId: string | null
  /** diisi kalau catatan dibuat dari sebuah tugas */
  taskId: string | null
  content: NoteNode
  /** turunan dari content, dipakai untuk pencarian isi */
  plainText: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export interface Attachment {
  id: string
  noteId: string
  /** nama tampilan, bisa diganti pengguna */
  name: string
  mime: string
  size: number
  blob: Blob
  createdAt: number
}
