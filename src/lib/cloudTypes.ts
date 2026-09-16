import type { Attachment, Course, Note, Task } from '@/types'

/**
 * Bentuk baris di Postgres (snake_case, cocok dengan kolom SQL migration).
 * Terpisah dari tipe lokal (camelCase) supaya perubahan skema cloud tidak
 * langsung merembet ke seluruh UI yang memakai tipe lokal.
 */

interface CloudBase {
  user_id: string
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CloudCourse extends CloudBase {
  name: string
  lecturer: string | null
  color: string
  icon: string
  schedule: Course['schedule']
  archived: boolean
  sort_order: number
}

export interface CloudTask extends CloudBase {
  course_id: string | null
  title: string
  note: string | null
  due_at: string | null
  has_time: boolean
  priority: string
  status: string
  progress: number
  completed_at: string | null
}

export interface CloudNote extends CloudBase {
  course_id: string | null
  task_id: string | null
  title: string
  content: Note['content']
  plain_text: string
  pinned: boolean
}

export interface CloudAttachment extends CloudBase {
  note_id: string
  name: string
  mime: string
  size: number
  storage_path: string
}

const toIso = (ms: number | null): string | null => (ms == null ? null : new Date(ms).toISOString())
const toMs = (iso: string | null): number | null => (iso == null ? null : new Date(iso).getTime())
const toMsReq = (iso: string): number => new Date(iso).getTime()

// -------------------------------------------------------------- mata kuliah

export function courseToCloud(c: Course, userId: string): CloudCourse {
  return {
    user_id: userId,
    id: c.id,
    name: c.name,
    lecturer: c.lecturer ?? null,
    color: c.color,
    icon: c.icon,
    schedule: c.schedule,
    archived: c.archived,
    sort_order: c.order,
    created_at: toIso(c.createdAt)!,
    updated_at: toIso(c.updatedAt)!,
    deleted_at: null,
  }
}

export function courseFromCloud(c: CloudCourse): Course {
  return {
    id: c.id,
    name: c.name,
    lecturer: c.lecturer ?? undefined,
    color: c.color as Course['color'],
    icon: c.icon,
    schedule: c.schedule,
    archived: c.archived,
    order: c.sort_order,
    createdAt: toMsReq(c.created_at),
    updatedAt: toMsReq(c.updated_at),
  }
}

// ---------------------------------------------------------------------- tugas

export function taskToCloud(t: Task, userId: string): CloudTask {
  return {
    user_id: userId,
    id: t.id,
    course_id: t.courseId,
    title: t.title,
    note: t.note ?? null,
    due_at: toIso(t.dueAt),
    has_time: t.hasTime,
    priority: t.priority,
    status: t.status,
    progress: t.progress,
    completed_at: toIso(t.completedAt),
    created_at: toIso(t.createdAt)!,
    updated_at: toIso(t.updatedAt)!,
    deleted_at: null,
  }
}

export function taskFromCloud(t: CloudTask): Task {
  return {
    id: t.id,
    courseId: t.course_id,
    title: t.title,
    note: t.note ?? undefined,
    dueAt: toMs(t.due_at),
    hasTime: t.has_time,
    priority: t.priority as Task['priority'],
    status: t.status as Task['status'],
    progress: t.progress,
    completedAt: toMs(t.completed_at),
    createdAt: toMsReq(t.created_at),
    updatedAt: toMsReq(t.updated_at),
  }
}

// ------------------------------------------------------------------- catatan

export function noteToCloud(n: Note, userId: string): CloudNote {
  return {
    user_id: userId,
    id: n.id,
    course_id: n.courseId,
    task_id: n.taskId,
    title: n.title,
    content: n.content,
    plain_text: n.plainText,
    pinned: n.pinned,
    created_at: toIso(n.createdAt)!,
    updated_at: toIso(n.updatedAt)!,
    deleted_at: null,
  }
}

export function noteFromCloud(n: CloudNote): Note {
  return {
    id: n.id,
    courseId: n.course_id,
    taskId: n.task_id,
    title: n.title,
    content: n.content,
    plainText: n.plain_text,
    pinned: n.pinned,
    createdAt: toMsReq(n.created_at),
    updatedAt: toMsReq(n.updated_at),
  }
}

// ------------------------------------------------------------------- lampiran
// Blob TIDAK ikut lewat baris ini — hanya metadata. Isi file disinkronkan
// terpisah lewat Supabase Storage (lihat syncEngine.ts).

export function attachmentToCloud(a: Attachment, userId: string): CloudAttachment {
  return {
    user_id: userId,
    id: a.id,
    note_id: a.noteId,
    name: a.name,
    mime: a.mime,
    size: a.size,
    storage_path: `${userId}/${a.id}`,
    created_at: toIso(a.createdAt)!,
    updated_at: toIso(a.createdAt)!,
    deleted_at: null,
  }
}

/**
 * Blob diisi placeholder kosong — ditandai "belum diunduh" karena
 * ukurannya tidak cocok dengan metadata `size`. Diunduh sungguhan saat
 * pengguna membuka lampiran itu (lihat useAttachmentBlob).
 */
export function attachmentFromCloud(a: CloudAttachment): Attachment {
  return {
    id: a.id,
    noteId: a.note_id,
    name: a.name,
    mime: a.mime,
    size: a.size,
    blob: new Blob([], { type: a.mime }),
    createdAt: toMsReq(a.created_at),
  }
}

/** true kalau blob lokal cuma placeholder dan perlu diunduh dari Storage dulu. */
export function needsDownload(a: Attachment): boolean {
  return a.blob.size !== a.size && a.size > 0
}
