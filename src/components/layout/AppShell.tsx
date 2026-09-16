import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { SidebarNav } from './SidebarNav'
import { Toaster } from '@/components/ui/Toast'
import { ConfirmHost } from '@/components/ui/Confirm'
import { MigrationPrompt } from '@/features/auth/MigrationPrompt'

export function AppShell() {
  return (
    <div className="flex min-h-dvh bg-canvas">
      <SidebarNav />
      <div className="min-w-0 flex-1">
        {/* padding bawah besar di HP: memberi ruang untuk bottom nav + FAB */}
        <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-safe md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toaster />
      <ConfirmHost />
      <MigrationPrompt />
    </div>
  )
}
