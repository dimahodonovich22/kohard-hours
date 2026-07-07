import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { monthRange, shiftAnchor, weekRange } from '@/lib/dates'

export type PeriodUnit = 'week' | 'month' | 'custom'

export interface PeriodState {
  unit: PeriodUnit
  setUnit: (u: PeriodUnit) => void
  anchor: Date
  move: (dir: -1 | 1) => void
  range: { start: string; end: string }
  label: string
  /** Произвольный диапазон дат (режим «Период») */
  setCustom: (start: string, end: string) => void
  /** Перейти к неделе, содержащей указанную дату */
  jumpToDate: (dateKey: string) => void
  /** Перейти к конкретному месяцу */
  setMonth: (year: number, monthIndex: number) => void
}

const dmy = (key: string) => key.split('-').reverse().slice(0, 2).join('.')
const localeOf = (lang: string) => (lang === 'ua' ? 'uk' : 'ru')

export function usePeriod(): PeriodState {
  const { i18n } = useTranslation()
  const [unit, setUnit] = useState<PeriodUnit>('week')
  const [anchor, setAnchor] = useState(new Date())
  const [custom, setCustomRange] = useState<{ start: string; end: string }>(() => weekRange(new Date()))

  const range = useMemo(() => {
    if (unit === 'week') return weekRange(anchor)
    if (unit === 'month') return monthRange(anchor)
    return custom
  }, [unit, anchor, custom])

  const label =
    unit === 'month'
      ? `${anchor.toLocaleDateString(localeOf(i18n.language), { month: 'long' })} ${anchor.getFullYear()}`
      : `${dmy(range.start)} – ${dmy(range.end)}`

  return {
    unit,
    setUnit,
    anchor,
    move: (dir) => setAnchor((a) => shiftAnchor(a, unit === 'month' ? 'month' : 'week', dir)),
    range,
    label,
    setCustom: (s, e) => setCustomRange(s <= e ? { start: s, end: e } : { start: e, end: s }),
    jumpToDate: (key) => setAnchor(new Date(key + 'T00:00:00')),
    setMonth: (year, month) => setAnchor(new Date(year, month, 1)),
  }
}

export function PeriodPicker({ period }: { period: PeriodState }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const segments: PeriodUnit[] = ['week', 'month', 'custom']

  return (
    <div className="flex flex-col gap-2.5">
      {/* Три режима: тиждень / місяць / період */}
      <div className="inline-flex self-start rounded-2xl bg-mist p-1">
        {segments.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => {
              period.setUnit(u)
              setOpen(false)
            }}
            className={`min-h-10 rounded-xl px-4 text-sm font-bold transition-colors ${
              period.unit === u ? 'bg-white text-ink shadow-card' : 'text-slate'
            }`}
          >
            {u === 'week' ? t('history.week') : u === 'month' ? t('history.month') : t('history.custom')}
          </button>
        ))}
      </div>

      {period.unit === 'custom' ? (
        <div className="flex gap-3 rounded-2xl bg-white px-3 py-3 shadow-card">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate">{t('admin.from')}</span>
            <input
              type="date"
              value={period.range.start}
              max={period.range.end}
              onChange={(e) => e.target.value && period.setCustom(e.target.value, period.range.end)}
              className="w-full min-h-12 rounded-xl border-2 border-mist bg-white px-2 text-center font-display text-sm font-medium text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate">{t('admin.to')}</span>
            <input
              type="date"
              value={period.range.end}
              min={period.range.start}
              onChange={(e) => e.target.value && period.setCustom(period.range.start, e.target.value)}
              className="w-full min-h-12 rounded-xl border-2 border-mist bg-white px-2 text-center font-display text-sm font-medium text-ink outline-none focus:border-brand"
            />
          </label>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center justify-between rounded-2xl bg-white px-2 py-1.5 shadow-card">
            <button
              type="button"
              onClick={() => period.move(-1)}
              className="flex size-11 items-center justify-center rounded-xl text-slate active:bg-mist"
              aria-label="prev"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 font-display font-bold capitalize text-ink active:bg-mist"
            >
              {period.label}
              <svg viewBox="0 0 24 24" className={`size-4 text-slate transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => period.move(1)}
              className="flex size-11 items-center justify-center rounded-xl text-slate active:bg-mist"
              aria-label="next"
            >
              <Chevron dir="right" />
            </button>
          </div>

          {open && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                aria-label="close"
                onClick={() => setOpen(false)}
              />
              <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl bg-white p-4 shadow-lift">
                {period.unit === 'month' ? (
                  <MonthGrid period={period} lang={i18n.language} onDone={() => setOpen(false)} />
                ) : (
                  <WeekJump period={period} onDone={() => setOpen(false)} />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MonthGrid({ period, lang, onDone }: { period: PeriodState; lang: string; onDone: () => void }) {
  const [year, setYear] = useState(period.anchor.getFullYear())
  const selY = period.anchor.getFullYear()
  const selM = period.anchor.getMonth()
  const names = Array.from({ length: 12 }, (_, i) =>
    new Date(2020, i, 1).toLocaleDateString(localeOf(lang), { month: 'short' }).replace('.', ''),
  )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setYear((y) => y - 1)} className="flex size-10 items-center justify-center rounded-xl text-slate active:bg-mist">
          <Chevron dir="left" />
        </button>
        <span className="font-display text-lg font-bold text-ink">{year}</span>
        <button type="button" onClick={() => setYear((y) => y + 1)} className="flex size-10 items-center justify-center rounded-xl text-slate active:bg-mist">
          <Chevron dir="right" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {names.map((name, i) => {
          const active = year === selY && i === selM
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                period.setMonth(year, i)
                onDone()
              }}
              className={`min-h-12 rounded-xl text-sm font-bold capitalize transition-colors ${
                active ? 'bg-brand text-white' : 'bg-mist/60 text-ink active:bg-mint'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeekJump({ period, onDone }: { period: PeriodState; onDone: () => void }) {
  const { t } = useTranslation()
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate">{t('history.pickDate')}</span>
      <input
        type="date"
        defaultValue={period.range.start}
        onChange={(e) => {
          if (e.target.value) {
            period.jumpToDate(e.target.value)
            onDone()
          }
        }}
        className="w-full min-h-12 rounded-xl border-2 border-mist bg-white px-3 text-center font-display font-medium text-ink outline-none focus:border-brand"
      />
    </label>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}
