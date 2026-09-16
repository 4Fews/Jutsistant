import { useEffect, useState } from 'react'
import { CloudDownload, Download, FileText, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/Confirm'
import { deleteAttachment, renameAttachment, restoreAttachment } from '@/lib/repo'
import { downloadBlob, formatBytes, kindOf, typeLabel } from '@/lib/attachments'
import { needsDownload } from '@/lib/cloudTypes'
import { downloadAttachmentBlob } from '@/lib/syncEngine'
import { fmtDate } from '@/lib/date'
import type { Attachment } from '@/types'

interface Props {
  attachment: Attachment | null
  onClose: () => void
}

/**
 * Satu sheet untuk pratinjau sekaligus semua tindakan file, supaya tidak
 * perlu menu dropdown terpisah yang sulit disentuh di layar HP.
 */
export function AttachmentPreview({ attachment, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Object URL dibuat saat sheet dibuka dan selalu dilepas saat ditutup,
  // supaya Blob tidak menahan memori. Kalau blob-nya masih placeholder
  // (file ini ditarik dari perangkat lain lewat sync, isinya belum
  // diunduh), ambil dulu dari Supabase Storage — hasilnya otomatis
  // tampil di sini karena attachment berasal dari useLiveQuery di parent.
  useEffect(() => {
    if (!attachment) {
      setUrl(null)
      return
    }
    setName(attachment.name)

    if (needsDownload(attachment)) {
      setDownloading(true)
      downloadAttachmentBlob(attachment)
        .catch(() => toast('Gagal mengunduh file dari cloud. Coba lagi.'))
        .finally(() => setDownloading(false))
      return
    }

    const u = URL.createObjectURL(attachment.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [attachment])

  if (!attachment) return <Sheet open={false} onClose={onClose} title="" children={null} />

  const kind = kindOf(attachment.mime, attachment.name)

  async function handleDownload() {
    if (!attachment) return
    if (needsDownload(attachment)) {
      setDownloading(true)
      try {
        const blob = await downloadAttachmentBlob(attachment)
        downloadBlob(blob, attachment.name)
      } catch {
        toast('Gagal mengunduh file dari cloud.')
      } finally {
        setDownloading(false)
      }
      return
    }
    downloadBlob(attachment.blob, attachment.name)
  }

  async function save() {
    if (!attachment) return
    const clean = name.trim()
    if (!clean || clean === attachment.name) return
    await renameAttachment(attachment.id, clean)
    toast('Nama file diperbarui')
  }

  async function remove() {
    if (!attachment) return
    const ok = await confirmDialog({
      title: 'Hapus file ini?',
      message: `${attachment.name} akan dihapus dari perangkat ini.`,
      confirmText: 'Hapus',
      danger: true,
    })
    if (!ok) return
    const deleted = await deleteAttachment(attachment.id)
    onClose()
    if (deleted) {
      toast('File dihapus', {
        action: { label: 'Urungkan', onClick: () => void restoreAttachment(deleted) },
      })
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      wide
      title={attachment.name}
      description={`${typeLabel(attachment.mime, attachment.name)} · ${formatBytes(attachment.size)} · ditambahkan ${fmtDate(attachment.createdAt)}`}
      footer={
        <div className="flex gap-2.5">
          <Button block variant="danger" onClick={remove}>
            <Trash2 size={16} aria-hidden="true" />
            Hapus
          </Button>
          <Button block variant="primary" onClick={handleDownload} disabled={downloading}>
            <Download size={16} aria-hidden="true" />
            {downloading ? 'Mengunduh…' : 'Unduh'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        {downloading && (
          <div className="flex flex-col items-center rounded-btn border border-dashed border-line px-6 py-10 text-center">
            <CloudDownload size={32} className="mb-3 animate-pulse text-ink-3" aria-hidden="true" />
            <p className="text-[14px] font-semibold">Mengunduh dari cloud…</p>
            <p className="mt-1 text-[13px] text-ink-2">File ini dibuat di perangkat lain.</p>
          </div>
        )}

        {!downloading && kind === 'gambar' && url && (
          <img
            src={url}
            alt={attachment.name}
            className="max-h-[52vh] w-full rounded-btn border border-line object-contain"
          />
        )}

        {!downloading && kind === 'pdf' && url && (
          <>
            <iframe
              src={url}
              title={`Pratinjau ${attachment.name}`}
              className="h-[52vh] w-full rounded-btn border border-line bg-surface-2"
            />
            <p className="text-[12px] text-ink-3">
              Kalau pratinjau tidak muncul (sering terjadi di Safari iPhone), pakai tombol Unduh untuk
              membukanya di aplikasi PDF bawaan.
            </p>
          </>
        )}

        {!downloading && kind !== 'gambar' && kind !== 'pdf' && (
          <div className="flex flex-col items-center rounded-btn border border-dashed border-line px-6 py-10 text-center">
            <FileText size={32} className="mb-3 text-ink-3" aria-hidden="true" />
            <p className="text-[14px] font-semibold">Tidak bisa dipratinjau di sini</p>
            <p className="mt-1 max-w-xs text-[13px] text-ink-2">
              {kind === 'dokumen'
                ? 'Unduh lalu buka dengan aplikasi dokumen di perangkat Anda.'
                : 'Unduh untuk membukanya dengan aplikasi yang sesuai.'}
            </p>
          </div>
        )}

        <Field label="Nama tampilan" hint="Menekan Enter menyimpan perubahan nama.">
          {(id) => (
            <TextInput
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void save()
                }
              }}
              autoComplete="off"
            />
          )}
        </Field>
      </div>
    </Sheet>
  )
}
