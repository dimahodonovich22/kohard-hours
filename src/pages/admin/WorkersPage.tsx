import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FirebaseError } from 'firebase/app'
import { adminCreateWorker } from '@/lib/adminUsers'
import { Button, Card, Chip, Field, Spinner } from '@/components/ui'
import { useAllUsers } from './usePendingRequests'
import type { Lang } from '@/i18n'

export function WorkersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const users = useAllUsers()
  const [creating, setCreating] = useState(false)

  if (!users) {
    return (
      <div className="flex justify-center pt-20">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-lg font-bold">{t('admin.workersTitle')}</h1>
        <Button onClick={() => setCreating(true)} className="shrink-0">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('admin.createWorker')}
        </Button>
      </div>

      {users.map((u) => {
        const statusChip =
          u.role === 'admin' ? (
            <Chip tone="brand">{t('admin.adminRole')}</Chip>
          ) : u.status === 'blocked' ? (
            <Chip tone="danger">{t('admin.blocked')}</Chip>
          ) : u.status === 'pending' ? (
            <Chip tone="peach">{t('admin.pending')}</Chip>
          ) : (
            <Chip tone="mint">{t('admin.active')}</Chip>
          )

        // Работника можно открыть — история с фильтрами; админа нет
        if (u.role === 'admin') {
          return (
            <Card key={u.uid} className="animate-rise flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{u.name}</p>
                <p className="truncate text-sm text-slate">{u.email}</p>
              </div>
              {statusChip}
            </Card>
          )
        }

        return (
          <button key={u.uid} type="button" onClick={() => navigate(`/workers/${u.uid}`)} className="w-full text-left">
            <Card className="animate-rise flex items-center justify-between gap-3 px-5 py-4 transition-colors active:bg-mint/30">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{u.name}</p>
                <p className="truncate text-sm text-slate">{u.email}</p>
                {u.phone && <p className="truncate text-sm text-slate">{u.phone}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {statusChip}
                <svg viewBox="0 0 24 24" className="size-5 text-slate/60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          </button>
        )
      })}

      {creating && <CreateWorkerModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function CreateWorkerModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError(t('auth.passwordShort'))
    setBusy(true)
    try {
      await adminCreateWorker({
        name,
        email,
        phone,
        password,
        language: (i18n.language as Lang) || 'ua',
      })
      setDone(true)
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/email-already-in-use') setError(t('auth.emailInUse'))
        else if (err.code === 'auth/invalid-email') setError(t('auth.emailInvalid'))
        else if (err.code === 'auth/weak-password') setError(t('auth.passwordShort'))
        else setError(t('common.error'))
      } else {
        setError(t('common.error'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper pb-safe sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-brand px-5 py-4">
          <h2 className="font-display font-bold text-white">{t('admin.createWorker')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-white"
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-mint">
              <svg viewBox="0 0 24 24" className="size-9 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-ink">{t('admin.workerCreated')}</p>
            <Card className="w-full px-5 py-4 text-left">
              <p className="text-sm text-slate">{t('auth.email')}</p>
              <p className="mb-2 font-display font-bold text-ink">{email.trim().toLowerCase()}</p>
              <p className="text-sm text-slate">{t('auth.password')}</p>
              <p className="font-display font-bold text-ink">{password}</p>
            </Card>
            <Button onClick={onClose} big className="w-full">
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4 p-5">
            <p className="rounded-2xl bg-mint/50 px-4 py-3 text-sm text-brand-deep">{t('admin.createWorkerHint')}</p>
            <Field label={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} required />
            <Field label={t('auth.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            <Field
              label={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="off"
              required
            />
            <Field
              label={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              autoComplete="off"
              required
            />
            {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            <div className="mt-1 flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={busy} className="flex-[2]">
                {busy ? <Spinner className="text-white" /> : t('admin.createWorkerSubmit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
