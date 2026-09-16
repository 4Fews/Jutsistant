import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'
import { signIn, useAuth } from '@/lib/authStore'

/**
 * Hanya form "Masuk" — sengaja tidak ada tautan daftar. Akun dibuat manual
 * lewat Supabase Dashboard, sesuai permintaan (satu pengguna, tanpa pendaftaran publik).
 */
export function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  // sudah login (mis. buka /masuk lewat URL langsung) → tidak perlu di sini
  useEffect(() => {
    if (auth.status === 'signed-in') navigate('/tugas', { replace: true })
  }, [auth.status, navigate])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Isi email dan password.')
      return
    }
    setSubmitting(true)
    setError(undefined)
    const err = await signIn(email.trim(), password)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    toast('Berhasil masuk')
    navigate('/tugas', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center py-10">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LogIn size={26} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Masuk</h1>
        <p className="mt-1 text-[14px] text-ink-2">Supaya data Semesta tersinkron ke semua perangkat Anda.</p>
      </div>

      <form onSubmit={submit} className="rounded-card border border-line bg-surface p-5" noValidate>
        <Field label="Email">
          {(id) => (
            <TextInput
              id={id}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(undefined)
              }}
              autoComplete="email"
              autoFocus
              placeholder="nama@email.com"
            />
          )}
        </Field>

        <Field label="Password" error={error}>
          {(id) => (
            <TextInput
              id={id}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(undefined)
              }}
              autoComplete="current-password"
            />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" block disabled={submitting} className="mt-2">
          {submitting ? 'Masuk…' : 'Masuk'}
        </Button>
      </form>

      <p className="mt-5 text-center text-[12px] text-ink-3">
        Belum bisa masuk? Akun dibuat manual lewat Supabase Dashboard, bukan lewat halaman ini.
      </p>
    </div>
  )
}
