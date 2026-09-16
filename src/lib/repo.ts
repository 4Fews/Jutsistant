import { db } from './db'
import { newId } from './id'
import { docToPlainText, emptyDoc } from './markdown'
import { clearTombstone, queueTombstone } from './syncEngine'
import type { Attachment, ClassSlot, Course, Note, NoteNode, Task } from '@/types'

// ---------------------------------------------------------------- mata kuliah

export type CourseDraft = Pick<Course, 'name' | 'color' | 'icon' | 'schedule'> &
  Partial<Pick<Course, 'lecturer'>>

export async function createCourse(draft: CourseDraft): Promise<string> {
  const now = Date.now()
  const count = await db.courses.count()
  const course: Course = {
    id: newId(),
    name: draft.name.trim(),
    lecturer: draft.lecturer?.trim() || undefined,
    color: draft.color,
    icon: draft.icon,
    schedule: draft.schedule,
    archived: false,
    order: count,
    createdAt: now,
    updatedAt: now,
  }
  await db.courses.add(course)
  return course.id
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<void> {
  await db.courses.update(id, { ...patch, updatedAt: Date.now() })
}

export interface DeletedCourse {
  course: Course
  /** tugas yang tadinya menempel di mata kuliah ini */
  taskIds: string[]
}

/**
 * Menghapus mata kuliah tanpa ikut menghapus tugasnya — tugas berubah
 * menjadi "tugas umum". Kembalikan snapshot supaya bisa diurungkan.
 */
export async function deleteCourse(id: string): Promise<DeletedCourse | null> {
  const course = await db.courses.get(id)
  if (!course) return null
  const affected = await db.tasks.where('courseId').equals(id).primaryKeys()
  await db.transaction('rw', db.courses, db.tasks, async () => {
    await db.tasks.where('courseId').equals(id).modify({ courseId: null })
    await db.courses.delete(id)
  })
  await queueTombstone('courses', id)
  return { course, taskIds: affected }
}

export async function restoreCourse(snap: DeletedCourse): Promise<void> {
  await db.transaction('rw', db.courses, db.tasks, async () => {
    await db.courses.put(snap.course)
    if (snap.taskIds.length) {
      await db.tasks.where('id').anyOf(snap.taskIds).modify({ courseId: snap.course.id })
    }
  })
  await clearTombstone('courses', snap.course.id)
}

export function newSlot(): ClassSlot {
  return { id: newId(), day: 1, start: '08:00', end: '09:40' }
}

// ---------------------------------------------------------------------- tugas

export type TaskDraft = Pick<Task, 'title' | 'courseId' | 'dueAt' | 'hasTime' | 'priority'> &
  Partial<Pick<Task, 'note' | 'status' | 'progress'>>

export async function createTask(draft: TaskDraft): Promise<string> {
  const now = Date.now()
  const status = draft.status ?? 'belum'
  const task: Task = {
    id: newId(),
    title: draft.title.trim(),
    courseId: draft.courseId,
    note: draft.note?.trim() || undefined,
    dueAt: draft.dueAt,
    hasTime: draft.hasTime,
    priority: draft.priority,
    status,
    progress: status === 'selesai' ? 100 : (draft.progress ?? 0),
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'selesai' ? now : null,
  }
  await db.tasks.add(task)
  return task.id
}

/**
 * Menjaga status dan progress tetap konsisten:
 * selesai selalu 100%, dan progress 100% menandai selesai.
 */
export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const now = Date.now()
  const next: Partial<Task> = { ...patch, updatedAt: now }

  if (patch.status === 'selesai') {
    next.progress = 100
    next.completedAt = now
  } else if (patch.status) {
    next.completedAt = null
    if (patch.progress === undefined) {
      const current = await db.tasks.get(id)
      if (current?.progress === 100) next.progress = patch.status === 'belum' ? 0 : 50
    }
  } else if (patch.progress !== undefined) {
    if (patch.progress >= 100) {
      next.status = 'selesai'
      next.completedAt = now
    } else if (patch.progress > 0) {
      next.status = 'jalan'
      next.completedAt = null
    }
  }

  await db.tasks.update(id, next)
}

export async function toggleTaskDone(task: Task): Promise<void> {
  await updateTask(task.id, { status: task.status === 'selesai' ? 'belum' : 'selesai' })
}

export async function deleteTask(id: string): Promise<Task | null> {
  const task = await db.tasks.get(id)
  if (!task) return null
  await db.tasks.delete(id)
  await queueTombstone('tasks', id)
  return task
}

export async function restoreTask(task: Task): Promise<void> {
  await db.tasks.put(task)
  await clearTombstone('tasks', task.id)
}

// -------------------------------------------------------------------- catatan

export interface NoteDraft {
  title?: string
  courseId?: string | null
  taskId?: string | null
  content?: NoteNode
}

export async function createNote(draft: NoteDraft = {}): Promise<string> {
  const now = Date.now()
  const content = draft.content ?? emptyDoc()
  const note: Note = {
    id: newId(),
    title: draft.title?.trim() || '',
    courseId: draft.courseId ?? null,
    taskId: draft.taskId ?? null,
    content,
    plainText: docToPlainText(content),
    pinned: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.notes.add(note)
  return note.id
}

/**
 * plainText selalu diturunkan ulang di sini agar pencarian tidak pernah basi.
 *
 * Memakai modify() dengan callback, bukan update(): tipe UpdateSpec milik Dexie
 * menghitung seluruh key-path bersarang dan tersandung pada NoteNode yang rekursif.
 */
export async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
  const next: Partial<Note> = { ...patch, updatedAt: Date.now() }
  if (patch.content) next.plainText = docToPlainText(patch.content)
  await db.notes
    .where(':id')
    .equals(id)
    .modify((n) => {
      Object.assign(n, next)
    })
}

export async function toggleNotePin(note: Note): Promise<void> {
  await updateNote(note.id, { pinned: !note.pinned })
}

export interface DeletedNote {
  note: Note
  /** lampiran ikut terhapus; disimpan supaya bisa dikembalikan */
  attachments: Attachment[]
}

/**
 * withAttachments=false membiarkan lampiran tetap ada tapi yatim —
 * dipakai kalau pengguna memilih menyimpan filenya.
 */
export async function deleteNote(id: string, withAttachments: boolean): Promise<DeletedNote | null> {
  const note = await db.notes.get(id)
  if (!note) return null
  let attachments: Attachment[] = []
  await db.transaction('rw', db.notes, db.attachments, async () => {
    if (withAttachments) {
      attachments = await db.attachments.where('noteId').equals(id).toArray()
      await db.attachments.where('noteId').equals(id).delete()
    }
    await db.notes.delete(id)
  })
  await queueTombstone('notes', id)
  for (const a of attachments) await queueTombstone('attachments', a.id)
  return { note, attachments }
}

export async function restoreNote(snap: DeletedNote): Promise<void> {
  await db.transaction('rw', db.notes, db.attachments, async () => {
    await db.notes.put(snap.note)
    if (snap.attachments.length) await db.attachments.bulkPut(snap.attachments)
  })
  await clearTombstone('notes', snap.note.id)
  for (const a of snap.attachments) await clearTombstone('attachments', a.id)
}

// ------------------------------------------------------------------- lampiran

export async function totalAttachmentBytes(): Promise<number> {
  let total = 0
  await db.attachments.each((a) => {
    total += a.size
  })
  return total
}

export async function addAttachment(noteId: string, file: File): Promise<string> {
  const att: Attachment = {
    id: newId(),
    noteId,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    // Blob disimpan apa adanya di IndexedDB: tetap lokal dan tersedia offline
    blob: file.slice(0, file.size, file.type),
    createdAt: Date.now(),
  }
  await db.attachments.add(att)
  return att.id
}

export async function renameAttachment(id: string, name: string): Promise<void> {
  await db.attachments.update(id, { name: name.trim() })
}

export async function deleteAttachment(id: string): Promise<Attachment | null> {
  const att = await db.attachments.get(id)
  if (!att) return null
  await db.attachments.delete(id)
  await queueTombstone('attachments', id)
  return att
}

export async function restoreAttachment(att: Attachment): Promise<void> {
  await db.attachments.put(att)
  await clearTombstone('attachments', att.id)
}

/** Catatan yang sudah dibuat dari sebuah tugas, kalau ada. */
export async function noteForTask(taskId: string): Promise<Note | undefined> {
  return db.notes.where('taskId').equals(taskId).first()
}
