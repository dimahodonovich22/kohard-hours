import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { watchUserShifts } from '@/lib/shifts'
import { formatMoney, shiftEarnings, travelMinutes, workedMinutes, type Shift } from '@/lib/types'
import { useDuration } from '@/lib/useDuration'
import { humanDate } from '@/lib/dates'
import { Card, Chip, EmptyState, SectionTitle, Spinner } from '@/components/ui'
import { PeriodPicker, usePeriod } from '@/components/PeriodPicker'

export function HistoryPage() {
  const { t } = useTranslation()
  const fmt = useDuration()
  const { user } = useAuth()
  const period = usePeriod()
  const [shifts, setShifts] = useState<Shift[] | null>(null)

  useEffect(() => {
    if (!user) return
    setShifts(null)
    return watchUserShifts(user.uid, period.range.start, period.range.end, setShifts)
  }, [user, period.range.start, period.range.end])

  const byDate = useMemo(() => {
    const map = new Map<string, Shift[]>()
    for (const s of shifts ?? []) {
      map.set(s.date, [...(map.get(s.date) ?? []), s])
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [shifts])

  const totals = useMemo(() => {
    let work = 0
    let travel = 0
    let earned = 0
    for (const s of shifts ?? []) {
      work += workedMinutes(s)
      travel += travelMinutes(s)
      earned += shiftEarnings(s)
    }
    return { work, travel, earned: Math.round(earned * 100) / 100 }
  }, [shifts])

  const dayNames = t('days', { returnObjects: true }) as Record<string, string>

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold">{t('history.title')}</h1>
      <PeriodPicker period={period} />

      {!shifts ? (
        <div className="flex justify-center pt-12">
          <Spinner className="size-8" />
        </div>
      ) : shifts.length === 0 ? (
        <EmptyState text={t('history.empty')} />
      ) : (
        <>
          <Card className="animate-rise flex divide-x divide-mist">
            <div className="flex-1 px-3 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate">{t('history.worked')}</p>
              <p className="mt-1 font-display text-xl font-bold text-brand-dark">{fmt(totals.work)}</p>
            </div>
            <div className="flex-1 px-3 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate">{t('history.travel')}</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{fmt(totals.travel)}</p>
            </div>
            {totals.earned > 0 && (
              <div className="flex-1 px-3 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate">{t('history.earned')}</p>
                <p className="mt-1 font-display text-xl font-bold text-brand-dark">{formatMoney(totals.earned)}</p>
              </div>
            )}
          </Card>

          <SectionTitle>{t('nav.history')}</SectionTitle>
          {byDate.map(([date, items]) => (
            <Card key={date} className="animate-rise-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-mist px-5 py-2.5">
                <span className="font-semibold text-slate">{humanDate(date, dayNames)}</span>
                <span className="font-display font-bold text-brand-dark">
                  {fmt(items.reduce((a, s) => a + workedMinutes(s), 0))}
                </span>
              </div>
              {items.map((s) => (
                <div key={s.id} className="border-b border-mist/60 px-5 py-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-medium text-ink">{s.objectName}</p>
                      {s.workType === 'project' && <Chip tone="peach">{t('shift.project')}</Chip>}
                    </div>
                    {s.status === 'open' ? (
                      <Chip tone="brand">{t('shift.openShift')}</Chip>
                    ) : (
                      shiftEarnings(s) > 0 && (
                        <span className="shrink-0 text-sm font-semibold text-brand-dark">{formatMoney(shiftEarnings(s))}</span>
                      )
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate">
                    {s.arrivalTime} – {s.departureTime ?? '…'}
                    {s.workType !== 'project' &&
                      s.lunchMinutes > 0 &&
                      ` · ${t('history.lunch').toLowerCase()} ${s.lunchMinutes} ${t('common.minutes')}`}
                    {travelMinutes(s) > 0 && ` · ${t('history.travel').toLowerCase()} ${fmt(travelMinutes(s))}`}
                  </p>
                  {s.editedByAdmin && (
                    <p className="mt-1 text-xs font-medium text-peach">⚠ {t('shift.editedByAdmin')}</p>
                  )}
                </div>
              ))}
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
