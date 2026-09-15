import { X } from 'lucide-react'
import { Segmented } from '@/components/ui/Segmented'
import { cn } from '@/lib/cn'
import type { Course, Priority } from '@/types'

export type StatusFilter = 'aktif' | 'selesai' | 'semua'

export interface Filters {
  status: StatusFilter
  courseId: string | 'semua'
  priority: Priority | 'semua'
}

export const DEFAULT_FILTERS: Filters = { status: 'aktif', courseId: 'semua', priority: 'semua' }

export function isDefaultFilters(f: Filters): boolean {
  return f.status === 'aktif' && f.courseId === 'semua' && f.priority === 'semua'
}

interface Props {
  value: Filters
  onChange: (f: Filters) => void
  courses: Course[]
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'press flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-line bg-surface text-ink-2 hover:border-line-strong',
      )}
    >
      {children}
    </button>
  )
}

export function TaskFilters({ value, onChange, courses }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-2.5">
      <Segmented<StatusFilter>
        label="Status tugas"
        value={value.status}
        onChange={(status) => set({ status })}
        options={[
          { value: 'aktif', label: 'Aktif' },
          { value: 'selesai', label: 'Selesai' },
          { value: 'semua', label: 'Semua' },
        ]}
      />

      {/* baris gulir mendatar: hemat ruang vertikal di layar HP */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-8 md:px-8">
        <label className="relative shrink-0">
          <span className="sr-only">Saring berdasarkan prioritas</span>
          <select
            value={value.priority}
            onChange={(e) => set({ priority: e.target.value as Filters['priority'] })}
            className={cn(
              'press h-10 appearance-none rounded-full border px-3.5 text-[13px] font-semibold outline-none',
              value.priority === 'semua'
                ? 'border-line bg-surface text-ink-2'
                : 'border-primary bg-primary-soft text-primary',
            )}
          >
            <option value="semua">Semua prioritas</option>
            <option value="tinggi">Prioritas tinggi</option>
            <option value="sedang">Prioritas sedang</option>
            <option value="rendah">Prioritas rendah</option>
          </select>
        </label>

        <Chip active={value.courseId === 'semua'} onClick={() => set({ courseId: 'semua' })}>
          Semua matkul
        </Chip>

        {courses.map((c) => (
          <Chip key={c.id} active={value.courseId === c.id} onClick={() => set({ courseId: c.id })}>
            <span aria-hidden="true">{c.icon}</span>
            {c.name}
          </Chip>
        ))}

        {!isDefaultFilters(value) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="press flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold text-ink-3 hover:text-ink"
          >
            <X size={14} aria-hidden="true" />
            Bersihkan
          </button>
        )}
      </div>
    </div>
  )
}
