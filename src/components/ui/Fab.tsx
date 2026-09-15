import { Plus } from 'lucide-react'

interface Props {
  label: string
  onClick: () => void
}

/** Tombol tambah mengambang, diletakkan di jangkauan ibu jari. */
export function Fab({ label, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-ink shadow-card md:bottom-8 md:right-8"
    >
      <Plus size={26} strokeWidth={2.5} aria-hidden="true" />
    </button>
  )
}
