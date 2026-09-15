import { useEffect, useState } from 'react'
import { AlertTriangle, Paperclip } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { toast } from '@/components/ui/Toast'
import { importBackup } from '@/lib/backup'
import type { ImportMode, ParsedBackup } from '@/lib/backup'
import { fmtDate } from '@/lib/date'

interface Props {
  parsed: ParsedBackup | null
  current: { courses: number; tasks: number; notes: number }
  onClose: () => void
}

/**
 * Tidak ada satu pun data yang disentuh sampai tombol terakhir ditekan.
 * Mode "ganti" mengharuskan mengetik GANTI karena sifatnya merusak.
 */
export function ImportDialog({ parsed, current, onClose }: Props) {
  const [mode, setMode] = useState<ImportMode>('gabung')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (parsed) {
      setMode('gabung')
      setTyped('')
    }
  }, [parsed])

  const needsTyping = mode === 'ganti'
  const canRun = Boolean(parsed) && !busy && (!needsTyping || typed.trim().toUpperCase() === 'GANTI')

  async function run() {
    if (!parsed) return
    setBusy(true)
    try {
      const r = await importBackup(parsed, mode)
      onClose()
      toast(
        mode === 'ganti'
          ? `Data diganti: ${r.ditambah} entri dimuat`
          : `Digabungkan: ${r.ditambah} baru, ${r.diperbarui} diperbarui, ${r.dilewati} dilewati`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={Boolean(parsed)}
      onClose={onClose}
      title="Import backup"
      description={parsed?.exportedAt ? `Dibuat ${fmtDate(new Date(parsed.exportedAt).getTime())}` : undefined}
      footer={
        <div className="flex gap-2.5">
          <Button block onClick={onClose}>
            Batal
          </Button>
          <Button block variant={mode === 'ganti' ? 'danger' : 'primary'} disabled={!canRun} onClick={run}>
            {mode === 'ganti' ? 'Ganti semua' : 'Gabungkan'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-btn border border-line bg-canvas p-3">
            <p className="text-[12px] font-semibold text-ink-3">Isi file</p>
            <p className="mt-1 text-[14px] font-bold tnum">
              {parsed?.courses.length ?? 0} mata kuliah
            </p>
            <p className="text-[14px] font-bold tnum">{parsed?.tasks.length ?? 0} tugas</p>
            <p className="text-[14px] font-bold tnum">{parsed?.notes.length ?? 0} catatan</p>
          </div>
          <div className="rounded-btn border border-line bg-canvas p-3">
            <p className="text-[12px] font-semibold text-ink-3">Data Anda sekarang</p>
            <p className="mt-1 text-[14px] font-bold tnum">{current.courses} mata kuliah</p>
            <p className="text-[14px] font-bold tnum">{current.tasks} tugas</p>
            <p className="text-[14px] font-bold tnum">{current.notes} catatan</p>
          </div>
        </div>

        <div className="flex gap-2.5 rounded-btn bg-surface-2 p-3">
          <Paperclip size={17} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
          <p className="min-w-0 text-[13px] text-ink-2">
            File lampiran tidak pernah ikut di dalam backup JSON.{' '}
            {mode === 'gabung'
              ? 'Lampiran yang ada di perangkat ini tetap utuh.'
              : 'Mode "Ganti semua" akan menghapus semua lampiran di perangkat ini.'}
          </p>
        </div>

        {parsed && parsed.skipped.length > 0 && (
          <div className="flex gap-2.5 rounded-btn bg-soon-soft p-3">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-soon" aria-hidden="true" />
            <div className="min-w-0 text-[13px]">
              <p className="font-semibold text-ink">{parsed.skipped.length} baris akan dilewati</p>
              <p className="mt-0.5 text-ink-2">{parsed.skipped.slice(0, 4).join(', ')}</p>
            </div>
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Cara menerapkan</span>
          <Segmented<ImportMode>
            label="Mode import"
            value={mode}
            onChange={setMode}
            activeClass={{ ganti: 'text-late' }}
            options={[
              { value: 'gabung', label: 'Gabungkan' },
              { value: 'ganti', label: 'Ganti semua' },
            ]}
          />
          <p className="mt-2 text-[13px] text-ink-2">
            {mode === 'gabung'
              ? 'Data digabung berdasarkan id. Kalau ada yang sama, versi yang lebih baru dipakai. Aman.'
              : 'Semua data Anda sekarang dihapus, lalu diganti isi file ini. Tidak bisa diurungkan.'}
          </p>
        </div>

        {needsTyping && (
          <label className="block">
            <span className="text-[13px] text-ink-2">
              Ketik <b className="font-extrabold text-ink">GANTI</b> untuk mengaktifkan tombol
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
      </div>
    </Sheet>
  )
}
