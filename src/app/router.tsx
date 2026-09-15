import { Suspense, lazy } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { TasksPage } from '@/pages/TasksPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { NotesPage } from '@/pages/NotesPage'
import { SettingsPage } from '@/pages/SettingsPage'

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
  {
    path: '/',
    element: <AppShell />,
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
