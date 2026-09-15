import { TaskItem } from './TaskItem'
import { urgencyOf } from '@/lib/urgency'
import type { Urgency } from '@/lib/urgency'
import type { Course, Task } from '@/types'

const GROUPS: Array<{ key: Urgency; label: string }> = [
  { key: 'terlambat', label: 'Terlambat' },
  { key: 'hari-ini', label: 'Hari ini' },
  { key: 'segera', label: '3 hari ke depan' },
  { key: 'normal', label: 'Nanti' },
  { key: 'tanpa-deadline', label: 'Tanpa deadline' },
  { key: 'selesai', label: 'Selesai' },
]

interface Props {
  tasks: Task[]
  coursesById: Map<string, Course>
  onToggle: (t: Task) => void
  onOpen: (t: Task) => void
}

/** Mengelompokkan tugas per tingkat urgensi supaya mudah dipindai. */
export function TaskList({ tasks, coursesById, onToggle, onOpen }: Props) {
  const now = Date.now()
  const buckets = new Map<Urgency, Task[]>()
  for (const t of tasks) {
    const u = urgencyOf(t, now)
    const arr = buckets.get(u)
    if (arr) arr.push(t)
    else buckets.set(u, [t])
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(({ key, label }) => {
        const group = buckets.get(key)
        if (!group?.length) return null
        return (
          <section key={key}>
            <h2 className="mb-2 flex items-baseline gap-2 px-0.5 text-[12px] font-extrabold uppercase tracking-wider text-ink-3">
              {label}
              <span className="tnum font-bold normal-case tracking-normal">{group.length}</span>
            </h2>
            <ul className="space-y-2">
              {group.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  course={t.courseId ? coursesById.get(t.courseId) : undefined}
                  onToggle={() => onToggle(t)}
                  onOpen={() => onOpen(t)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
