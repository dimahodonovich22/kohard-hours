import { useTranslation } from 'react-i18next'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, Chip, Spinner } from '@/components/ui'
import { useAllUsers } from './usePendingRequests'
import type { UserProfile } from '@/lib/types'

export function WorkersPage() {
  const { t } = useTranslation()
  const users = useAllUsers()

  if (!users) {
    return (
      <div className="flex justify-center pt-20">
        <Spinner className="size-8" />
      </div>
    )
  }

  async function toggleBlock(u: UserProfile) {
    await updateDoc(doc(db, 'users', u.uid), {
      status: u.status === 'blocked' ? 'active' : 'blocked',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold">{t('admin.workersTitle')}</h1>
      {users.map((u) => (
        <Card key={u.uid} className="animate-rise flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{u.name}</p>
            <p className="truncate text-sm text-slate">{u.email}</p>
            {u.phone && (
              <a href={`tel:${u.phone}`} className="text-sm font-semibold text-brand-dark">
                {u.phone}
              </a>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {u.role === 'admin' ? (
              <Chip tone="brand">{t('admin.adminRole')}</Chip>
            ) : u.status === 'blocked' ? (
              <Chip tone="danger">{t('admin.blocked')}</Chip>
            ) : u.status === 'pending' ? (
              <Chip tone="peach">{t('admin.pending')}</Chip>
            ) : (
              <Chip tone="mint">{t('admin.active')}</Chip>
            )}
            {u.role !== 'admin' && u.status !== 'pending' && (
              <button
                type="button"
                onClick={() => void toggleBlock(u)}
                className={`text-sm font-bold ${u.status === 'blocked' ? 'text-brand-dark' : 'text-danger'}`}
              >
                {u.status === 'blocked' ? t('admin.unblock') : t('admin.block')}
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
