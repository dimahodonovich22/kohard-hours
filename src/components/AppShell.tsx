import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { onQueueChange, pendingCount } from '@/lib/uploadQueue'

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function useQueueCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const refresh = () => void pendingCount().then(setCount)
    refresh()
    return onQueueChange(refresh)
  }, [])
  return count
}

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  badge?: number
}

export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const { t } = useTranslation()
  const online = useOnline()
  const queue = useQueueCount()

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Тёмная шапка KOHARD с мотивом крыш */}
      <header className="roof-stripes-strong sticky top-0 z-20 bg-ink pt-safe">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="KOHARD" className="h-7 w-auto" />
          <div className="flex items-center gap-2">
            {queue > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-peach/20 px-2.5 py-1 text-xs font-semibold text-peach">
                <span className="size-1.5 animate-pulse-dot rounded-full bg-peach" />
                {queue}
              </span>
            )}
            <span
              className={`size-2.5 rounded-full ${online ? 'bg-brand' : 'animate-pulse-dot bg-peach'}`}
              title={online ? 'online' : 'offline'}
            />
          </div>
        </div>
      </header>

      {!online && (
        <div className="bg-peach/90 px-4 py-2 text-center text-sm font-semibold text-ink">
          {t('common.offline')}
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">{children}</main>

      {/* Нижняя навигация — крупные зоны нажатия */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-white pb-safe">
        <div className="mx-auto flex max-w-2xl">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
                  isActive ? 'text-brand-dark' : 'text-slate'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-brand" />}
                  <span className="relative">
                    {item.icon}
                    {item.badge != null && item.badge > 0 && (
                      <span className="absolute -right-2.5 -top-1 flex size-4.5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

/* Иконки навигации */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const Icons = {
  today: (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 9.8V20h13V9.8" />
      <path d="M12 20v-5.5" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <circle cx="12" cy="6" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" />
    </svg>
  ),
  requests: (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M4 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
      <path d="M17.5 6.5v4M19.5 8.5h-4" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M4 20V9.5L12 4l8 5.5V20" />
      <path d="M9 20v-6h6v6" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  ),
  workers: (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.7-2.8 2.9-4.2 5.5-4.2s4.8 1.4 5.5 4.2" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15.5 14.9c2.3.1 4.3 1.4 5 3.9" />
    </svg>
  ),
}
