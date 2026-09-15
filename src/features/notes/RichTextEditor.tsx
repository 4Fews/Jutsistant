import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { NoteNode } from '@/types'

interface Props {
  /** dokumen awal; editor tidak dikendalikan setelah dibuat agar kursor tidak melompat */
  initialContent: NoteNode
  onChange: (doc: NoteNode) => void
}

function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // onMouseDown mencegah editor kehilangan fokus saat tombol ditekan
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'press flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] disabled:opacity-35',
        active ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}

function Toolbar({ editor, onLink }: { editor: Editor; onLink: () => void }) {
  return (
    <div className="no-scrollbar sticky top-0 z-10 -mx-4 flex items-center gap-0.5 overflow-x-auto border-b border-line bg-canvas/95 px-4 py-1.5 backdrop-blur md:-mx-8 md:px-8">
      <ToolButton
        icon={Heading1}
        label="Judul besar"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolButton
        icon={Heading2}
        label="Judul kecil"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />
      <ToolButton
        icon={Bold}
        label="Tebal"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolButton
        icon={Italic}
        label="Miring"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolButton
        icon={Strikethrough}
        label="Coret"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />
      <ToolButton
        icon={List}
        label="Daftar poin"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolButton
        icon={ListOrdered}
        label="Daftar bernomor"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolButton
        icon={ListTodo}
        label="Checklist"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
      <ToolButton
        icon={Quote}
        label="Kutipan"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />
      <ToolButton icon={Link2} label="Tautan" active={editor.isActive('link')} onClick={onLink} />
      <ToolButton
        icon={Link2Off}
        label="Hapus tautan"
        disabled={!editor.isActive('link')}
        onClick={() => editor.chain().focus().unsetLink().run()}
      />
      <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />
      <ToolButton
        icon={Undo2}
        label="Urungkan"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolButton
        icon={Redo2}
        label="Ulangi"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  )
}

export function RichTextEditor({ initialContent, onChange }: Props) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Mulai menulis di sini…' }),
    ],
    content: initialContent,
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as NoteNode),
    editorProps: {
      attributes: {
        class: 'prose-note min-h-[45vh] py-4 outline-none',
        'aria-label': 'Isi catatan',
      },
    },
  })

  // bersihkan instance editor saat halaman ditinggalkan
  useEffect(() => () => editor?.destroy(), [editor])

  if (!editor) return <div className="h-60 animate-pulse rounded-card bg-surface-2" aria-hidden="true" />

  function openLink() {
    if (!editor) return
    setLinkUrl(editor.getAttributes('link').href ?? '')
    setLinkOpen(true)
  }

  function applyLink() {
    if (!editor) return
    const href = linkUrl.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!href) chain.unsetLink().run()
    else chain.setLink({ href: /^[a-z]+:/i.test(href) ? href : `https://${href}` }).run()
    setLinkOpen(false)
  }

  return (
    <>
      <Toolbar editor={editor} onLink={openLink} />
      <EditorContent editor={editor} />

      <Sheet
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Tautan"
        footer={
          <div className="flex gap-2.5">
            <Button block onClick={() => setLinkOpen(false)}>
              Batal
            </Button>
            <Button block variant="primary" onClick={applyLink}>
              Terapkan
            </Button>
          </div>
        }
      >
        <Field label="Alamat" hint="Kosongkan lalu Terapkan untuk menghapus tautan.">
          {(id) => (
            <TextInput
              id={id}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="contoh.com/materi"
              inputMode="url"
              autoComplete="off"
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
            />
          )}
        </Field>
      </Sheet>
    </>
  )
}
