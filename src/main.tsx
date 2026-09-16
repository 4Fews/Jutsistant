import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { initTheme } from '@/lib/theme'
import { initAuth } from '@/lib/authStore'
import { initSync } from '@/lib/syncEngine'
import { seedIfFirstRun } from '@/lib/seed'
import './styles/theme.css'

initTheme()
initAuth()
initSync()

// Isi data contoh hanya saat benar-benar pertama kali dibuka.
void seedIfFirstRun()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
