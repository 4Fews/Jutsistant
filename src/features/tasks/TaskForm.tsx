import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NotebookPen, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/Confirm'
import { fromDateTimeInput, toDateInput, toTimeInput } from '@/lib/date'
import { createNote, createTask, deleteTask, noteForTask, restoreTask, updateTask } from '@/lib/repo'
import type { Course, Priority, Status, Task } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  courses: Course[]
  /** diisi = mode ubah, kosong = mode tambah */
  task?: Task | null
  /** mata kuliah terpilih otomatis saat menambah dari halaman detail */
  defaultCourseId?: string | null
}

export function TaskForm({ open, onClose, courses, task, defaultCourseId = null }: Props) {
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<Priority>('sedang')
  const [status, setStatus] = useState<Status>('belum')
  const [progress, setProgress] = useState(0)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  // isi ulang setiap kali sheet dibuka
  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setCourseId(task ? task.courseId : defaultCourseId)
    setDate(task?.dueAt != null ? toDateInput(task.dueAt) : '')
    setTime(task?.dueAt != null && task.hasTime ? toTimeInput(task.dueAt) : '')
    setPriority(task?.priority ?? 'sedang')
    setStatus(task?.status ?? 'belum')
    setProgress(task?.progress ?? 0)
    setNote(task?.note ?? '')
    setError(undefined)
  }, [open, task, defaultCourseId])

  async function save() {
    if (!title.trim()) {
      setError('Judul tugas belum diisi.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title,
        courseId,
        dueAt: fromDateTimeInput(date, time || null),
        hasTime: Boolean(date && time),
        priority,
        note,
        status,
        progress: status === 'selesai' ? 100 : progress,
      }
      if (task) {
        await updateTask(task.id, payload)
        toast('Tugas diperbarui')
      } else {
        await createTask(payload)
        toast('Tugas ditambahkan')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!task) return
    const ok = await confirmDialog({
      title: 'Hapus tugas ini?',
      message: task.title,
      confirmText: 'Hapus',
      danger: true,
    })
    if (!ok) return
    const deleted = await deleteTask(task.id)
    onClose()
    if (deleted) {
      toast('Tugas dihapus', {
        action: { label: 'Urungkan', onClick: () => void restoreTask(deleted) },
      })
    }
  }

  /** Membuka catatan tugas ini; membuatnya dulu kalau belum ada. */
  async function openNote() {
    if (!task) return
    const existing = await noteForTask(task.id)
    const noteId = existing
      ? existing.id
      : await createNote({ title: task.title, courseId: task.courseId, taskId: task.id })
    onClose()
    navigate(`/catatan/${noteId}`)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Ubah tugas' : 'Tugas baru'}
      footer={
        <div className="flex gap-2.5">
          <Button block onClick={onClose}>
            Batal
          </Button>
          <Button block variant="primary" onClick={save} disabled={saving}>
            {task ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      }
    >
      <div className="pb-2">
        <Field label="Judul tugas" error={error}>
          {(id) => (
            <TextInput
              id={id}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError(undefined)
              }}
              placeholder="mis. Laporan praktikum bab 3"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Mata kuliah">
          {(id) => (
            <Select id={id} value={courseId ?? ''} onChange={(e) => setCourseId(e.target.value || null)}>
              <option value="">Tanpa mata kuliah</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Deadline" hint="Kosongkan jam kalau deadline berlaku seharian.">
          {(id) => (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <TextInput
                id={id}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tnum"
              />
              <TextInput
                type="time"
                aria-label="Jam deadline"
                value={time}
                disabled={!date}
                onChange={(e) => setTime(e.target.value)}
                className="w-[120px] tnum"
              />
            </div>
          )}
        </Field>

        <div className="py-2">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Prioritas</span>
          <Segmented<Priority>
            label="Prioritas"
            value={priority}
            onChange={setPriority}
            activeClass={{ tinggi: 'text-late', rendah: 'text-ink-2' }}
            options={[
              { value: 'rendah', label: 'Rendah' },
              { value: 'sedang', label: 'Sedang' },
              { value: 'tinggi', label: 'Tinggi' },
            ]}
          />
        </div>

        <div className="py-2">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Status</span>
          <Segmented<Status>
            label="Status"
            value={status}
            onChange={(s) => {
              setStatus(s)
              if (s === 'selesai') setProgress(100)
              if (s === 'belum') setProgress(0)
              if (s === 'jalan' && (progress === 0 || progress === 100)) setProgress(50)
            }}
            activeClass={{ selesai: 'text-done' }}
            options={[
              { value: 'belum', label: 'Belum' },
              { value: 'jalan', label: 'Dikerjakan' },
              { value: 'selesai', label: 'Selesai' },
            ]}
          />
        </div>

        {status === 'jalan' && (
          <Field label={`Progress: ${progress}%`}>
            {(id) => (
              <input
                id={id}
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="h-11 w-full accent-primary"
              />
            )}
          </Field>
        )}

        <Field label="Catatan singkat" hint="Boleh dikosongkan">
          {(id) => (
            <TextArea
              id={id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detail, tautan, atau pengingat kecil"
            />
          )}
        </Field>

        {task && (
          <button
            type="button"
            onClick={openNote}
            className="press mt-3 flex w-full items-center justify-center gap-2 rounded-btn border border-line py-3 text-[14px] font-semibold hover:bg-surface-2"
          >
            <NotebookPen size={16} aria-hidden="true" />
            Buat catatan dari tugas ini
          </button>
        )}

        {task && (
          <button
            type="button"
            onClick={remove}
            className="press mt-2 flex w-full items-center justify-center gap-2 rounded-btn py-3 text-[14px] font-semibold text-late hover:bg-late-soft"
          >
            <Trash2 size={16} aria-hidden="true" />
            Hapus tugas
          </button>
        )}
      </div>
    </Sheet>
  )
}
