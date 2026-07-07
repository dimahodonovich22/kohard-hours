import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, SectionTitle } from '@/components/ui'
import { LangSwitch } from '@/components/LangSwitch'

export function SettingsPage() {
  const { t } = useTranslation()
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
