import { Suspense, lazy } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/app/RequireAuth'
import { TasksPage } from '@/pages/TasksPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { NotesPage } from '@/pages/NotesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'

// Editor catatan memuat TipTap yang cukup besar, jadi dipisah dari
// bundel utama dan baru diunduh saat sebuah catatan dibuka.
const NoteEditorPage = lazy(() =>
  import('@/pages/NoteEditorPage').then((m) => ({ default: m.NoteEditorPage })),
)

function EditorFallback() {
  return <div className="mt-6 h-60 animate-pulse rounded-card bg-surface-2" aria-hidden="true" />
}

// HashRouter dipakai supaya build yang sama jalan di Cloudflare Pages
// maupun GitHub Pages tanpa konfigurasi fallback SPA di sisi server.
export const router = createHashRouter([
  // Halaman masuk sengaja di luar AppShell: tanpa bottom nav/sidebar, supaya
  // tidak ada jalan memutar ke dalam aplikasi sebelum benar-benar masuk.
  { path: '/masuk', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/tugas" replace /> },
      { path: 'tugas', element: <TasksPage /> },
      { path: 'catatan', element: <NotesPage /> },
      {
        path: 'catatan/:id',
        element: (
          <Suspense fallback={<EditorFallback />}>
            <NoteEditorPage />
          </Suspense>
        ),
      },
      { path: 'mata-kuliah', element: <CoursesPage /> },
      { path: 'mata-kuliah/:id', element: <CourseDetailPage /> },
      { path: 'pengaturan', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/tugas" replace /> },
    ],
  },
])
