import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full rounded-btn border border-line bg-canvas px-3.5 text-[15px] text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-primary disabled:opacity-50'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (id: string) => ReactNode
}

/** Label asli yang terhubung ke kontrol — bukan placeholder sebagai label. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  return (
    <div className="py-2">
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-late">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(CONTROL, 'h-11', className)} />
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(CONTROL, 'min-h-[84px] resize-y py-2.5', className)} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={cn(CONTROL, 'h-11 appearance-none pr-10', className)}>
        {children}
      </select>
      <ChevronDown
        size={17}
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </div>
  )
}
