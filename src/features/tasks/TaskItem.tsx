import { Check, ChevronsDown, ChevronsUp } from 'lucide-react'
import { CourseChip } from '@/features/courses/CourseBadge'
import { cn } from '@/lib/cn'
import { fmtDue } from '@/lib/date'
import { URGENCY_STYLE, urgencyOf } from '@/lib/urgency'
import type { Course, Task } from '@/types'

interface Props {
  task: Task
  course?: Course
  onToggle: () => void
  onOpen: () => void
}

function PriorityMark({ priority }: { priority: Task['priority'] }) {
  // "sedang" adalah bawaan, sengaja tidak ditandai agar daftar tidak ramai
  if (priority === 'tinggi') {
    return <ChevronsUp size={17} className="shrink-0 text-late" aria-label="Prioritas tinggi" />
  }
  if (priority === 'rendah') {
    return <ChevronsDown size={17} className="shrink-0 text-ink-3" aria-label="Prioritas rendah" />
  }
  return null
}

export function TaskItem({ task, course, onToggle, onOpen }: Props) {
  const urgency = urgencyOf(task)
  const style = URGENCY_STYLE[urgency]
  const done = task.status === 'selesai'

  return (
    <li className="relative flex items-stretch gap-1 overflow-hidden rounded-card border border-line bg-surface">
      <span className={cn('w-1.5 shrink-0', style.bar)} aria-hidden="true" />

      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Tandai "${task.title}" belum selesai` : `Tandai "${task.title}" selesai`}
        onClick={onToggle}
        className="press flex w-11 shrink-0 items-center justify-center self-start py-3.5"
      >
        <span
          className={cn(
            'flex h-[22px] w-[22px] items-center justify-center rounded-lg border-2 transition-colors',
            done ? 'border-done bg-done text-white' : 'border-line-strong',
          )}
        >
          {done && <Check size={14} strokeWidth={3.5} aria-hidden="true" />}
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="press min-w-0 flex-1 py-3 pr-2 text-left"
        aria-label={`Ubah ${task.title}`}
      >
        <p className={cn('font-semibold leading-snug', done && 'text-ink-3 line-through')}>{task.title}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {course && <CourseChip course={course} />}
          {task.dueAt != null && (
            <span className={cn('text-[12px] font-semibold tnum', style.text)}>
              {done ? 'Selesai' : fmtDue(task.dueAt, task.hasTime)}
            </span>
          )}
          {task.dueAt == null && !done && <span className="text-[12px] text-ink-3">Tanpa deadline</span>}
        </div>

        {!done && task.progress > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-ink-3 tnum">{task.progress}%</span>
          </div>
        )}
      </button>

      <span className="flex shrink-0 items-center pr-3">
        <PriorityMark priority={task.priority} />
      </span>
    </li>
  )
}
