import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { CourseIcon } from './CourseBadge'
import { courseVars } from '@/lib/colors'
import { HARI_PENDEK } from '@/lib/date'
import type { Course } from '@/types'

interface Props {
  course: Course
  /** jumlah tugas yang belum selesai */
  openTasks: number
}

export function CourseCard({ course, openTasks }: Props) {
  const jadwal = course.schedule
    .slice()
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((s) => `${HARI_PENDEK[s.day]} ${s.start}`)
    .join(' · ')

  return (
    <Link
      to={`/mata-kuliah/${course.id}`}
      style={courseVars(course.color)}
      className="press flex items-center gap-3 overflow-hidden rounded-card border border-line bg-surface p-3.5 hover:border-line-strong"
    >
      <span className="-my-3.5 -ml-3.5 mr-0.5 h-[72px] w-1.5 shrink-0 rounded-full bg-[var(--course)]" aria-hidden="true" />
      <CourseIcon course={course} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold leading-tight">{course.name}</h3>
        {course.lecturer && <p className="truncate text-[13px] text-ink-2">{course.lecturer}</p>}
        <p className="mt-0.5 truncate text-[12px] text-ink-3 tnum">
          {jadwal || 'Belum ada jadwal'}
          {openTasks > 0 && <span className="text-ink-2"> · {openTasks} tugas aktif</span>}
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-ink-3" aria-hidden="true" />
    </Link>
  )
}
