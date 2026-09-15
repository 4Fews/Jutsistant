import type { NoteNode } from '@/types'

/**
 * Konversi dua arah antara dokumen TipTap dan Markdown/teks biasa.
 *
 * Ditulis sendiri, bukan memakai library, karena cakupannya persis sama
 * dengan yang didukung editor: heading, paragraf, bold, italic, coret,
 * kode, tautan, bullet list, numbered list, checklist, kutipan, dan garis.
 * Format di luar itu diturunkan menjadi teks biasa, bukan dibuang.
 */

// =============================================================== ke Markdown

function escapeText(s: string): string {
  return s.replace(/([\\`*_[\]])/g, '\\$1')
}

function inlineToMarkdown(nodes: NoteNode[] | undefined): string {
  if (!nodes) return ''
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '  \n'
      if (typeof n.text !== 'string') return inlineToMarkdown(n.content)

      let out = escapeText(n.text)
      // urutan penting: kode paling dalam, tautan paling luar
      for (const mark of n.marks ?? []) {
        if (mark.type === 'code') out = `\`${n.text}\``
        else if (mark.type === 'bold') out = `**${out}**`
        else if (mark.type === 'italic') out = `*${out}*`
        else if (mark.type === 'strike') out = `~~${out}~~`
        else if (mark.type === 'underline') out = `_${out}_`
      }
      const link = (n.marks ?? []).find((m) => m.type === 'link')
      if (link && typeof link.attrs?.href === 'string') out = `[${out}](${link.attrs.href})`
      return out
    })
    .join('')
}

function listItemsToMarkdown(node: NoteNode, indent: string, marker: (i: number) => string): string {
  return (node.content ?? [])
    .map((item, i) => {
      const prefix = marker(i)
      const pad = ' '.repeat(prefix.length)
      const parts: string[] = []
      let first = true
      for (const child of item.content ?? []) {
        const block = blockToMarkdown(child, indent + pad)
        if (!block) continue
        if (first) {
          parts.push(indent + prefix + block.trimStart())
          first = false
        } else {
          parts.push(block)
        }
      }
      if (first) parts.push(indent + prefix)
      return parts.join('\n')
    })
    .join('\n')
}

function blockToMarkdown(node: NoteNode, indent = ''): string {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(Number(node.attrs?.level ?? 1), 6)
      return `${indent}${'#'.repeat(level)} ${inlineToMarkdown(node.content)}`
    }
    case 'paragraph':
      return indent + inlineToMarkdown(node.content)
    case 'bulletList':
      return listItemsToMarkdown(node, indent, () => '- ')
    case 'orderedList': {
      const start = Number(node.attrs?.start ?? 1)
      return listItemsToMarkdown(node, indent, (i) => `${start + i}. `)
    }
    case 'taskList':
      return (node.content ?? [])
        .map((item) => {
          const done = item.attrs?.checked === true
          const body = (item.content ?? []).map((c) => inlineToMarkdown(c.content)).join(' ')
          return `${indent}- [${done ? 'x' : ' '}] ${body}`
        })
        .join('\n')
    case 'blockquote':
      return (node.content ?? [])
        .map((c) => `${indent}> ${blockToMarkdown(c).trimStart()}`)
        .join('\n')
    case 'codeBlock': {
      const lang = typeof node.attrs?.language === 'string' ? node.attrs.language : ''
      const body = (node.content ?? []).map((c) => c.text ?? '').join('')
      return `${indent}\`\`\`${lang}\n${body}\n${indent}\`\`\``
    }
    case 'horizontalRule':
      return `${indent}---`
    default:
      return indent + inlineToMarkdown(node.content)
  }
}

export function docToMarkdown(doc: NoteNode | undefined): string {
  if (!doc?.content) return ''
  return doc.content
    .map((n) => blockToMarkdown(n))
    .filter((s) => s.trim() !== '')
    .join('\n\n')
}

/** Teks polos untuk pencarian isi catatan. */
export function docToPlainText(doc: NoteNode | undefined): string {
  if (!doc) return ''
  const out: string[] = []
  const walk = (n: NoteNode) => {
    if (typeof n.text === 'string') out.push(n.text)
    if (n.type === 'hardBreak') out.push(' ')
    ;(n.content ?? []).forEach(walk)
    if (n.type && n.type !== 'text' && n.content) out.push('\n')
  }
  walk(doc)
  return out.join('').replace(/\n{2,}/g, '\n').trim()
}

// ============================================================= dari Markdown

const INLINE_RE =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`|~~([^~]+)~~/

function textNode(text: string, marks?: NoteNode['marks']): NoteNode {
  return marks?.length ? { type: 'text', text, marks } : { type: 'text', text }
}

function parseInline(raw: string): NoteNode[] {
  const out: NoteNode[] = []
  let rest = raw.replace(/\\([\\`*_[\]])/g, '$1')

  while (rest) {
    const m = INLINE_RE.exec(rest)
    if (!m || m.index === undefined) {
      out.push(textNode(rest))
      break
    }
    if (m.index > 0) out.push(textNode(rest.slice(0, m.index)))

    if (m[1] !== undefined) {
      out.push(textNode(m[1], [{ type: 'link', attrs: { href: m[2] } }]))
    } else if (m[3] !== undefined || m[4] !== undefined) {
      out.push(textNode(m[3] ?? m[4], [{ type: 'bold' }]))
    } else if (m[5] !== undefined || m[6] !== undefined) {
      out.push(textNode(m[5] ?? m[6], [{ type: 'italic' }]))
    } else if (m[7] !== undefined) {
      out.push(textNode(m[7], [{ type: 'code' }]))
    } else if (m[8] !== undefined) {
      out.push(textNode(m[8], [{ type: 'strike' }]))
    }
    rest = rest.slice(m.index + m[0].length)
  }
  return out.filter((n) => n.text !== '')
}

function para(text: string): NoteNode {
  const content = parseInline(text)
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

/**
 * Parser Markdown baris-per-baris untuk subset yang didukung editor.
 * Sintaks yang tidak dikenali tetap masuk sebagai paragraf biasa,
 * jadi tidak ada isi yang hilang saat impor.
 */
export function markdownToDoc(md: string): NoteNode {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const blocks: NoteNode[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(para(paragraph.join(' ').trim()))
      paragraph = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      flushParagraph()
      continue
    }

    // blok kode
    const fence = /^```(\w*)\s*$/.exec(trimmed)
    if (fence) {
      flushParagraph()
      const body: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) body.push(lines[i++])
      blocks.push({
        type: 'codeBlock',
        attrs: fence[1] ? { language: fence[1] } : {},
        content: body.length ? [{ type: 'text', text: body.join('\n') }] : undefined,
      })
      continue
    }

    if (/^(---|\*\*\*|___)\s*$/.test(trimmed)) {
      flushParagraph()
      blocks.push({ type: 'horizontalRule' })
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      blocks.push({
        type: 'heading',
        attrs: { level: Math.min(heading[1].length, 3) },
        content: parseInline(heading[2]),
      })
      continue
    }

    const quote = /^>\s?(.*)$/.exec(trimmed)
    if (quote) {
      flushParagraph()
      const last = blocks[blocks.length - 1]
      const p = para(quote[1])
      if (last?.type === 'blockquote') last.content?.push(p)
      else blocks.push({ type: 'blockquote', content: [p] })
      continue
    }

    // checklist harus dicek sebelum bullet biasa
    const task = /^[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(trimmed)
    if (task) {
      flushParagraph()
      const item: NoteNode = {
        type: 'taskItem',
        attrs: { checked: task[1].toLowerCase() === 'x' },
        content: [para(task[2])],
      }
      const last = blocks[blocks.length - 1]
      if (last?.type === 'taskList') last.content?.push(item)
      else blocks.push({ type: 'taskList', content: [item] })
      continue
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed)
    if (bullet) {
      flushParagraph()
      const item: NoteNode = { type: 'listItem', content: [para(bullet[1])] }
      const last = blocks[blocks.length - 1]
      if (last?.type === 'bulletList') last.content?.push(item)
      else blocks.push({ type: 'bulletList', content: [item] })
      continue
    }

    const ordered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed)
    if (ordered) {
      flushParagraph()
      const item: NoteNode = { type: 'listItem', content: [para(ordered[2])] }
      const last = blocks[blocks.length - 1]
      if (last?.type === 'orderedList') last.content?.push(item)
      else blocks.push({ type: 'orderedList', attrs: { start: Number(ordered[1]) }, content: [item] })
      continue
    }

    paragraph.push(trimmed)
  }
  flushParagraph()

  return { type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] }
}

/** Teks biasa: baris kosong memisahkan paragraf, newline tunggal jadi baris baru. */
export function textToDoc(txt: string): NoteNode {
  const paragraphs = txt.replace(/\r\n?/g, '\n').split(/\n{2,}/)
  const content: NoteNode[] = paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const parts = p.split('\n')
      const inline: NoteNode[] = []
      parts.forEach((line, i) => {
        if (i > 0) inline.push({ type: 'hardBreak' })
        if (line) inline.push({ type: 'text', text: line })
      })
      return inline.length ? { type: 'paragraph', content: inline } : { type: 'paragraph' }
    })
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

/**
 * Impor Markdown: kalau dokumen diawali heading, heading itu diangkat
 * menjadi judul catatan dan dikeluarkan dari badan teks — kalau tidak,
 * judul yang sama akan tampil dua kali di editor.
 */
export function markdownToTitledDoc(md: string, fallbackTitle: string): { title: string; doc: NoteNode } {
  const doc = markdownToDoc(md)
  const blocks = doc.content ?? []
  const first = blocks[0]

  if (first?.type === 'heading') {
    const text = (first.content ?? [])
      .map((n) => n.text ?? '')
      .join('')
      .trim()
    if (text) {
      const rest = blocks.slice(1)
      return {
        title: text.slice(0, 120),
        doc: { type: 'doc', content: rest.length ? rest : [{ type: 'paragraph' }] },
      }
    }
  }
  return { title: fallbackTitle, doc }
}

export function emptyDoc(): NoteNode {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}
