import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/Confirm'
import { CourseIcon } from '@/features/courses/CourseBadge'
import { CourseForm } from '@/features/courses/CourseForm'
import { TaskForm } from '@/features/tasks/TaskForm'
import { TaskItem } from '@/features/tasks/TaskItem'
import { NoteCard } from '@/features/notes/NoteCard'
import { courseVars } from '@/lib/colors'
import { HARI_PANJANG } from '@/lib/date'
import {
  useAttachmentCounts,
  useCourse,
  useCourseNotes,
  useCourses,
  useCourseTasks,
} from '@/lib/queries'
import { createNote, deleteCourse, restoreCourse, toggleTaskDone, updateTask } from '@/lib/repo'
import { compareTasks } from '@/lib/urgency'
import type { Task } from '@/types'

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const course = useCourse(id)
  const allCourses = useCourses()
  const tasks = useCourseTasks(id)
  const courseNotes = useCourseNotes(id)
  const attachmentCounts = useAttachmentCounts()

  const [editOpen, setEditOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sorted = useMemo(() => (tasks ?? []).slice().sort((a, b) => compareTasks(a, b)), [tasks])
  const notes = useMemo(
    () =>
      (courseNotes ?? [])
        .slice()
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt),
    [courseNotes],
  )
  const slots = useMemo(
    () => (course?.schedule ?? []).slice().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
    [course],
  )

  if (course === undefined) {
    return <div className="h-40 animate-pulse rounded-card bg-surface-2" aria-hidden="true" />
  }

  if (course === null) {
    return (
      <div className="pt-10">
        <EmptyState
          emoji="🤔"
          title="Mata kuliah tidak ditemukan"
          message="Mungkin sudah dihapus."
          action={
            <Button onClick={() => navigate('/mata-kuliah')}>Kembali ke daftar</Button>
          }
        />
      </div>
    )
  }

  async function remove() {
    if (!course) return
    const ok = await confirmDialog({
      title: `Hapus ${course.name}?`,
      message: 'Tugas yang terkait tidak ikut terhapus, tapi akan menjadi tugas umum tanpa mata kuliah.',
      confirmText: 'Hapus',
      danger: true,
    })
    if (!ok) return
    const snap = await deleteCourse(course.id)
    navigate('/mata-kuliah')
    if (snap) {
      toast('Mata kuliah dihapus', {
        action: { label: 'Urungkan', onClick: () => void restoreCourse(snap) },
      })
    }
  }

  async function toggle(t: Task) {
    const wasDone = t.status === 'selesai'
    await toggleTaskDone(t)
    if (!wasDone) {
      toast('Selesai. Satu beban berkurang.', {
        action: {
          label: 'Urungkan',
          onClick: () => void updateTask(t.id, { status: t.status, progress: t.progress }),
        },
      })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between pt-4">
        <Link
          to="/mata-kuliah"
          className="press -ml-2 flex h-11 items-center gap-1 rounded-full pl-2 pr-3 text-[14px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Mata Kuliah
        </Link>
        <div className="flex items-center gap-1">
          <IconButton label="Ubah mata kuliah" onClick={() => setEditOpen(true)}>
            <Pencil size={18} aria-hidden="true" />
          </IconButton>
          <IconButton label="Hapus mata kuliah" onClick={remove} className="hover:bg-late-soft hover:text-late">
            <Trash2 size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <header
        style={courseVars(course.color)}
        className="mt-3 flex items-center gap-4 rounded-card border border-line bg-[var(--course-soft)] p-5"
      >
        <CourseIcon course={course} size="lg" />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight">{course.name}</h1>
          {course.lecturer && <p className="mt-0.5 text-[14px] text-ink-2">{course.lecturer}</p>}
        </div>
      </header>

      <section className="mt-6">
        <h2 className="mb-2 px-0.5 text-[12px] font-extrabold uppercase tracking-wider text-ink-3">
          Jadwal kelas
        </h2>
        {slots.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-5 text-center text-[13px] text-ink-3">
            Belum ada jadwal. Tambahkan lewat tombol ubah di atas.
          </p>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3"
              >
                <span className="w-16 shrink-0 text-[13px] font-bold">{HARI_PANJANG[s.day]}</span>
                <span className="tnum text-[14px] font-semibold text-ink-2">
                  {s.start} – {s.end}
                </span>
                {s.room && <span className="ml-auto truncate text-[13px] text-ink-3">{s.room}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-ink-3">
            Tugas{sorted.length > 0 && <span className="ml-2 tnum normal-case tracking-normal">{sorted.length}</span>}
          </h2>
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null)
              setTaskOpen(true)
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Tambah
          </Button>
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-5 text-center text-[13px] text-ink-3">
            Belum ada tugas untuk mata kuliah ini.
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={() => toggle(t)}
                onOpen={() => {
                  setEditingTask(t)
                  setTaskOpen(true)
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-ink-3">
            Catatan
            {notes.length > 0 && <span className="ml-2 tnum normal-case tracking-normal">{notes.length}</span>}
          </h2>
          <Button
            size="sm"
            onClick={async () => {
              const noteId = await createNote({ courseId: course.id })
              navigate(`/catatan/${noteId}`)
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Tulis
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-5 text-center text-[13px] text-ink-3">
            Belum ada catatan untuk mata kuliah ini.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {notes.map((n) => (
              <li key={n.id}>
                <NoteCard note={n} attachmentCount={attachmentCounts?.get(n.id) ?? 0} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <CourseForm open={editOpen} onClose={() => setEditOpen(false)} course={course} />
      <TaskForm
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        courses={allCourses ?? []}
        task={editingTask}
        defaultCourseId={course.id}
      />
    </>
  )
}
