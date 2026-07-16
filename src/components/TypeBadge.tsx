import { useTranslation } from 'react-i18next'
import type { WorkType } from '@/lib/types'

/** Яркий бейдж типа работы: зелёный «Погодинно» с часами / персиковый «Проект» с коробкой */
export function TypeBadge({ type }: { type: WorkType }) {
  const { t } = useTranslation()
  const project = type === 'project'
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        project ? 'bg-peach text-ink' : 'bg-brand text-white'
      }`}
    >
      {project ? (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
          <path d="M4 8.5 12 13l8-4.5M12 13v7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      )}
      {project ? t('shift.project') : t('shift.hourly')}
    </span>
  )
}
