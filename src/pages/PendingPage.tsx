import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { Button, Card } from '@/components/ui'
import { LangSwitch } from '@/components/LangSwitch'

/** Экран ожидания подтверждения / блокировки */
export function PendingPage() {
  const { t } = useTranslation()
  const { profile, logout } = useAuth()
  const blocked = profile?.status === 'blocked'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ink px-6 pt-safe pb-safe">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="KOHARD" className="h-10 w-auto" />
      <Card className="w-full max-w-md animate-rise p-6 text-center">
        <div
          className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl ${
            blocked ? 'bg-danger/10' : 'bg-mint'
          }`}
        >
          {blocked ? (
            <svg viewBox="0 0 24 24" className="size-8 text-danger" fill="none" stroke="currentColor" strokeWidth="1.9">
              <circle cx="12" cy="12" r="9" />
              <path d="M5.7 5.7l12.6 12.6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-8 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="1.9">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          )}
        </div>
        <h1 className="mb-2 font-display text-lg font-bold text-ink">
          {blocked ? t('auth.blockedTitle') : t('auth.pendingTitle')}
        </h1>
        <p className="text-slate">{blocked ? t('auth.blockedText') : t('auth.pendingText')}</p>
        <Button variant="secondary" className="mt-6 w-full" onClick={() => void logout()}>
          {t('auth.logout')}
        </Button>
      </Card>
      <LangSwitch />
    </div>
  )
}
