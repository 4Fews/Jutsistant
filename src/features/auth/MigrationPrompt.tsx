import { useEffect, useState } from 'react'
import { BookOpen, CloudUpload, ListChecks, NotebookPen, Paperclip } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/authStore'
import { countLocalData, markMigrated, migrateLocalToCloud, needsMigrationPrompt } from '@/lib/migration'
import type { LocalCounts } from '@/lib/migration'

function Row({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-btn border border-line bg-canvas px-3.5 py-3">
      <Icon size={17} className="shrink-0 text-ink-3" aria-hidden="true" />
      <span className="flex-1 text-[14px] text-ink-2">{label}</span>
      <span className="tnum text-[15px] font-bold">{value}</span>
    </div>
  )
}

/**
 * Muncul otomatis sekali per akun setelah login pertama, kalau ada data
 * lokal yang belum pernah dipindahkan. Dipasang sekali di AppShell —
 * tidak render apa pun selama syaratnya belum terpenuhi.
 */
export function MigrationPrompt() {
  const auth = useAuth()
  const [counts, setCounts] = useState<LocalCounts | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (auth.status !== 'signed-in' || !auth.user) return
    const userId = auth.user.id
    if (!needsMigrationPrompt(userId)) return

    let cancelled = false
    void countLocalData().then((c) => {
      if (cancelled) return
      const total = c.courses + c.tasks + c.notes + c.attachments
      // tidak ada apa-apa untuk dipindahkan → tandai selesai diam-diam,
      // tidak perlu mengganggu dengan dialog kosong
      if (total === 0) markMigrated(userId)
      else setCounts(c)
    })
    return () => {
      cancelled = true
    }
  }, [auth.status, auth.user])

  if (!counts || auth.status !== 'signed-in' || !auth.user) return null
  const userId = auth.user.id

  async function migrate() {
    setBusy(true)
    try {
      await migrateLocalToCloud()
      markMigrated(userId)
      toast('Data lokal berhasil dipindahkan ke cloud')
      setCounts(null)
    } catch {
      toast('Gagal memindahkan data — coba lagi saat koneksi stabil.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={() => setCounts(null)}
      title="Pindahkan data lokal ke cloud?"
      description="Supaya data yang sudah Anda buat di perangkat ini ikut muncul di perangkat lain setelah masuk dengan akun yang sama."
      footer={
        <div className="flex gap-2.5">
          <Button block onClick={() => setCounts(null)} disabled={busy}>
            Nanti saja
          </Button>
          <Button block variant="primary" onClick={migrate} disabled={busy}>
            <CloudUpload size={16} aria-hidden="true" />
            {busy ? 'Memindahkan…' : 'Pindahkan ke cloud'}
          </Button>
        </div>
      }
    >
      <div className="space-y-2 pb-2">
        <Row icon={BookOpen} label="Mata kuliah" value={counts.courses} />
        <Row icon={ListChecks} label="Tugas" value={counts.tasks} />
        <Row icon={NotebookPen} label="Catatan" value={counts.notes} />
        <Row icon={Paperclip} label="File lampiran" value={counts.attachments} />
        <p className="pt-1 text-[12px] text-ink-3">
          Data di perangkat ini tidak dihapus — cuma disalin. Aman kalau tombol ini ditekan lebih dari
          sekali.
        </p>
      </div>
    </Sheet>
  )
}
