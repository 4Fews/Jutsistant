import { courseVars } from '@/lib/colors'
import { cn } from '@/lib/cn'
import type { Course } from '@/types'

/** Ikon bulat berwarna mata kuliah. Dipakai di kartu, daftar tugas, dan form. */
export function CourseIcon({ course, size = 'md' }: { course: Course; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 text-2xl' : size === 'sm' ? 'h-7 w-7 text-[13px]' : 'h-10 w-10 text-lg'
  return (
    <span
      style={courseVars(course.color)}
      className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-[var(--course-soft)]', box)}
      aria-hidden="true"
    >
      {course.icon}
    </span>
  )
}

/** Chip kecil "📐 Kalkulus II" untuk menandai asal sebuah tugas. */
export function CourseChip({ course }: { course: Course }) {
  return (
    <span
      style={courseVars(course.color)}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--course-soft)] py-0.5 pl-1.5 pr-2.5 text-[12px] font-semibold text-ink"
    >
      <span aria-hidden="true">{course.icon}</span>
      <span className="truncate">{course.name}</span>
    </span>
  )
}
