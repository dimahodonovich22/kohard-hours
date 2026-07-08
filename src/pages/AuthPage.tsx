import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/context/AuthContext'
import { demoAuth, isDemo } from '@/lib/demo'
import { Button, Card, Field, Spinner } from '@/components/ui'
import { LangSwitch } from '@/components/LangSwitch'

type Mode = 'login' | 'register'

export function AuthPage() {
  const { t } = useTranslation()
  const { login, register, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function authError(e: unknown): string {
    if (e instanceof FirebaseError) {
      if (e.code === 'auth/email-already-in-use') return t('auth.emailInUse')
      if (e.code === 'auth/invalid-email') return t('auth.emailInvalid')
      if (e.code === 'auth/weak-password') return t('auth.passwordShort')
      if (
        e.code === 'auth/invalid-credential' ||
        e.code === 'auth/user-not-found' ||
        e.code === 'auth/wrong-password'
      )
        return t('auth.loginError')
    }
    return t('common.error')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (mode === 'register') {
      if (password.length < 6) return setError(t('auth.passwordShort'))
      if (password !== password2) return setError(t('auth.passwordMismatch'))
    }
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, phone, password)
    } catch (err) {
      setError(authError(err))
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    setError('')
    setInfo('')
    if (!email) return setError(t('auth.emailInvalid'))
    try {
      await resetPassword(email)
      setInfo(t('auth.resetSent', { email }))
    } catch (err) {
      setError(authError(err))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      {/* Фирменная тёмная зона с логотипом */}
      <div className="roof-stripes-strong flex flex-col items-center gap-3 px-6 pb-10 pt-safe">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="KOHARD" className="mt-12 h-12 w-auto animate-rise" />
        <p className="animate-rise-1 font-display text-xs font-medium uppercase tracking-[0.22em] text-mint">
          {t('app.tagline')}
        </p>
      </div>

      <div className="flex-1 rounded-t-[2rem] bg-paper px-4 pb-10 pt-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-5 flex justify-center">
            <LangSwitch />
          </div>

          {isDemo && (
            <Card className="mb-5 animate-rise-1 border-2 border-dashed border-brand/40 p-4">
              <p className="mb-3 text-center text-sm font-semibold text-brand-dark">
                DEMO — {t('auth.login')}:
              </p>
              <div className="flex flex-col gap-2.5">
                <Button onClick={() => demoAuth.loginAs(demoAuth.quickLogins.admin)} className="w-full">
                  👑 {t('auth.demoOwner')}
                </Button>
                <Button variant="secondary" onClick={() => demoAuth.loginAs(demoAuth.quickLogins.ivan)} className="w-full">
                  👷 {t('auth.demoWorker')}
                </Button>
              </div>
            </Card>
          )}

          <Card className="animate-rise-2 p-5">
            <h1 className="mb-4 font-display text-lg font-bold text-ink">
              {mode === 'login' ? t('auth.login') : t('auth.registerTitle')}
            </h1>

            <form onSubmit={submit} className="flex flex-col gap-3.5">
              {mode === 'register' && (
                <>
                  <Field
                    label={t('auth.name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                  <Field
                    label={t('auth.phone')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    autoComplete="tel"
                    required
                  />
                </>
              )}
              <Field
                label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
              <Field
                label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {mode === 'register' && (
                <Field
                  label={t('auth.passwordRepeat')}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                />
              )}

              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              {info && <p className="text-sm font-semibold text-brand-dark">{info}</p>}

              <Button type="submit" big disabled={busy} className="mt-1">
                {busy ? <Spinner className="text-white" /> : mode === 'login' ? t('auth.login') : t('auth.register')}
              </Button>
            </form>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => void forgot()}
                className="mt-4 block w-full text-center text-sm font-semibold text-slate underline-offset-2 active:underline"
              >
                {t('auth.forgotPassword')}
              </button>
            )}
          </Card>

          <p className="animate-rise-3 mt-5 text-center text-slate">
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <button
              type="button"
              className="font-bold text-brand-dark"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError('')
                setInfo('')
              }}
            >
              {mode === 'login' ? t('auth.register') : t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
