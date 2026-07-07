import { useEffect, useState } from 'react'
import { getDownloadURL, ref } from 'firebase/storage'
import { useTranslation } from 'react-i18next'
import { storage } from '@/lib/firebase'
import { isPending, onQueueChange } from '@/lib/uploadQueue'

/**
 * Фото из Firebase Storage по пути. Если фото ещё в локальной очереди
 * (нет сети) — показывает индикатор «загружается».
 */
export function StoragePhoto({ path, className = '' }: { path: string | null; className?: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [queued, setQueued] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!path) return
    let alive = true

    async function resolve() {
      if (await isPending(path!)) {
        if (alive) setQueued(true)
        return
      }
      try {
        const u = await getDownloadURL(ref(storage, path!))
        if (alive) {
          setUrl(u)
          setQueued(false)
          setFailed(false)
        }
      } catch {
        if (alive) setFailed(true)
      }
    }

    void resolve()
    const unsub = onQueueChange(() => void resolve())
    return () => {
      alive = false
      unsub()
    }
  }, [path])

  if (!path) {
    return (
      <div className={`flex items-center justify-center bg-mist text-sm text-slate ${className}`}>
        {t('admin.noPhoto')}
      </div>
    )
  }
  if (url) return <img src={url} alt="" className={`object-cover ${className}`} loading="lazy" />
  return (
    <div className={`roof-stripes flex items-center justify-center bg-mist/60 px-3 text-center text-xs font-medium text-slate ${className}`}>
      {queued ? t('common.photoQueued') : failed ? t('common.photoUploading') : '…'}
    </div>
  )
}
