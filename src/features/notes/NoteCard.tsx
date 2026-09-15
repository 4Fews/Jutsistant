import { Link } from 'react-router-dom'
import { Paperclip, Pin } from 'lucide-react'
import { CourseChip } from '@/features/courses/CourseBadge'
import { fmtAgo } from '@/lib/date'
import type { Course, Note } from '@/types'

interface Props {
  note: Note
  course?: Course
  attachmentCount: number
}

export function NoteCard({ note, course, attachmentCount }: Props) {
  return (
    <Link
      to={`/catatan/${note.id}`}
      className="press block rounded-card border border-line bg-surface p-4 hover:border-line-strong"
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 truncate font-bold leading-snug">
          {note.title.trim() || <span className="text-ink-3">Tanpa judul</span>}
        </h3>
        {note.pinned && <Pin size={15} className="mt-0.5 shrink-0 text-primary" aria-label="Disematkan" />}
      </div>

      {note.plainText.trim() && (
        <p className="note-excerpt mt-1 text-[13px] leading-relaxed text-ink-2">{note.plainText}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {course && <CourseChip course={course} />}
        <span className="text-[12px] text-ink-3">Diubah {fmtAgo(note.updatedAt)}</span>
        {attachmentCount > 0 && (
          <span className="flex items-center gap-1 text-[12px] font-semibold text-ink-3 tnum">
            <Paperclip size={12} aria-hidden="true" />
            {attachmentCount}
          </span>
        )}
      </div>
    </Link>
  )
}
