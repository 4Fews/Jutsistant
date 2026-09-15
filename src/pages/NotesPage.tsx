import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Search, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Fab } from '@/components/ui/Fab'
import { toast } from '@/components/ui/Toast'
import { NoteCard } from '@/features/notes/NoteCard'
import { useAttachmentCounts, useCourses, useNotes } from '@/lib/queries'
import { createNote } from '@/lib/repo'
import { markdownToTitledDoc, textToDoc } from '@/lib/markdown'
import { extOf, isImportableText } from '@/lib/attachments'

export function NotesPage() {
  const notes = useNotes()
  const courses = useCourses()
  const counts = useAttachmentCounts()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  const coursesById = useMemo(() => new Map((courses ?? []).map((c) => [c.id, c])), [courses])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (notes ?? [])
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.plainText.toLowerCase().includes(q))
      // disematkan selalu di atas, sisanya yang terakhir diubah lebih dulu
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  }, [notes, query])

  const loading = notes === undefined

  async function newNote() {
    const id = await createNote()
    navigate(`/catatan/${id}`)
  }

  async function importFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    let lastId: string | null = null
    let imported = 0
    for (const file of files) {
      if (!isImportableText(file)) {
        toast(`"${file.name}" bukan .txt atau .md — lampirkan lewat bagian File di dalam catatan.`)
        continue
      }
      const raw = await file.text()
      const fallbackTitle = file.name.replace(/\.[^.]+$/, '')

      // .md: heading pertama diangkat menjadi judul dan dikeluarkan dari badan teks.
      // .txt: nama berkas dipakai sebagai judul, seluruh isi dipertahankan apa adanya.
      if (extOf(file.name) === '.txt') {
        lastId = await createNote({ title: fallbackTitle, content: textToDoc(raw) })
      } else {
        const { title, doc } = markdownToTitledDoc(raw, fallbackTitle)
        lastId = await createNote({ title, content: doc })
      }
      imported++
    }

    if (imported === 1 && lastId) {
      toast('Catatan diimpor')
      navigate(`/catatan/${lastId}`)
    } else if (imported > 1) {
      toast(`${imported} catatan diimpor`)
    }
  }

  return (
    <>
      <PageHeader
        title="Catatan"
        subtitle={notes?.length ? `${notes.length} catatan` : undefined}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              multiple
              onChange={importFiles}
              className="sr-only"
              aria-label="Pilih file teks untuk diimpor"
            />
            <IconButton label="Impor catatan dari .txt atau .md" onClick={() => fileRef.current?.click()}>
              <FileUp size={19} aria-hidden="true" />
            </IconButton>
          </>
        }
      />

      <div className="relative">
        <Search
          size={17}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul atau isi catatan…"
          aria-label="Cari catatan"
          className="h-11 w-full rounded-btn border border-line bg-surface pl-10 pr-10 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Bersihkan pencarian"
            className="press absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <ul className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-[104px] animate-pulse rounded-card bg-surface-2" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          query ? (
            <EmptyState
              emoji="🔍"
              title="Tidak ada yang cocok"
              message={`Tidak ada catatan yang memuat "${query}".`}
              action={<Button onClick={() => setQuery('')}>Bersihkan pencarian</Button>}
            />
          ) : (
            <EmptyState
              emoji="📝"
              title="Belum ada catatan"
              message="Tulis catatan kuliah, atau impor file .txt dan .md yang sudah Anda punya."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="primary" onClick={newNote}>
                    Tulis catatan
                  </Button>
                  <Button onClick={() => fileRef.current?.click()}>Impor .txt / .md</Button>
                </div>
              }
            />
          )
        ) : (
          <ul className="space-y-2.5">
            {visible.map((n) => (
              <li key={n.id}>
                <NoteCard
                  note={n}
                  course={n.courseId ? coursesById.get(n.courseId) : undefined}
                  attachmentCount={counts?.get(n.id) ?? 0}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Fab label="Tulis catatan" onClick={newNote} />
    </>
  )
}
