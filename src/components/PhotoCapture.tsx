import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Живое фото: capture="environment" открывает камеру напрямую,
 * выбрать старое фото из галереи на телефоне нельзя.
 */
export function PhotoCapture({
  photo,
  onPhoto,
  error,
}: {
  photo: File | null
  onPhoto: (f: File | null) => void
  error?: string
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={preview} alt="" className="aspect-4/3 w-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-3 right-3 rounded-xl bg-ink/80 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur"
          >
            {t('shift.retakePhoto')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`roof-stripes flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors active:border-brand
            ${error ? 'border-danger/60' : 'border-slate/40'}`}
        >
          <svg viewBox="0 0 24 24" className="size-10 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 8h2.5l1.5-2.5h8L17.5 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <span className="font-semibold text-ink">{t('shift.takePhoto')}</span>
          <span className="max-w-56 text-center text-xs text-slate">{t('shift.photoHint')}</span>
        </button>
      )}
      {error && <p className="mt-1.5 text-sm font-medium text-danger">{error}</p>}
    </div>
  )
}
