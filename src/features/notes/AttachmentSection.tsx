import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Image as ImageIcon, Paperclip, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { AttachmentPreview } from './AttachmentPreview'
import { addAttachment } from '@/lib/repo'
import { useAttachmentUsage, useNoteAttachments } from '@/lib/queries'
import {
  MAX_TOTAL_BYTES,
  checkFileSize,
  formatBytes,
  kindOf,
  typeLabel,
} from '@/lib/attachments'
import { fmtDate } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { Attachment } from '@/types'

/** Object URL untuk thumbnail gambar, dibuat ulang tiap daftar berubah. */
function useThumbnails(attachments: Attachment[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const ids = attachments
    .filter((a) => kindOf(a.mime, a.name) === 'gambar')
    .map((a) => a.id)
    .join(',')

  useEffect(() => {
    const map = new Map<string, string>()
    for (const a of attachments) {
      if (kindOf(a.mime, a.name) === 'gambar') map.set(a.id, URL.createObjectURL(a.blob))
    }
    setUrls(map)
    return () => {
      map.forEach((u) => URL.revokeObjectURL(u))
    }
    // sengaja bergantung pada daftar id, bukan objek array yang identitasnya berubah tiap query

  }, [ids])

  return urls
}

export function AttachmentSection({ noteId }: { noteId: string }) {
  const attachments = useNoteAttachments(noteId)
  const usage = useAttachmentUsage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<Attachment | null>(null)

  const list = useMemo(() => attachments ?? [], [attachments])
  const thumbs = useThumbnails(list)
  const used = usage ?? 0
  const pct = Math.min(100, Math.round((used / MAX_TOTAL_BYTES) * 100))
  const nearlyFull = pct >= 80

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    // hitung berjalan supaya beberapa file sekaligus tidak menembus batas total
    let running = used
    let added = 0
    for (const file of files) {
      const check = checkFileSize(file, running)
      if (!check.ok) {
        toast(check.reason!)
        continue
      }
      await addAttachment(noteId, file)
      running += file.size
      added++
    }
    if (added) toast(added === 1 ? 'File dilampirkan' : `${added} file dilampirkan`)
  }

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-ink-3">
          <Paperclip size={13} aria-hidden="true" />
          File
          {list.length > 0 && <span className="ml-1 tnum normal-case tracking-normal">{list.length}</span>}
        </h2>
        <input
          ref={fileRef}
          type="file"
          multiple
          onChange={handleFiles}
          className="sr-only"
          aria-label="Pilih file untuk dilampirkan"
        />
        <Button size="sm" onClick={() => fileRef.current?.click()}>
          <Plus size={16} aria-hidden="true" />
          Lampirkan
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-5 text-center text-[13px] text-ink-3">
          Belum ada file. PDF, gambar, DOCX, dan berkas lain bisa dilampirkan di sini.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => {
            const kind = kindOf(a.mime, a.name)
            const thumb = thumbs.get(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setOpen(a)}
                  className="press flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left hover:border-line-strong"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : kind === 'gambar' ? (
                      <ImageIcon size={18} className="text-ink-3" aria-hidden="true" />
                    ) : (
                      <FileText size={18} className="text-ink-3" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.name}</span>
                    <span className="block truncate text-[12px] text-ink-3 tnum">
                      {typeLabel(a.mime, a.name)} · {formatBytes(a.size)} · {fmtDate(a.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {list.length > 0 && (
        <div className="mt-3 px-0.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn('h-full rounded-full transition-[width]', nearlyFull ? 'bg-soon' : 'bg-accent')}
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
          <p className={cn('mt-1.5 text-[12px] tnum', nearlyFull ? 'font-semibold text-soon' : 'text-ink-3')}>
            {formatBytes(used)} dari {formatBytes(MAX_TOTAL_BYTES)} terpakai
            {nearlyFull && ' — hampir penuh, hapus file lama kalau perlu ruang'}
          </p>
        </div>
      )}

      <AttachmentPreview attachment={open} onClose={() => setOpen(null)} />
    </section>
  )
}
