import { format } from 'date-fns'
import { db } from './db'
import { updateSettings } from './settings'
import { COLOR_KEYS } from './colors'
import { docToMarkdown, docToPlainText, textToDoc } from './markdown'
import { downloadBlob } from './attachments'
import { fmtDate } from './date'
import { isDemo } from './id'
import { isCloudConfigured } from './supabaseClient'
import { queueTombstone } from './syncEngine'
import type { ClassSlot, Course, Note, NoteNode, Task } from '@/types'

/** v1 = mata kuliah + tugas. v2 menambahkan catatan. */
export const SCHEMA_VERSION = 2
const APP_ID = 'semesta'

export interface BackupFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  counts: { courses: number; tasks: number; notes: number }
  data: { courses: Course[]; tasks: Task[]; notes: Note[] }
}

// ------------------------------------------------------------------- export

export async function buildBackup(): Promise<BackupFile> {
  const [courses, tasks, notes] = await Promise.all([
    db.courses.toArray(),
    db.tasks.toArray(),
    db.notes.toArray(),
  ])
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { courses: courses.length, tasks: tasks.length, notes: notes.length },
    // Isi lampiran (Blob) sengaja TIDAK ikut: satu PDF saja bisa membuat
    // file JSON ini membengkak jadi puluhan megabyte.
    data: { courses, tasks, notes },
  }
}

export async function exportBackup(): Promise<void> {
  const backup = await buildBackup()
  downloadBlob(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `semesta-backup-${format(new Date(), 'yyyy-MM-dd')}.json`,
  )
  updateSettings({ lastBackupAt: Date.now() })
}

/** Semua catatan dalam satu berkas Markdown, dipisah garis horizontal. */
export async function exportNotesAsMarkdown(): Promise<number> {
  const [notes, courses] = await Promise.all([db.notes.toArray(), db.courses.toArray()])
  if (!notes.length) return 0
  const byId = new Map(courses.map((c) => [c.id, c]))

  const body = notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((n) => {
      const judul = n.title.trim() || 'Tanpa judul'
      const matkul = n.courseId ? (byId.get(n.courseId)?.name ?? 'Catatan umum') : 'Catatan umum'
      return `# ${judul}\n\n_${matkul} · diubah ${fmtDate(n.updatedAt)}_\n\n${docToMarkdown(n.content)}`
    })
    .join('\n\n---\n\n')

  downloadBlob(
    new Blob([body], { type: 'text/markdown' }),
    `semesta-catatan-${format(new Date(), 'yyyy-MM-dd')}.md`,
  )
  return notes.length
}

/** Versi teks polos, tanpa tanda format apa pun. */
export async function exportNotesAsText(): Promise<number> {
  const notes = await db.notes.toArray()
  if (!notes.length) return 0

  const body = notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((n) => `${n.title.trim() || 'Tanpa judul'}\n${'='.repeat(40)}\n\n${n.plainText}`)
    .join('\n\n\n')

  downloadBlob(
    new Blob([body], { type: 'text/plain' }),
    `semesta-catatan-${format(new Date(), 'yyyy-MM-dd')}.txt`,
  )
  return notes.length
}

// --------------------------------------------------------- validasi & import

type Rec = Record<string, unknown>

const isObj = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

function parseSlot(v: unknown): ClassSlot | null {
  if (!isObj(v)) return null
  if (!isStr(v.id) || !isNum(v.day) || v.day < 0 || v.day > 6) return null
  if (!isStr(v.start) || !HHMM.test(v.start) || !isStr(v.end) || !HHMM.test(v.end)) return null
  return {
    id: v.id,
    day: Math.trunc(v.day) as ClassSlot['day'],
    start: v.start,
    end: v.end,
    room: isStr(v.room) ? v.room : undefined,
  }
}

function parseCourse(v: unknown): Course | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || !v.name.trim()) return null
  const now = Date.now()
  const schedule = Array.isArray(v.schedule)
    ? v.schedule.map(parseSlot).filter((s): s is ClassSlot => s !== null)
    : []
  return {
    id: v.id,
    name: v.name,
    lecturer: isStr(v.lecturer) ? v.lecturer : undefined,
    // warna/ikon tak dikenal diganti nilai aman, bukan menggagalkan seluruh import
    color: COLOR_KEYS.includes(v.color as Course['color']) ? (v.color as Course['color']) : 'coral',
    icon: isStr(v.icon) && v.icon ? v.icon : '📚',
    schedule,
    archived: isBool(v.archived) ? v.archived : false,
    order: isNum(v.order) ? v.order : 0,
    createdAt: isNum(v.createdAt) ? v.createdAt : now,
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : now,
  }
}

const PRIORITIES = ['rendah', 'sedang', 'tinggi']
const STATUSES = ['belum', 'jalan', 'selesai']

function parseTask(v: unknown): Task | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.title) || !v.title.trim()) return null
  const now = Date.now()
  const status = STATUSES.includes(v.status as string) ? (v.status as Task['status']) : 'belum'
  const rawProgress = isNum(v.progress) ? v.progress : 0
  return {
    id: v.id,
    title: v.title,
    courseId: isStr(v.courseId) ? v.courseId : null,
    note: isStr(v.note) ? v.note : undefined,
    dueAt: isNum(v.dueAt) ? v.dueAt : null,
    hasTime: isBool(v.hasTime) ? v.hasTime : false,
    priority: PRIORITIES.includes(v.priority as string) ? (v.priority as Task['priority']) : 'sedang',
    status,
    progress: status === 'selesai' ? 100 : Math.min(100, Math.max(0, Math.round(rawProgress))),
    createdAt: isNum(v.createdAt) ? v.createdAt : now,
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : now,
    completedAt: isNum(v.completedAt) ? v.completedAt : null,
  }
}

function parseNote(v: unknown): Note | null {
  if (!isObj(v) || !isStr(v.id)) return null
  const now = Date.now()
  const plain = isStr(v.plainText) ? v.plainText : ''

  // Dokumen rusak tidak membuang isi catatan: teksnya dipulihkan
  // menjadi paragraf biasa lewat plainText.
  const content: NoteNode =
    isObj(v.content) && isStr(v.content.type) ? (v.content as NoteNode) : textToDoc(plain)

  return {
    id: v.id,
    title: isStr(v.title) ? v.title : '',
    courseId: isStr(v.courseId) ? v.courseId : null,
    taskId: isStr(v.taskId) ? v.taskId : null,
    content,
    plainText: plain || docToPlainText(content),
    pinned: isBool(v.pinned) ? v.pinned : false,
    createdAt: isNum(v.createdAt) ? v.createdAt : now,
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : now,
  }
}

export interface ParsedBackup {
  courses: Course[]
  tasks: Task[]
  notes: Note[]
  /** baris yang dilewati karena tidak valid */
  skipped: string[]
  exportedAt: string | null
}

export type ParseResult = { ok: true; value: ParsedBackup } | { ok: false; error: string }

/** Memeriksa isi file tanpa menyentuh database sama sekali. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'File ini bukan JSON yang valid.' }
  }
  if (!isObj(raw)) return { ok: false, error: 'Isi file tidak dikenali.' }
  if (raw.app !== APP_ID) {
    return { ok: false, error: 'File ini bukan backup Semesta.' }
  }
  if (isNum(raw.schemaVersion) && raw.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'Backup ini dibuat oleh versi Semesta yang lebih baru. Perbarui aplikasinya dulu.',
    }
  }
  if (!isObj(raw.data)) return { ok: false, error: 'Bagian data tidak ditemukan di file ini.' }

  const skipped: string[] = []
  const courses: Course[] = []
  const tasks: Task[] = []
  const notes: Note[] = []

  // backup v1 tidak punya array notes — itu normal, bukan kesalahan
  const rawCourses = Array.isArray(raw.data.courses) ? raw.data.courses : []
  rawCourses.forEach((c, i) => {
    const parsed = parseCourse(c)
    if (parsed) courses.push(parsed)
    else skipped.push(`Mata kuliah baris ${i + 1}`)
  })

  const rawTasks = Array.isArray(raw.data.tasks) ? raw.data.tasks : []
  rawTasks.forEach((t, i) => {
    const parsed = parseTask(t)
    if (parsed) tasks.push(parsed)
    else skipped.push(`Tugas baris ${i + 1}`)
  })

  const rawNotes = Array.isArray(raw.data.notes) ? raw.data.notes : []
  rawNotes.forEach((n, i) => {
    const parsed = parseNote(n)
    if (parsed) notes.push(parsed)
    else skipped.push(`Catatan baris ${i + 1}`)
  })

  if (!courses.length && !tasks.length && !notes.length) {
    return { ok: false, error: 'Tidak ada data yang bisa dibaca dari file ini.' }
  }

  return {
    ok: true,
    value: { courses, tasks, notes, skipped, exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : null },
  }
}

export type ImportMode = 'gabung' | 'ganti'

export interface ImportResult {
  ditambah: number
  diperbarui: number
  dilewati: number
}

function mergeInto<T extends { id: string; updatedAt: number }>(
  incoming: T[],
  existing: Map<string, T>,
  result: ImportResult,
): T[] {
  const out: T[] = []
  for (const item of incoming) {
    const cur = existing.get(item.id)
    if (!cur) {
      out.push(item)
      result.ditambah++
    } else if (item.updatedAt > cur.updatedAt) {
      out.push(item)
      result.diperbarui++
    } else {
      result.dilewati++
    }
  }
  return out
}

/**
 * gabung: cocokkan per id, yang updatedAt-nya lebih baru menang. Lampiran
 *         lokal tidak disentuh sama sekali.
 * ganti : kosongkan dulu, lalu tulis ulang. Lampiran ikut dihapus supaya
 *         tidak ada file yatim yang diam-diam memakan ruang.
 */
export async function importBackup(parsed: ParsedBackup, mode: ImportMode): Promise<ImportResult> {
  const result: ImportResult = { ditambah: 0, diperbarui: 0, dilewati: 0 }

  await db.transaction('rw', db.courses, db.tasks, db.notes, db.attachments, async () => {
    if (mode === 'ganti') {
      await Promise.all([db.courses.clear(), db.tasks.clear(), db.notes.clear(), db.attachments.clear()])
      await db.courses.bulkPut(parsed.courses)
      await db.tasks.bulkPut(parsed.tasks)
      await db.notes.bulkPut(parsed.notes)
      result.ditambah = parsed.courses.length + parsed.tasks.length + parsed.notes.length
      return
    }

    const courses = mergeInto(
      parsed.courses,
      new Map((await db.courses.toArray()).map((c) => [c.id, c])),
      result,
    )
    const tasks = mergeInto(parsed.tasks, new Map((await db.tasks.toArray()).map((t) => [t.id, t])), result)
    const notes = mergeInto(parsed.notes, new Map((await db.notes.toArray()).map((n) => [n.id, n])), result)

    if (courses.length) await db.courses.bulkPut(courses)
    if (tasks.length) await db.tasks.bulkPut(tasks)
    if (notes.length) await db.notes.bulkPut(notes)
  })

  return result
}

/**
 * Kalau sedang masuk, salinan di cloud ikut ditandai terhapus (lewat
 * tombstone yang sama seperti penghapusan biasa) — supaya tombol ini
 * benar-benar berarti "hapus semua", bukan cuma lokal yang nanti diam-diam
 * terisi lagi oleh sync berikutnya.
 */
export async function wipeAllData(): Promise<void> {
  if (isCloudConfigured) {
    const [courses, tasks, notes, attachments] = await Promise.all([
      db.courses.toArray(),
      db.tasks.toArray(),
      db.notes.toArray(),
      db.attachments.toArray(),
    ])
    for (const c of courses) if (!isDemo(c.id)) await queueTombstone('courses', c.id)
    for (const t of tasks) if (!isDemo(t.id)) await queueTombstone('tasks', t.id)
    for (const n of notes) if (!isDemo(n.id)) await queueTombstone('notes', n.id)
    for (const a of attachments) await queueTombstone('attachments', a.id)
  }
  await db.transaction('rw', db.courses, db.tasks, db.notes, db.attachments, async () => {
    await Promise.all([db.courses.clear(), db.tasks.clear(), db.notes.clear(), db.attachments.clear()])
  })
}
