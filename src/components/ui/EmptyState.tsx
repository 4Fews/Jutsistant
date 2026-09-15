import type { ReactNode } from 'react'

interface Props {
  emoji: string
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState({ emoji, title, message, action }: Props) {
  return (
    <div className="anim-pop flex flex-col items-center rounded-card border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="text-[16px] font-extrabold">{title}</h3>
      <p className="mt-1 max-w-xs text-[14px] text-ink-2">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
