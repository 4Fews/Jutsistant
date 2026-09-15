/** Batas penyimpanan lampiran. Disengaja konservatif supaya IndexedDB
 *  tidak membengkak dan browser tidak mulai membuang data. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB per file
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024 // 50 MB seluruh lampiran

export type FileKind = 'gambar' | 'pdf' | 'dokumen' | 'teks' | 'lainnya'

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const TEXT_EXTS = ['.txt', '.md', '.markdown']

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i).toLowerCase()
}

/** File teks yang bisa diimpor langsung menjadi catatan yang dapat diedit. */
export function isImportableText(file: File): boolean {
  return TEXT_EXTS.includes(extOf(file.name)) || file.type === 'text/markdown' || file.type === 'text/plain'
}

export function kindOf(mime: string, name: string): FileKind {
  if (IMAGE_MIMES.includes(mime) || mime.startsWith('image/')) return 'gambar'
  if (mime === 'application/pdf' || extOf(name) === '.pdf') return 'pdf'
  if (['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'].includes(extOf(name))) return 'dokumen'
  if (mime.startsWith('text/') || TEXT_EXTS.includes(extOf(name))) return 'teks'
  return 'lainnya'
}

/** Label tipe yang enak dibaca, mis. "PDF", "Gambar JPEG", "DOCX". */
export function typeLabel(mime: string, name: string): string {
  const kind = kindOf(mime, name)
  const ext = extOf(name).replace('.', '').toUpperCase()
  if (kind === 'pdf') return 'PDF'
  if (kind === 'gambar') return ext ? `Gambar ${ext}` : 'Gambar'
  if (kind === 'dokumen') return ext || 'Dokumen'
  if (kind === 'teks') return ext || 'Teks'
  return ext || 'Berkas'
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export interface SizeCheck {
  ok: boolean
  reason?: string
}

/** Pesan ditulis untuk dibaca manusia, bukan menyebut batas dalam byte. */
export function checkFileSize(file: File, currentTotal: number): SizeCheck {
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `"${file.name}" berukuran ${formatBytes(file.size)}. Batas per file ${formatBytes(MAX_FILE_BYTES)}.`,
    }
  }
  if (currentTotal + file.size > MAX_TOTAL_BYTES) {
    const sisa = Math.max(0, MAX_TOTAL_BYTES - currentTotal)
    return {
      ok: false,
      reason: `Penyimpanan lampiran hampir penuh. Sisa ruang ${formatBytes(sisa)}, file ini ${formatBytes(file.size)}. Hapus lampiran lama dulu.`,
    }
  }
  return { ok: true }
}

/** Memicu unduhan sebuah Blob dengan nama tertentu. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
