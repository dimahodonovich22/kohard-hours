import { useTranslation } from 'react-i18next'
import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button, Card, EmptyState } from '@/components/ui'
import { usePendingRequests } from './usePendingRequests'
import type { UserProfile } from '@/lib/types'

export function RequestsPage() {
  const { t } = useTranslation()
  const pending = usePendingRequests()

  async function approve(u: UserProfile) {
    await updateDoc(doc(db, 'users', u.uid), { status: 'active' })
  }

  async function reject(u: UserProfile) {
    if (!confirm(t('admin.rejectConfirm', { name: u.name }))) return
    await deleteDoc(doc(db, 'users', u.uid))
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold">{t('admin.requestsTitle')}</h1>
      {pending.length === 0 ? (
        <EmptyState text={t('admin.requestsEmpty')} />
      ) : (
        pending.map((u) => (
          <Card key={u.uid} className="animate-rise p-5">
            <p className="font-display font-bold text-ink">{u.name}</p>
            <p className="mt-0.5 text-sm text-slate">{u.email}</p>
            {u.phone && (
              <a href={`tel:${u.phone}`} className="text-sm font-semibold text-brand-dark">
                {u.phone}
              </a>
            )}
            <div className="mt-4 flex gap-3">
              <Button variant="danger" className="flex-1" onClick={() => void reject(u)}>
                {t('admin.reject')}
              </Button>
              <Button className="flex-[2]" onClick={() => void approve(u)}>
                {t('admin.approve')}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
