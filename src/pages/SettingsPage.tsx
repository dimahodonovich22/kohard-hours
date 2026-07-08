import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, SectionTitle } from '@/components/ui'
import { LangSwitch } from '@/components/LangSwitch'

export function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, logout, resetPassword } = useAuth()
  const [resetInfo, setResetInfo] = useState('')

  async function changePassword() {
    if (!profile?.email) return
    await resetPassword(profile.email)
    setResetInfo(t('auth.resetSent', { email: profile.email }))
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold">{t('settings.title')}</h1>

      <Card className="animate-rise p-5">
        <p className="font-display text-lg font-bold text-ink">{profile?.name}</p>
        <p className="mt-0.5 text-sm text-slate">{profile?.email}</p>
        {profile?.phone && <p className="text-sm text-slate">{profile.phone}</p>}
      </Card>

      {profile?.role === 'admin' && (
        <>
          <SectionTitle>{t('settings.objectsSection')}</SectionTitle>
          <button type="button" onClick={() => navigate('/objects')} className="w-full text-left">
            <Card className="flex items-center justify-between px-5 py-4 transition-colors active:bg-mist">
              <span className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-mint text-brand-deep">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" />
                    <circle cx="12" cy="11" r="2" />
                  </svg>
                </span>
                <span className="font-semibold text-ink">{t('settings.manageObjects')}</span>
              </span>
              <svg viewBox="0 0 24 24" className="size-5 text-slate/60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Card>
          </button>
        </>
      )}

      <SectionTitle>{t('settings.language')}</SectionTitle>
      <LangSwitch className="self-start" />

      <SectionTitle>{t('auth.password')}</SectionTitle>
      <Card className="p-4">
        <Button variant="secondary" className="w-full" onClick={() => void changePassword()}>
          {t('settings.changePassword')}
        </Button>
        {resetInfo && <p className="mt-3 text-center text-sm font-semibold text-brand-dark">{resetInfo}</p>}
      </Card>

      <SectionTitle>{t('settings.installTitle')}</SectionTitle>
      <Card className="roof-stripes p-5">
        <p className="text-sm text-slate">{t('settings.installText')}</p>
      </Card>

      <Button variant="danger" className="mt-2" onClick={() => void logout()}>
        {t('auth.logout')}
      </Button>

      <p className="pb-2 text-center text-xs text-slate/60">
        KOHARD · {t('settings.version')} 1.0.0
      </p>
    </div>
  )
}
