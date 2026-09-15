import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav-items'
import { cn } from '@/lib/cn'

export function BottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/85 backdrop-blur-lg md:hidden"
    >
      <ul className="flex pb-safe">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'press flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 py-2',
                  isActive ? 'text-primary' : 'text-ink-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                  </span>
                  <span className={cn('text-[11px] leading-none', isActive && 'font-semibold')}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
