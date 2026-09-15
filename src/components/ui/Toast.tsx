import { useSyncExternalStore } from 'react'
import { newId } from '@/lib/id'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: string
  message: string
  action?: ToastAction
  duration: number
}

const EMPTY: ToastItem[] = []
let items: ToastItem[] = EMPTY
const listeners = new Set<() => void>()
const timers = new Map<string, number>()

function emit() {
  listeners.forEach((l) => l())
}

export function dismissToast(id: string): void {
  const t = timers.get(id)
  if (t) {
    clearTimeout(t)
    timers.delete(id)
  }
  items = items.filter((i) => i.id !== id)
  emit()
}

/** toast('Tugas dihapus', { action: { label: 'Urungkan', onClick } }) */
export function toast(message: string, opts: { action?: ToastAction; duration?: number } = {}): void {
  const item: ToastItem = {
    id: newId(),
    message,
    action: opts.action,
    // beri waktu lebih lama kalau ada tombol urungkan
    duration: opts.duration ?? (opts.action ? 6500 : 3200),
  }
  items = [...items, item]
  emit()
  timers.set(item.id, window.setTimeout(() => dismissToast(item.id), item.duration))
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => items,
    () => EMPTY,
  )

  if (!list.length) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(74px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:left-6 md:items-start"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className="anim-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-btn border border-line bg-surface px-4 py-3 shadow-card"
        >
          <span className="min-w-0 flex-1 text-[14px]">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick()
                dismissToast(t.id)
              }}
              className="press shrink-0 rounded-lg px-2 py-1 text-[14px] font-bold text-primary hover:bg-primary-soft"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
