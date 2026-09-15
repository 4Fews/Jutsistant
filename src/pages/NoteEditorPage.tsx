import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleDashed, Download, ListChecks, Pin, PinOff, Trash2 } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Field'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/Confirm'
import { RichTextEditor } from '@/features/notes/RichTextEditor'
import { AttachmentSection } from '@/features/notes/AttachmentSection'
import { useCourses, useNote, useNoteAttachments, useTask } from '@/lib/queries'
import { deleteNote, restoreNote, toggleNotePin, updateNote } from '@/lib/repo'
import { docToMarkdown } from '@/lib/markdown'
import { downloadBlob, formatBytes } from '@/lib/attachments'
import { cn } from '@/lib/cn'
import type { NoteNode } from '@/types'

type SaveStatus = 'tersimpan' | 'menyimpan'

const AUTOSAVE_DELAY = 700

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const note = useNote(id)
  const courses = useCourses()
  const attachments = useNoteAttachments(id)
  const sourceTask = useTask(note?.taskId)

  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<SaveStatus>('tersimpan')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [alsoDeleteFiles, setAlsoDeleteFiles] = useState(true)

  // Editor sengaja tidak dikendalikan setelah dibuat, jadi isi awal
  // hanya diambil sekali per catatan agar kursor tidak melompat saat autosave.
  const loadedFor = useRef<string | null>(null)
  const initialContent = useRef<NoteNode | null>(null)
  const latest = useRef<{ title: string; content: NoteNode | null }>({ title: '', content: null })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (note && loadedFor.current !== note.id) {
      loadedFor.current = note.id
      initialContent.current = note.content
      latest.current = { title: note.title, content: null }
      setTitle(note.title)
      setStatus('tersimpan')
    }
  }, [note])

  const noteId = note?.id

  // simpan sisa perubahan saat halaman ditinggalkan
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (!noteId) return
      const patch: Partial<{ title: string; content: NoteNode }> = { title: latest.current.title }
      if (latest.current.content) patch.content = latest.current.content
      void updateNote(noteId, patch)
    }
  }, [noteId])

  function scheduleSave() {
    if (!noteId) return
    setStatus('menyimpan')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const patch: Partial<{ title: string; content: NoteNode }> = { title: latest.current.title }
      if (latest.current.content) patch.content = latest.current.content
      await updateNote(noteId, patch)
      setStatus('tersimpan')
    }, AUTOSAVE_DELAY)
  }

  if (note === undefined) {
    return <div className="mt-6 h-60 animate-pulse rounded-card bg-surface-2" aria-hidden="true" />
  }

  if (note === null) {
    return (
      <div className="pt-10">
        <EmptyState
          emoji="🤔"
          title="Catatan tidak ditemukan"
          message="Mungkin sudah dihapus."
          action={<Button onClick={() => navigate('/catatan')}>Kembali ke daftar</Button>}
        />
      </div>
    )
  }

  const files = attachments ?? []
  const totalSize = files.reduce((n, a) => n + a.size, 0)

  async function remove() {
    if (!note) return
    if (files.length === 0) {
      const ok = await confirmDialog({
        title: 'Hapus catatan ini?',
        message: note.title.trim() || 'Catatan tanpa judul',
        confirmText: 'Hapus',
        danger: true,
      })
      if (!ok) return
      await doDelete(true)
      return
    }
    setAlsoDeleteFiles(true)
    setDeleteOpen(true)
  }

  async function doDelete(withFiles: boolean) {
    if (!note) return
    if (timer.current) clearTimeout(timer.current)
    loadedFor.current = null // cegah penyimpanan ulang saat unmount
    const snap = await deleteNote(note.id, withFiles)
    setDeleteOpen(false)
    navigate('/catatan')
    if (snap) {
      toast('Catatan dihapus', {
        action: { label: 'Urungkan', onClick: () => void restoreNote(snap) },
      })
    }
  }

  function downloadMarkdown() {
    if (!note) return
    const body = docToMarkdown(latest.current.content ?? note.content)
    const heading = note.title.trim() ? `# ${note.title.trim()}\n\n` : ''
    const safe = (note.title.trim() || 'catatan').replace(/[\\/:*?"<>|]/g, '-').slice(0, 60)
    downloadBlob(new Blob([heading + body], { type: 'text/markdown' }), `${safe}.md`)
    toast('Catatan diunduh sebagai .md')
  }

  return (
    <>
      <div className="flex items-center justify-between pt-4">
        <Link
          to="/catatan"
          className="press -ml-2 flex h-11 items-center gap-1 rounded-full pl-2 pr-3 text-[14px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Catatan
        </Link>

        <div className="flex items-center gap-1">
          <span
            aria-live="polite"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
              status === 'tersimpan' ? 'text-ink-3' : 'text-primary',
            )}
          >
            {status === 'tersimpan' ? (
              <Check size={13} aria-hidden="true" />
            ) : (
              <CircleDashed size={13} className="animate-spin" aria-hidden="true" />
            )}
            {status === 'tersimpan' ? 'Tersimpan' : 'Menyimpan…'}
          </span>
          <IconButton
            label={note.pinned ? 'Lepas sematan' : 'Sematkan catatan'}
            onClick={async () => {
              await toggleNotePin(note)
              toast(note.pinned ? 'Sematan dilepas' : 'Catatan disematkan')
            }}
            className={note.pinned ? 'text-primary' : undefined}
          >
            {note.pinned ? <PinOff size={18} aria-hidden="true" /> : <Pin size={18} aria-hidden="true" />}
          </IconButton>
        </div>
      </div>

      {/* Judul catatan berupa input yang bisa diedit, jadi struktur heading
          halaman disediakan terpisah untuk pembaca layar. */}
      <h1 className="sr-only">{title.trim() || 'Catatan tanpa judul'}</h1>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          latest.current.title = e.target.value
          scheduleSave()
        }}
        placeholder="Judul catatan"
        aria-label="Judul catatan"
        className="mt-2 w-full bg-transparent text-2xl font-extrabold tracking-tight outline-none placeholder:text-ink-3"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Mata kuliah catatan"
          value={note.courseId ?? ''}
          onChange={async (e) => {
            await updateNote(note.id, { courseId: e.target.value || null })
          }}
          className="h-10 w-auto min-w-[11rem] rounded-full bg-surface text-[13px] font-semibold"
        >
          <option value="">Catatan umum</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>

        {sourceTask && (
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-2">
            <ListChecks size={13} aria-hidden="true" />
            Dari tugas: {sourceTask.title}
          </span>
        )}
      </div>

      <div className="mt-3">
        {initialContent.current && (
          <RichTextEditor
            key={note.id}
            initialContent={initialContent.current}
            onChange={(doc) => {
              latest.current.content = doc
              scheduleSave()
            }}
          />
        )}
      </div>

      <AttachmentSection noteId={note.id} />

      <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-5">
        <Button size="sm" onClick={downloadMarkdown}>
          <Download size={16} aria-hidden="true" />
          Unduh .md
        </Button>
        <button
          type="button"
          onClick={remove}
          className="press flex h-10 items-center gap-2 rounded-[12px] px-3 text-[13px] font-semibold text-late hover:bg-late-soft"
        >
          <Trash2 size={16} aria-hidden="true" />
          Hapus catatan
        </button>
      </div>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hapus catatan ini?"
        description={note.title.trim() || 'Catatan tanpa judul'}
        footer={
          <div className="flex gap-2.5">
            <Button block onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button block variant="danger" onClick={() => doDelete(alsoDeleteFiles)}>
              Hapus
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          <p className="text-[14px] text-ink-2">
            Catatan ini punya {files.length} file lampiran ({formatBytes(totalSize)}).
          </p>

          <label className="flex items-start gap-3 rounded-btn border border-line bg-canvas p-3">
            <input
              type="checkbox"
              checked={alsoDeleteFiles}
              onChange={(e) => setAlsoDeleteFiles(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-late"
            />
            <span className="min-w-0 text-[14px]">
              <span className="font-semibold">Hapus juga file lampirannya</span>
              <span className="mt-0.5 block text-[13px] text-ink-2">
                {alsoDeleteFiles
                  ? 'File ikut terhapus. Tombol Urungkan tetap bisa mengembalikan keduanya.'
                  : 'File tetap tersimpan dan memakai ruang, tapi tidak lagi terkait catatan mana pun. Bisa diurus lewat Pengaturan.'}
              </span>
            </span>
          </label>

          <Button
            size="sm"
            block
            onClick={() => {
              files.forEach((a) => downloadBlob(a.blob, a.name))
              toast(`Mengunduh ${files.length} file`)
            }}
          >
            <Download size={16} aria-hidden="true" />
            Unduh semua file dulu
          </Button>
        </div>
      </Sheet>
    </>
  )
}
