import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { addObject, deleteObject, renameObject, watchObjects, type SiteObject } from '@/lib/objects'
import { Button, Card, EmptyState, Spinner } from '@/components/ui'

export function ObjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [objects, setObjects] = useState<SiteObject[] | null>(null)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => watchObjects(setObjects), [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addObject(name)
      setName('')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(id: string) {
    if (editName.trim()) await renameObject(id, editName)
    setEditingId(null)
  }

  async function remove(o: SiteObject) {
    if (!confirm(t('admin.deleteObjectConfirm', { name: o.name }))) return
    await deleteObject(o.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-card text-slate active:bg-mist"
          aria-label={t('common.back')}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-display text-lg font-bold">{t('admin.objectsTitle')}</h1>
      </div>

      <Card className="p-4">
        <form onSubmit={add} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.objectFieldLabel')}
            className="min-w-0 flex-1 min-h-12 rounded-2xl border-2 border-mist bg-white px-4 text-ink outline-none placeholder:text-slate/50 focus:border-brand"
          />
          <Button type="submit" disabled={busy || !name.trim()} className="shrink-0">
            {busy ? <Spinner className="text-white" /> : t('admin.addObject')}
          </Button>
        </form>
      </Card>

      {!objects ? (
        <div className="flex justify-center pt-10">
          <Spinner className="size-8" />
        </div>
      ) : objects.length === 0 ? (
        <EmptyState text={t('admin.objectsEmpty')} />
      ) : (
        objects.map((o) => (
          <Card key={o.id} className="animate-rise flex items-center gap-3 px-4 py-3">
            {editingId === o.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="min-w-0 flex-1 min-h-11 rounded-xl border-2 border-brand bg-white px-3 text-ink outline-none"
                />
                <button type="button" onClick={() => void saveEdit(o.id)} className="shrink-0 font-bold text-brand-dark">
                  {t('common.save')}
                </button>
              </>
            ) : (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-mint text-brand-deep">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" />
                    <circle cx="12" cy="11" r="2" />
                  </svg>
                </span>
                <p className="min-w-0 flex-1 truncate font-medium text-ink">{o.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(o.id)
                    setEditName(o.name)
                  }}
                  className="shrink-0 p-1 text-slate active:text-brand-dark"
                  aria-label={t('common.edit')}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.5V20Z" />
                    <path d="M14 6.5l3.5 3.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => void remove(o)}
                  className="shrink-0 p-1 text-danger/70 active:text-danger"
                  aria-label={t('common.delete')}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </>
            )}
          </Card>
        ))
      )}
    </div>
  )
}
