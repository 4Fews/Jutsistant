import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Cloud,
  CloudOff,
  Download,
  HardDrive,
  Monitor,
  Moon,
  NotebookPen,
  Paperclip,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/Confirm'
import { ImportDialog } from '@/features/data/ImportDialog'
import {
  exportBackup,
  exportNotesAsMarkdown,
  exportNotesAsText,
  parseBackup,
  wipeAllData,
} from '@/lib/backup'
import type { ParsedBackup } from '@/lib/backup'
import { estimateStorage, requestPersistence } from '@/lib/db'
import { fmtAgo } from '@/lib/date'
import { useAttachmentUsage, useCourses, useNotes, useOrphanAttachments, useTasks } from '@/lib/queries'
import { deleteAttachment } from '@/lib/repo'
import { downloadBlob, formatBytes } from '@/lib/attachments'
import { clearDemoData, insertDemoData } from '@/lib/seed'
import { useSettings } from '@/lib/settings'
import { useTheme } from '@/lib/theme'
import type { Theme } from '@/lib/theme'
import { isCloudConfigured } from '@/lib/supabaseClient'
import { signOut, useAuth } from '@/lib/authStore'
import { useSyncStatus } from '@/lib/syncEngine'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-0.5 text-[12px] font-extrabold uppercase tracking-wider text-ink-3">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border border-line bg-surface p-4">{children}</div>
}

export function SettingsPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const sync = useSyncStatus()
  const [theme, setTheme] = useTheme()
  const settings = useSettings()
  const courses = useCourses(true)
  const tasks = useTasks()
  const notes = useNotes()
  const orphans = useOrphanAttachments()
  const attachmentUsage = useAttachmentUsage() ?? 0
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ParsedBackup | null>(null)
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null)

  useEffect(() => {
    void (async () => {
      const est = await estimateStorage()
      const persisted = (await navigator.storage?.persisted?.()) ?? false
      if (est) setStorage({ ...est, persisted })
    })()
  }, [])

  const counts = {
    courses: courses?.length ?? 0,
    tasks: tasks?.length ?? 0,
    notes: notes?.length ?? 0,
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // supaya file yang sama bisa dipilih lagi
    if (!file) return
    const result = parseBackup(await file.text())
    if (!result.ok) {
      toast(result.error)
      return
    }
    setPending(result.value)
  }

  async function wipe() {
    const ok = await confirmDialog({
      title: 'Hapus SEMUA data?',
      message: `${counts.courses} mata kuliah, ${counts.tasks} tugas, ${counts.notes} catatan, dan semua file lampiran akan hilang permanen${auth.status === 'signed-in' ? ' — termasuk salinannya di cloud' : ''}. Tidak bisa diurungkan. Sebaiknya export dulu.`,
      confirmText: 'Hapus semua',
      danger: true,
      typeToConfirm: 'HAPUS',
    })
    if (!ok) return
    await wipeAllData()
    toast('Semua data dihapus')
  }

  async function enablePersistence() {
    const ok = await requestPersistence()
    const est = await estimateStorage()
    if (est) setStorage({ ...est, persisted: ok })
    toast(ok ? 'Penyimpanan diamankan' : 'Browser belum mengabulkan. Coba setelah app dipasang ke layar utama.')
  }

  return (
    <>
      <PageHeader title="Pengaturan" />

      {isCloudConfigured && (
        <Section title="Akun & Sinkronisasi">
          <Card>
            {auth.status === 'loading' ? (
              <p className="text-[13px] text-ink-2">Memeriksa sesi…</p>
            ) : auth.status === 'signed-in' ? (
              <div className="flex items-start gap-3">
                <Cloud size={18} className="mt-0.5 shrink-0 text-done" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{auth.user?.email}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold">
                    {sync.status === 'syncing' && (
                      <span className="flex items-center gap-1.5 text-primary">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                        Menyinkronkan…
                      </span>
                    )}
                    {sync.status === 'idle' && (
                      <span className="flex items-center gap-1.5 text-done">
                        <span className="h-1.5 w-1.5 rounded-full bg-done" />
                        Tersimpan{sync.lastSyncAt ? ` · ${fmtAgo(sync.lastSyncAt)}` : ''}
                      </span>
                    )}
                    {sync.status === 'offline' && (
                      <span className="flex items-center gap-1.5 text-ink-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                        Offline — akan menyinkron lagi saat online
                      </span>
                    )}
                    {sync.status === 'error' && (
                      <span className="flex items-center gap-1.5 text-soon">
                        <span className="h-1.5 w-1.5 rounded-full bg-soon" />
                        Gagal menyinkronkan, akan dicoba lagi
                      </span>
                    )}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={async () => {
                      await signOut()
                      toast('Berhasil keluar')
                    }}
                  >
                    Keluar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <CloudOff size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">Belum masuk</h3>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    Data Anda masih hanya di perangkat ini. Masuk untuk menyinkronkannya ke HP dan laptop
                    sekaligus.
                  </p>
                  <Button size="sm" variant="primary" className="mt-3" onClick={() => navigate('/masuk')}>
                    Masuk
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Section>
      )}

      <Section title="Tampilan">
        <Card>
          <div className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold">
            {theme === 'gelap' ? <Moon size={17} aria-hidden="true" /> : theme === 'terang' ? <Sun size={17} aria-hidden="true" /> : <Monitor size={17} aria-hidden="true" />}
            Tema
          </div>
          <Segmented<Theme>
            label="Tema tampilan"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'terang', label: 'Terang' },
              { value: 'gelap', label: 'Gelap' },
              { value: 'sistem', label: 'Ikut sistem' },
            ]}
          />
        </Card>
      </Section>

      <Section title="Data & backup">
        <Card>
          <div className="flex items-start gap-3">
            <Download size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">Backup data</h3>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Simpan {counts.courses} mata kuliah, {counts.tasks} tugas, dan {counts.notes} catatan ke
                satu berkas JSON.
              </p>
              <p className="mt-1 text-[12px] text-ink-3">
                {settings.lastBackupAt
                  ? `Terakhir di-export ${fmtAgo(settings.lastBackupAt)}.`
                  : 'Belum pernah di-export.'}
              </p>
              {attachmentUsage > 0 && (
                <p className="mt-2 flex gap-2 rounded-btn bg-soon-soft px-3 py-2 text-[12px] text-ink-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-soon" aria-hidden="true" />
                  <span>
                    <b className="font-semibold text-ink">File lampiran tidak ikut</b> di berkas ini
                    ({formatBytes(attachmentUsage)}). Satu PDF saja bisa membuat backup membengkak. Untuk
                    mengamankannya, unduh filenya lewat tiap catatan dan salin sendiri ke tempat lain.
                  </span>
                </p>
              )}
              <Button
                size="sm"
                variant="primary"
                className="mt-3"
                onClick={async () => {
                  await exportBackup()
                  toast('Backup diunduh')
                }}
              >
                Export sekarang
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <Upload size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">Import backup</h3>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Isi file diperiksa dan ditampilkan dulu. Tidak ada yang berubah sebelum Anda menyetujuinya.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFile}
                className="sr-only"
                aria-label="Pilih file backup"
              />
              <Button size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
                Pilih file
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <NotebookPen size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">Export catatan</h3>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Unduh seluruh isi catatan sebagai satu berkas yang bisa dibaca di aplikasi lain.
                Lampiran tidak termasuk.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={counts.notes === 0}
                  onClick={async () => {
                    const n = await exportNotesAsMarkdown()
                    toast(n ? `${n} catatan diunduh sebagai .md` : 'Belum ada catatan')
                  }}
                >
                  Markdown (.md)
                </Button>
                <Button
                  size="sm"
                  disabled={counts.notes === 0}
                  onClick={async () => {
                    const n = await exportNotesAsText()
                    toast(n ? `${n} catatan diunduh sebagai .txt` : 'Belum ada catatan')
                  }}
                >
                  Teks biasa (.txt)
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {orphans && orphans.length > 0 && (
          <Card>
            <div className="flex items-start gap-3">
              <Paperclip size={18} className="mt-0.5 shrink-0 text-soon" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">File tanpa catatan</h3>
                <p className="mt-0.5 text-[13px] text-ink-2">
                  {orphans.length} file masih tersimpan padahal catatannya sudah dihapus, memakai{' '}
                  {formatBytes(orphans.reduce((n, a) => n + a.size, 0))}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      orphans.forEach((a) => downloadBlob(a.blob, a.name))
                      toast(`Mengunduh ${orphans.length} file`)
                    }}
                  >
                    Unduh semua
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: `Hapus ${orphans.length} file?`,
                        message: 'File yang tidak lagi terkait catatan mana pun akan dihapus permanen.',
                        confirmText: 'Hapus',
                        danger: true,
                      })
                      if (!ok) return
                      for (const a of orphans) await deleteAttachment(a.id)
                      toast('File tanpa catatan dihapus')
                    }}
                  >
                    Hapus semua
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {storage && (
          <Card>
            <div className="flex items-start gap-3">
              <HardDrive size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Penyimpanan perangkat</h3>
                <p className="mt-0.5 text-[13px] text-ink-2 tnum">
                  Terpakai {(storage.usage / 1024).toFixed(0)} KB
                  {storage.quota > 0 && ` dari ${(storage.quota / 1024 / 1024).toFixed(0)} MB tersedia`}.
                </p>
                <p className="mt-1 text-[12px] text-ink-3">
                  {storage.persisted
                    ? 'Data ditandai permanen — browser tidak akan menghapusnya otomatis.'
                    : 'Browser boleh menghapus data ini kalau penyimpanan menipis.'}
                </p>
                {!storage.persisted && (
                  <Button size="sm" className="mt-3" onClick={enablePersistence}>
                    Amankan penyimpanan
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </Section>

      {/* Data contoh tidak punya tempat saat sinkronisasi aktif — isinya akan
          bercampur dengan data asli dari akun. */}
      {!isCloudConfigured && (
      <Section title="Data contoh">
        <Card>
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">Mata kuliah &amp; tugas contoh</h3>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Dipakai untuk melihat tampilan aplikasi. Menghapusnya tidak menyentuh data Anda sendiri.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await clearDemoData()
                    toast('Data contoh dihapus')
                  }}
                >
                  Hapus data contoh
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await insertDemoData()
                    toast('Data contoh dimuat ulang')
                  }}
                >
                  Muat ulang contoh
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </Section>
      )}

      <Section title="Zona berbahaya">
        <div className="rounded-card border border-late/35 bg-late-soft p-4">
          <div className="flex items-start gap-3">
            <Trash2 size={18} className="mt-0.5 shrink-0 text-late" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-ink">Hapus seluruh data</h3>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Menghapus semua mata kuliah dan tugas dari perangkat ini. Export dulu kalau masih ragu.
              </p>
              <Button size="sm" variant="danger" className="mt-3" onClick={wipe}>
                Hapus semua data
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Tentang">
        <Card>
          <p className="text-[13px] leading-relaxed text-ink-2">
            {isCloudConfigured ? (
              <>
                <b className="text-ink">Semesta</b> menyimpan data di perangkat ini, dan — kalau Anda masuk —
                juga tersinkron ke akun Supabase pribadi Anda supaya bisa dipakai di HP dan laptop sekaligus.
                Tidak ada pendaftaran publik; hanya akun yang dibuat sendiri lewat Supabase Dashboard yang
                bisa masuk.
              </>
            ) : (
              <>
                <b className="text-ink">Semesta</b> menyimpan seluruh data di browser perangkat ini saja. Tidak
                ada server, tidak ada akun, tidak ada data yang dikirim ke mana pun. Karena itu data tidak ikut
                berpindah antar perangkat — gunakan Export dan Import untuk memindahkannya.
              </>
            )}
          </p>
        </Card>
      </Section>

      <ImportDialog parsed={pending} current={counts} onClose={() => setPending(null)} />
    </>
  )
}
