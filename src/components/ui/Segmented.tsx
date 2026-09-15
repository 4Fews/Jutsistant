import { cn } from '@/lib/cn'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  label: string
  /** warna aktif khusus per nilai, mis. prioritas tinggi = merah */
  activeClass?: Partial<Record<T, string>>
}

export function Segmented<T extends string>({ value, onChange, options, label, activeClass }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5 rounded-btn bg-surface-2 p-1.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'press min-h-[42px] flex-1 rounded-[10px] px-2 text-[13px] font-semibold',
              active
                ? cn('bg-surface shadow-sm', activeClass?.[o.value] ?? 'text-ink')
                : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
