import { useEffect, useState, useSyncExternalStore } from 'react'
import { Sheet } from './Sheet'
import { Button } from './Button'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  /** kalau diisi, pengguna harus mengetik kata ini agar tombol aktif */
  typeToConfirm?: string
}

interface Pending {
  opts: ConfirmOptions
  resolve: (ok: boolean) => void
}

let pending: Pending | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

/** const ok = await confirmDialog({ title: 'Hapus tugas?' , danger: true }) */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  pending?.resolve(false) // kalau ada yang masih terbuka, anggap dibatalkan
  return new Promise<boolean>((resolve) => {
    pending = { opts, resolve }
    emit()
  })
}

function settle(ok: boolean) {
  pending?.resolve(ok)
  pending = null
  emit()
}

export function ConfirmHost() {
  const current = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => pending,
    () => null,
  )
  const [typed, setTyped] = useState('')

  useEffect(() => {
    setTyped('')
  }, [current])

  const opts = current?.opts
  const needsTyping = Boolean(opts?.typeToConfirm)
  const canConfirm = !needsTyping || typed.trim().toUpperCase() === opts?.typeToConfirm?.toUpperCase()

  return (
    <Sheet
      open={Boolean(current)}
      onClose={() => settle(false)}
      title={opts?.title ?? ''}
      description={opts?.message}
      footer={
        <div className="flex gap-2.5">
          <Button block onClick={() => settle(false)}>
            {opts?.cancelText ?? 'Batal'}
          </Button>
          <Button
            block
            variant={opts?.danger ? 'danger' : 'primary'}
            disabled={!canConfirm}
            onClick={() => settle(true)}
          >
            {opts?.confirmText ?? 'Lanjutkan'}
          </Button>
        </div>
      }
    >
      {needsTyping && (
        <label className="block pb-3">
          <span className="text-[13px] text-ink-2">
            Ketik <b className="font-extrabold text-ink">{opts?.typeToConfirm}</b> untuk melanjutkan
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            className="mt-2 h-11 w-full rounded-btn border border-line bg-canvas px-3 font-semibold tracking-wide outline-none focus:border-primary"
          />
        </label>
      )}
    </Sheet>
  )
}
