import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** panel lebih lebar untuk form panjang di layar besar */
  wide?: boolean
}

/**
 * Bottom sheet di HP, dialog di tengah pada layar lebar.
 *
 * Memakai <dialog> bawaan browser supaya jebakan fokus, tombol Esc,
 * dan urutan pembacaan layar sudah benar tanpa kode tambahan.
 */
export function Sheet({ open, onClose, title, description, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault() // Esc: tutup lewat state kita sendiri
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // klik area gelap
      }}
      className={cn(
        'fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full bg-transparent p-0 text-ink',
        'backdrop:bg-black/45 md:inset-0 md:m-auto md:h-fit',
        wide ? 'md:max-w-2xl' : 'md:max-w-lg',
      )}
    >
      <div className="anim-sheet flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[26px] border border-line bg-surface shadow-card md:rounded-card">
        <div className="shrink-0 px-5 pt-3 md:pt-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong md:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 pb-3">
            <div className="min-w-0 pt-1">
              <h2 id="sheet-title" className="text-lg font-extrabold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[13px] text-ink-2">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="press -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-line bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
