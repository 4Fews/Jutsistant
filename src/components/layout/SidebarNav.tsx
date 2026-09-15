import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav-items'
import { cn } from '@/lib/cn'

export function SidebarNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line bg-surface/60 px-3 py-6 md:block">
      <div className="mb-7 flex items-center gap-2.5 px-3">
        <img src="./favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
        <span className="text-lg font-extrabold tracking-tight">Semesta</span>
      </div>
      <nav aria-label="Navigasi utama">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'press flex items-center gap-3 rounded-btn px-3 py-2.5 text-[15px] font-medium',
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
