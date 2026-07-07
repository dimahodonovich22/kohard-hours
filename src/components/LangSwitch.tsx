import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import type { Lang } from '@/i18n'

const langs: { code: Lang; label: string }[] = [
  { code: 'ua', label: 'УКР' },
  { code: 'ru', label: 'РУС' },
]

export function LangSwitch({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation()
  const { changeLanguage } = useAuth()

  return (
    <div className={`inline-flex rounded-2xl bg-mist p-1 ${className}`}>
      {langs.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => changeLanguage(l.code)}
          className={`min-h-11 rounded-xl px-5 text-sm font-bold tracking-wide transition-colors ${
            i18n.language === l.code ? 'bg-ink text-white shadow-card' : 'text-slate'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
