import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Attachment, Course, Note, Task } from '@/types'

/** undefined = masih memuat dari IndexedDB. */
export function useCourses(includeArchived = false): Course[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.courses.orderBy('order').toArray()
    return includeArchived ? all : all.filter((c) => !c.archived)
  }, [includeArchived])
}

export function useCourse(id: string | undefined): Course | undefined | null {
  return useLiveQuery(async () => (id ? ((await db.courses.get(id)) ?? null) : null), [id])
}

export function useTasks(): Task[] | undefined {
  return useLiveQuery(() => db.tasks.toArray(), [])
}

export function useCourseTasks(courseId: string | undefined): Task[] | undefined {
  return useLiveQuery(
    async () => (courseId ? db.tasks.where('courseId').equals(courseId).toArray() : []),
    [courseId],
  )
}

export function useNotes(): Note[] | undefined {
  return useLiveQuery(() => db.notes.toArray(), [])
}

export function useNote(id: string | undefined): Note | undefined | null {
  return useLiveQuery(async () => (id ? ((await db.notes.get(id)) ?? null) : null), [id])
}

export function useCourseNotes(courseId: string | undefined): Note[] | undefined {
  return useLiveQuery(
    async () => (courseId ? db.notes.where('courseId').equals(courseId).toArray() : []),
    [courseId],
  )
}

export function useNoteAttachments(noteId: string | undefined): Attachment[] | undefined {
  return useLiveQuery(
    async () =>
      noteId
        ? (await db.attachments.where('noteId').equals(noteId).toArray()).sort(
            (a, b) => a.createdAt - b.createdAt,
          )
        : [],
    [noteId],
  )
}

/** Total byte lampiran, dipantau langsung agar meter penyimpanan ikut bergerak. */
export function useAttachmentUsage(): number | undefined {
  return useLiveQuery(async () => {
    let total = 0
    await db.attachments.each((a) => {
      total += a.size
    })
    return total
  }, [])
}

/** Jumlah lampiran per catatan, untuk ditampilkan di kartu daftar. */
export function useAttachmentCounts(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const m = new Map<string, number>()
    await db.attachments.each((a) => {
      m.set(a.noteId, (m.get(a.noteId) ?? 0) + 1)
    })
    return m
  }, [])
}

export function useTask(id: string | null | undefined): Task | undefined | null {
  return useLiveQuery(async () => (id ? ((await db.tasks.get(id)) ?? null) : null), [id])
}

/** Lampiran yang catatannya sudah tidak ada — supaya tidak diam-diam memakan ruang. */
export function useOrphanAttachments(): Attachment[] | undefined {
  return useLiveQuery(async () => {
    const [atts, noteIds] = await Promise.all([
      db.attachments.toArray(),
      db.notes.toCollection().primaryKeys(),
    ])
    const alive = new Set(noteIds)
    return atts.filter((a) => !alive.has(a.noteId))
  }, [])
}
