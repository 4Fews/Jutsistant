import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Fab } from '@/components/ui/Fab'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/Confirm'
import { TaskFilters, DEFAULT_FILTERS, isDefaultFilters } from '@/features/tasks/TaskFilters'
import type { Filters } from '@/features/tasks/TaskFilters'
import { TaskList } from '@/features/tasks/TaskList'
import { TaskForm } from '@/features/tasks/TaskForm'
import { useCourses, useTasks } from '@/lib/queries'
import { toggleTaskDone, updateTask } from '@/lib/repo'
import { compareTasks, urgencyOf } from '@/lib/urgency'
import { clearDemoData } from '@/lib/seed'
import { isDemo } from '@/lib/id'
import type { Task } from '@/types'

export function TasksPage() {
  const tasks = useTasks()
  const courses = useCourses()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const coursesById = useMemo(
    () => new Map((courses ?? []).map((c) => [c.id, c])),
    [courses],
  )

  const visible = useMemo(() => {
    if (!tasks) return []
    return tasks
      .filter((t) => {
        if (filters.status === 'aktif' && t.status === 'selesai') return false
        if (filters.status === 'selesai' && t.status !== 'selesai') return false
        if (filters.courseId !== 'semua' && t.courseId !== filters.courseId) return false
        if (filters.priority !== 'semua' && t.priority !== filters.priority) return false
        return true
      })
      .sort((a, b) => compareTasks(a, b))
  }, [tasks, filters])

  const overdue = useMemo(
    () => (tasks ?? []).filter((t) => urgencyOf(t) === 'terlambat').length,
    [tasks],
  )

  const hasDemo = useMemo(
    () => (tasks ?? []).some((t) => isDemo(t.id)) || (courses ?? []).some((c) => isDemo(c.id)),
    [tasks, courses],
  )

  const loading = tasks === undefined || courses === undefined

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(t: Task) {
    setEditing(t)
    setFormOpen(true)
  }

  async function toggle(t: Task) {
    const wasDone = t.status === 'selesai'
    await toggleTaskDone(t)
    if (!wasDone) {
      toast('Selesai. Satu beban berkurang.', {
        action: {
          label: 'Urungkan',
          // kembalikan persis ke status dan progress sebelumnya
          onClick: () => void updateTask(t.id, { status: t.status, progress: t.progress }),
        },
      })
    }
  }

  async function removeDemo() {
    const ok = await confirmDialog({
      title: 'Hapus data contoh?',
      message: 'Semua mata kuliah dan tugas contoh akan dihapus. Data yang Anda buat sendiri tidak terpengaruh.',
      confirmText: 'Hapus contoh',
      danger: true,
    })
    if (!ok) return
    await clearDemoData()
    toast('Data contoh dihapus')
  }

  const subtitle = loading
    ? undefined
    : overdue > 0
      ? `${overdue} tugas terlambat`
      : visible.length > 0
        ? `${visible.length} tugas ditampilkan`
        : undefined

  return (
    <>
      <PageHeader title="Tugas" subtitle={subtitle} />

      {hasDemo && (
        <div className="anim-fade mb-4 flex items-center gap-3 rounded-card border border-line bg-surface-2 p-3">
          <Sparkles size={18} className="shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[13px] text-ink-2">
            Ini data contoh supaya tampilannya langsung terlihat.
          </p>
          <Button size="sm" onClick={removeDemo}>
            Hapus
          </Button>
        </div>
      )}

      <TaskFilters value={filters} onChange={setFilters} courses={courses ?? []} />

      <div className="mt-5">
        {loading ? (
          <ul className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-[76px] animate-pulse rounded-card bg-surface-2" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          isDefaultFilters(filters) && (tasks?.length ?? 0) === 0 ? (
            <EmptyState
              emoji="🌱"
              title="Belum ada tugas"
              message="Tambahkan satu tugas dan deadline-nya. Semesta akan mengurutkannya untuk Anda."
              action={
                <Button variant="primary" onClick={openNew}>
                  Tambah tugas pertama
                </Button>
              }
            />
          ) : (
            <EmptyState
              emoji="🔍"
              title="Tidak ada yang cocok"
              message="Coba longgarkan filternya."
              action={<Button onClick={() => setFilters(DEFAULT_FILTERS)}>Bersihkan filter</Button>}
            />
          )
        ) : (
          <TaskList tasks={visible} coursesById={coursesById} onToggle={toggle} onOpen={openEdit} />
        )}
      </div>

      <Fab label="Tambah tugas" onClick={openNew} />

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        courses={courses ?? []}
        task={editing}
      />
    </>
  )
}
