export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Data contoh memakai awalan ini agar bisa dihapus tanpa menyentuh data asli. */
export const DEMO_PREFIX = 'demo-'

export function isDemo(id: string): boolean {
  return id.startsWith(DEMO_PREFIX)
}
