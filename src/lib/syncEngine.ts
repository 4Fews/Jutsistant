import { useSyncExternalStore } from 'react'
import { db } from './db'
import type { SyncTable } from './db'
import { isCloudConfigured, supabase } from './supabaseClient'
import { getSettings, updateSettings } from './settings'
import { getTheme, setTheme } from './theme'
import { isDemo } from './id'
import {
  attachmentFromCloud,
  attachmentToCloud,
  courseFromCloud,
  courseToCloud,
  needsDownload,
  noteFromCloud,
  noteToCloud,
  taskFromCloud,
  taskToCloud,
} from './cloudTypes'
import type { CloudAttachment, CloudCourse, CloudNote, CloudTask } from './cloudTypes'
import type { Attachment, Course, Note, Task } from '@/types'

/**
 * Mesin sinkronisasi dua arah antara IndexedDB (sumber kebenaran untuk UI,
 * selalu dibaca lewat useLiveQuery seperti sebelumnya — tidak ada komponen
 * yang perlu diubah) dan Supabase (sumber kebenaran lintas perangkat).
 *
 * Strategi per siklus:
 *  1. PULL dulu — tarik baris yang berubah di server sejak sinkronisasi
 *     terakhir. Baris lokal hanya ditimpa kalau versi cloud lebih baru
 *     (dibandingkan lewat kolom updated_at, bukan server_updated_at).
 *  2. Baru PUSH — unggah seluruh data lokal aktif (upsert, bukan hanya
 *     yang "dirty"). Karena pull sudah menyelesaikan konflik lebih dulu,
 *     push di sini aman menimpa tanpa perlu bandingkan waktu lagi.
 *
 * Cursor (`lastSyncAt`) memakai server_updated_at TERBESAR yang benar-benar
 * diterima dari server — bukan jam perangkat sendiri — supaya tidak meleset
 * kalau jam laptop/HP tidak presisi sama dengan jam server.
 */

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
}

let state: SyncState = { status: 'idle', lastSyncAt: getSettings().lastSyncAt }
const listeners = new Set<() => void>()

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
    () => state,
  )
}

let syncing = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
/** true selagi pull sedang menulis hasil tarikan ke IndexedDB — supaya
 *  hook Dexie tidak menganggap itu "perubahan pengguna" dan menjadwalkan
 *  siklus sync tambahan yang sia-sia. */
let applyingRemote = false

export function scheduleSync(delayMs = 2500): void {
  if (!isCloudConfigured || applyingRemote) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void runSync(), delayMs)
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// ---------------------------------------------------------------------- pull
// Setiap fungsi mengembalikan server_updated_at terbesar yang ditemukan
// (epoch ms), atau 0 kalau tidak ada baris baru.

async function pullTable<Cloud extends { id: string; updated_at: string; deleted_at: string | null }, Local>(
  table: 'courses' | 'tasks' | 'notes' | 'attachments',
  userId: string,
  sinceIso: string | null,
  toLocal: (row: Cloud) => Local,
  put: (row: Local) => Promise<unknown>,
  getLocalUpdatedAt: (id: string) => Promise<number | undefined>,
): Promise<number> {
  if (!supabase) return 0
  let query = supabase.from(table).select('*').eq('user_id', userId)
  if (sinceIso) query = query.gt('server_updated_at', sinceIso)
  const { data, error } = await query
  if (error) throw error

  let maxSeen = 0
  applyingRemote = true
  try {
    for (const row of (data ?? []) as Array<Cloud & { server_updated_at: string }>) {
      maxSeen = Math.max(maxSeen, new Date(row.server_updated_at).getTime())

      if (row.deleted_at) {
        await db[table].delete(row.id)
        continue
      }

      const cloudUpdatedMs = new Date(row.updated_at).getTime()
      const localUpdatedAt = await getLocalUpdatedAt(row.id)
      // hanya cloud yang menang kalau strictly lebih baru — lokal yang
      // sama/lebih baru dibiarkan, nanti giliran push yang mengirimkannya
      if (localUpdatedAt === undefined || cloudUpdatedMs > localUpdatedAt) {
        await put(toLocal(row))
      }
    }
  } finally {
    applyingRemote = false
  }
  return maxSeen
}

async function pullCourses(userId: string, sinceIso: string | null): Promise<number> {
  return pullTable<CloudCourse, Course>(
    'courses',
    userId,
    sinceIso,
    courseFromCloud,
    (c) => db.courses.put(c),
    async (id) => (await db.courses.get(id))?.updatedAt,
  )
}

async function pullTasks(userId: string, sinceIso: string | null): Promise<number> {
  return pullTable<CloudTask, Task>(
    'tasks',
    userId,
    sinceIso,
    taskFromCloud,
    (t) => db.tasks.put(t),
    async (id) => (await db.tasks.get(id))?.updatedAt,
  )
}

async function pullNotes(userId: string, sinceIso: string | null): Promise<number> {
  return pullTable<CloudNote, Note>(
    'notes',
    userId,
    sinceIso,
    noteFromCloud,
    (n) => db.notes.put(n),
    async (id) => (await db.notes.get(id))?.updatedAt,
  )
}

/**
 * Beda dari tabel lain: kalau lokal sudah punya file asli (blob lengkap,
 * bukan placeholder), metadata dari cloud diterapkan TANPA menimpa blob-nya —
 * supaya file yang sudah diunduh di perangkat ini tidak diganti jadi placeholder.
 */
async function pullAttachments(userId: string, sinceIso: string | null): Promise<number> {
  if (!supabase) return 0
  let query = supabase.from('attachments').select('*').eq('user_id', userId)
  if (sinceIso) query = query.gt('server_updated_at', sinceIso)
  const { data, error } = await query
  if (error) throw error

  let maxSeen = 0
  applyingRemote = true
  try {
    for (const row of (data ?? []) as Array<CloudAttachment & { server_updated_at: string }>) {
      maxSeen = Math.max(maxSeen, new Date(row.server_updated_at).getTime())
      if (row.deleted_at) {
        await db.attachments.delete(row.id)
        continue
      }
      const local = await db.attachments.get(row.id)
      const next = attachmentFromCloud(row)
      if (local && !needsDownload(local)) {
        next.blob = local.blob // pertahankan file asli yang sudah terunduh
      }
      await db.attachments.put(next)
    }
  } finally {
    applyingRemote = false
  }
  return maxSeen
}

async function pullSettings(userId: string): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase
    .from('user_settings')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  const theme = (data?.data as { theme?: string } | undefined)?.theme
  if (theme === 'terang' || theme === 'gelap' || theme === 'sistem') setTheme(theme)
}

// ---------------------------------------------------------------------- push

async function pushCourses(userId: string): Promise<void> {
  if (!supabase) return
  const rows = (await db.courses.toArray()).filter((c) => !isDemo(c.id))
  if (!rows.length) return
  const { error } = await supabase.from('courses').upsert(
    rows.map((c) => courseToCloud(c, userId)),
    { onConflict: 'user_id,id' },
  )
  if (error) throw error
}

async function pushTasks(userId: string): Promise<void> {
  if (!supabase) return
  const rows = (await db.tasks.toArray()).filter((t) => !isDemo(t.id))
  if (!rows.length) return
  const { error } = await supabase.from('tasks').upsert(
    rows.map((t) => taskToCloud(t, userId)),
    { onConflict: 'user_id,id' },
  )
  if (error) throw error
}

async function pushNotes(userId: string): Promise<void> {
  if (!supabase) return
  const rows = (await db.notes.toArray()).filter((n) => !isDemo(n.id))
  if (!rows.length) return
  const { error } = await supabase.from('notes').upsert(
    rows.map((n) => noteToCloud(n, userId)),
    { onConflict: 'user_id,id' },
  )
  if (error) throw error
}

async function pushAttachments(userId: string): Promise<void> {
  if (!supabase) return
  const rows = (await db.attachments.toArray()).filter((a) => !isDemo(a.id))
  if (!rows.length) return

  const uploadedIds = new Set((await db.uploadedBlobs.toArray()).map((u) => u.attachmentId))
  for (const a of rows) {
    if (uploadedIds.has(a.id) || needsDownload(a)) continue // sudah terunggah, atau ini placeholder milik device lain
    const { error } = await supabase.storage
      .from('attachments')
      .upload(`${userId}/${a.id}`, a.blob, { upsert: true, contentType: a.mime })
    if (error) throw error
    await db.uploadedBlobs.put({ attachmentId: a.id })
  }

  const { error } = await supabase.from('attachments').upsert(
    rows.map((a) => attachmentToCloud(a, userId)),
    { onConflict: 'user_id,id' },
  )
  if (error) throw error
}

async function pushSettings(userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, data: { theme: getTheme() } }, { onConflict: 'user_id' })
  if (error) throw error
}

// ----------------------------------------------------------------- tombstone

/** Dipanggil dari repo.ts saat sebuah baris dihapus lokal. */
export async function queueTombstone(table: SyncTable, recordId: string): Promise<void> {
  if (!isCloudConfigured) return
  await db.syncTombstones.put({ key: `${table}:${recordId}`, table, recordId, createdAt: Date.now() })
  scheduleSync()
}

/** Dipanggil dari repo.ts saat penghapusan diurungkan (tombol Urungkan). */
export async function clearTombstone(table: SyncTable, recordId: string): Promise<void> {
  if (!isCloudConfigured) return
  await db.syncTombstones.delete(`${table}:${recordId}`)
}

async function processTombstones(userId: string): Promise<void> {
  if (!supabase) return
  for (const t of await db.syncTombstones.toArray()) {
    if (t.table === 'attachments') {
      await supabase.storage.from('attachments').remove([`${userId}/${t.recordId}`])
    }
    const { error } = await supabase
      .from(t.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', t.recordId)
    if (error) throw error
    await db.syncTombstones.delete(t.key)
  }
}

// --------------------------------------------------------------------- siklus

export async function runSync(): Promise<void> {
  if (!supabase || syncing) return
  const userId = await currentUserId()
  if (!userId) return

  syncing = true
  setState({ status: 'syncing' })
  try {
    const cursor = getSettings().lastSyncAt
    const sinceIso = cursor ? new Date(cursor).toISOString() : null
    let maxSeen = cursor ?? 0

    maxSeen = Math.max(maxSeen, await pullCourses(userId, sinceIso))
    maxSeen = Math.max(maxSeen, await pullTasks(userId, sinceIso))
    maxSeen = Math.max(maxSeen, await pullNotes(userId, sinceIso))
    maxSeen = Math.max(maxSeen, await pullAttachments(userId, sinceIso))
    await pullSettings(userId)

    await processTombstones(userId)
    await pushCourses(userId)
    await pushTasks(userId)
    await pushNotes(userId)
    await pushAttachments(userId)
    await pushSettings(userId)

    const nextCursor = maxSeen || Date.now()
    updateSettings({ lastSyncAt: nextCursor })
    setState({ status: 'idle', lastSyncAt: nextCursor })
  } catch (err) {
    console.error('[sync] gagal:', err)
    setState({ status: navigator.onLine ? 'error' : 'offline' })
  } finally {
    syncing = false
  }
}

/** Mengunduh isi asli sebuah lampiran dari Storage dan menyimpannya lokal. */
export async function downloadAttachmentBlob(attachment: Attachment): Promise<Blob> {
  if (!supabase) throw new Error('Sinkronisasi belum dikonfigurasi.')
  const userId = await currentUserId()
  if (!userId) throw new Error('Belum masuk.')
  const { data, error } = await supabase.storage.from('attachments').download(`${userId}/${attachment.id}`)
  if (error) throw error
  await db.attachments.update(attachment.id, { blob: data })
  await db.uploadedBlobs.put({ attachmentId: attachment.id })
  return data
}

// --------------------------------------------------------------------- init

let inited = false

/** Dipanggil sekali saat app mulai (lihat main.tsx). Tidak melakukan apa-apa
 *  kalau .env tidak diisi — mode lokal murni tetap berjalan seperti biasa. */
export function initSync(): void {
  if (inited || !supabase) return
  inited = true

  for (const table of [db.courses, db.tasks, db.notes, db.attachments]) {
    table.hook('creating', () => scheduleSync())
    table.hook('updating', () => scheduleSync())
    table.hook('deleting', () => scheduleSync())
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') scheduleSync(300)
  })

  window.addEventListener('online', () => scheduleSync(300))
  window.addEventListener('offline', () => setState({ status: 'offline' }))

  if (!navigator.onLine) setState({ status: 'offline' })
  else scheduleSync(1200)
}
