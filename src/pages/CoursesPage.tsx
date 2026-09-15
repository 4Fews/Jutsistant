import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Fab } from '@/components/ui/Fab'
import { CourseCard } from '@/features/courses/CourseCard'
import { CourseForm } from '@/features/courses/CourseForm'
import { useCourses, useTasks } from '@/lib/queries'

export function CoursesPage() {
  const courses = useCourses()
  const tasks = useTasks()
  const [formOpen, setFormOpen] = useState(false)

  // jumlah tugas aktif per mata kuliah, untuk ditampilkan di kartu
  const openCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks ?? []) {
      if (t.status === 'selesai' || !t.courseId) continue
      m.set(t.courseId, (m.get(t.courseId) ?? 0) + 1)
    }
    return m
  }, [tasks])

  const loading = courses === undefined

  return (
    <>
      <PageHeader
        title="Mata Kuliah"
        subtitle={courses?.length ? `${courses.length} mata kuliah` : undefined}
      />

      {loading ? (
        <ul className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[92px] animate-pulse rounded-card bg-surface-2" />
          ))}
        </ul>
      ) : courses.length === 0 ? (
        <EmptyState
          emoji="📚"
          title="Belum ada mata kuliah"
          message="Tambahkan mata kuliah beserta jadwalnya, lalu tugas bisa dikaitkan ke sana."
          action={
            <Button variant="primary" onClick={() => setFormOpen(true)}>
              Tambah mata kuliah
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {courses.map((c) => (
            <li key={c.id}>
              <CourseCard course={c} openTasks={openCount.get(c.id) ?? 0} />
            </li>
          ))}
        </ul>
      )}

      <Fab label="Tambah mata kuliah" onClick={() => setFormOpen(true)} />
      <CourseForm open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  )
}
