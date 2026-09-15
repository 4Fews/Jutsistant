import { COLOR_KEYS, COLOR_LABEL, ICON_CHOICES, courseVars } from '@/lib/colors'
import { cn } from '@/lib/cn'
import type { ColorKey } from '@/types'

export function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (c: ColorKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Warna mata kuliah" className="flex flex-wrap gap-2">
      {COLOR_KEYS.map((key) => {
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={COLOR_LABEL[key]}
            onClick={() => onChange(key)}
            style={courseVars(key)}
            className={cn(
              'press flex h-11 w-11 items-center justify-center rounded-full border-2',
              active ? 'border-[var(--course)]' : 'border-transparent',
            )}
          >
            <span className="h-6 w-6 rounded-full bg-[var(--course)]" />
          </button>
        )
      })}
    </div>
  )
}

export function IconPicker({ value, onChange }: { value: string; onChange: (i: string) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Ikon mata kuliah"
      className="grid max-h-[140px] grid-cols-8 gap-1 overflow-y-auto rounded-btn border border-line bg-canvas p-2"
    >
      {ICON_CHOICES.map((icon) => {
        const active = icon === value
        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Ikon ${icon}`}
            onClick={() => onChange(icon)}
            className={cn(
              'press flex aspect-square items-center justify-center rounded-lg text-lg',
              active ? 'bg-primary-soft ring-2 ring-primary' : 'hover:bg-surface-2',
            )}
          >
            <span aria-hidden="true">{icon}</span>
          </button>
        )
      })}
    </div>
  )
}
