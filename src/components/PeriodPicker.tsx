import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { monthRange, shiftAnchor, weekRange } from '@/lib/dates'

export type PeriodUnit = 'week' | 'month'

export interface PeriodState {
  unit: PeriodUnit
  setUnit: (u: PeriodUnit) => void
  anchor: Date
  move: (dir: -1 | 1) => void
  range: { start: string; end: string }
  label: string
}

export function usePeriod(): PeriodState {
  const [unit, setUnit] = useState<PeriodUnit>('week')
  const [anchor, setAnchor] = useState(new Date())

  const range = useMemo(
    () => (unit === 'week' ? weekRange(anchor) : monthRange(anchor)),
    [unit, anchor],
  )

  const label =
    unit === 'week'
      ? `${range.start.split('-').reverse().slice(0, 2).join('.')} – ${range.end.split('-').reverse().slice(0, 2).join('.')}`
      : format(anchor, 'MM.yyyy')

  return {
    unit,
    setUnit,
    anchor,
    move: (dir) => setAnchor((a) => shiftAnchor(a, unit, dir)),
    range,
    label,
  }
}

export function PeriodPicker({ period }: { period: PeriodState }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2.5">
      <div className="inline-flex self-start rounded-2xl bg-mist p-1">
        {(['week', 'month'] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => period.setUnit(u)}
            className={`min-h-10 rounded-xl px-5 text-sm font-bold transition-colors ${
              period.unit === u ? 'bg-white text-ink shadow-card' : 'text-slate'
            }`}
          >
            {u === 'week' ? t('history.week') : t('history.month')}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white px-2 py-1.5 shadow-card">
        <button
          type="button"
          onClick={() => period.move(-1)}
          className="flex size-11 items-center justify-center rounded-xl text-slate active:bg-mist"
          aria-label="prev"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="font-display font-bold text-ink">{period.label}</span>
        <button
          type="button"
          onClick={() => period.move(1)}
          className="flex size-11 items-center justify-center rounded-xl text-slate active:bg-mist"
          aria-label="next"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
