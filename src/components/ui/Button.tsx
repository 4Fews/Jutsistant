import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink hover:brightness-95',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-late text-late-ink hover:brightness-95',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 gap-1.5 px-3 text-[13px] rounded-[12px]',
  md: 'h-11 gap-2 px-4 text-[15px] rounded-btn',
  lg: 'h-12 gap-2 px-5 text-[15px] rounded-btn',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'press inline-flex items-center justify-center font-semibold disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** wajib: pembaca layar butuh nama untuk tombol tanpa teks */
  label: string
  children: ReactNode
}

export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        'press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2',
        'hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
    >
      {children}
    </button>
  )
}
