import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './context/AuthContext'
import { FullScreenLoader } from './components/ui'
import { AppShell, Icons, type NavItem } from './components/AppShell'
import { AuthPage } from './pages/AuthPage'
import { PendingPage } from './pages/PendingPage'
import { TodayPage } from './pages/worker/TodayPage'
import { HistoryPage } from './pages/worker/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { RequestsPage } from './pages/admin/RequestsPage'
import { BoardPage } from './pages/admin/BoardPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { WorkersPage } from './pages/admin/WorkersPage'
import { ObjectsPage } from './pages/admin/ObjectsPage'
import { usePendingRequests } from './pages/admin/usePendingRequests'

export default function App() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const prevUid = useRef<string | null>(null)

  // При каждом новом входе открываем первую вкладку («Сьогодні» / «Зараз»),
  // а не ту, что оставалась в URL от прошлой сессии.
  useEffect(() => {
    const uid = user?.uid ?? null
    if (uid && uid !== prevUid.current) navigate('/', { replace: true })
    prevUid.current = uid
  }, [user, navigate])

  if (loading) return <FullScreenLoader />
  if (!user) return <AuthPage />
  // Профиль ещё не создан (редкий случай гонки при регистрации) или ждёт/заблокирован
  if (!profile || profile.status !== 'active') return <PendingPage />

  return profile.role === 'admin' ? <AdminApp /> : <WorkerApp />
}

function WorkerApp() {
  const { t } = useTranslation()
  const nav: NavItem[] = [
    { to: '/', label: t('nav.today'), icon: Icons.today },
    { to: '/history', label: t('nav.history'), icon: Icons.history },
    { to: '/settings', label: t('nav.settings'), icon: Icons.settings },
  ]
  return (
    <AppShell nav={nav}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

function AdminApp() {
  const { t } = useTranslation()
  const pending = usePendingRequests()
  const nav: NavItem[] = [
    { to: '/', label: t('nav.board'), icon: Icons.board },
    { to: '/reports', label: t('nav.reports'), icon: Icons.reports },
    { to: '/requests', label: t('nav.requests'), icon: Icons.requests, badge: pending.length },
    { to: '/workers', label: t('nav.workers'), icon: Icons.workers },
    { to: '/settings', label: t('nav.settings'), icon: Icons.settings },
  ]
  return (
    <AppShell nav={nav}>
      <Routes>
        <Route path="/" element={<BoardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/objects" element={<ObjectsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
