import { BookOpen, ListChecks, NotebookPen, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

// Hanya halaman yang benar-benar sudah jadi. Tahap berikutnya
// (Hari Ini, Agenda, Fokus) tinggal menambah entri di sini.
export const NAV_ITEMS: NavItem[] = [
  { to: '/tugas', label: 'Tugas', icon: ListChecks },
  { to: '/catatan', label: 'Catatan', icon: NotebookPen },
  { to: '/mata-kuliah', label: 'Mata Kuliah', icon: BookOpen },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
]
