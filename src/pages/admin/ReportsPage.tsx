import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { watchAllShifts } from '@/lib/shifts'
import { formatMoney, shiftEarnings, travelMinutes, workedMinutes, type Shift } from '@/lib/types'
import { useDuration } from '@/lib/useDuration'
import { humanDate } from '@/lib/dates'
import { Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui'
import { PeriodPicker, usePeriod } from '@/components/PeriodPicker'
import { TypeBadge } from '@/components/TypeBadge'
import { summarize, type WorkerSummary } from '@/reports/data'
import { ShiftDetailsModal } from './ShiftDetailsModal'

export function ReportsPage() {
  const { t } = useTranslation()
  const fmt = useDuration()
  const period = usePeriod()
  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [openWorker, setOpenWorker] = useState<string | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  useEffect(() => {
    setShifts(null)
    return watchAllShifts(period.range.start, period.range.end, setShifts)
  }, [period.range.start, period.range.end])

  const summaries = useMemo(() => summarize(shifts ?? []), [shifts])
  const dayNames = t('days', { returnObjects: true }) as Record<string, string>
  const periodLabel = `${period.range.start} – ${period.range.end}`

  async function doExport(kind: 'pdf' | 'xlsx') {
    setExporting(kind)
    try {
      if (kind === 'pdf') {
        const { exportPdf } = await import('@/reports/pdf')
        await exportPdf(summaries, periodLabel, t)
      } else {
        const { exportXlsx } = await import('@/reports/xlsx')
        exportXlsx(summaries, periodLabel, t)
      }
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold">{t('admin.reportsTitle')}</h1>
      <PeriodPicker period={period} />

      {!shifts ? (
        <div className="flex justify-center pt-12">
          <Spinner className="size-8" />
        </div>
      ) : summaries.length === 0 ? (
        <EmptyState text={t('admin.noData')} />
      ) : (
        <>
          <div className="flex gap-3">
            <Button variant="dark" className="flex-1" disabled={exporting !== null} onClick={() => void doExport('pdf')}>
              {exporting === 'pdf' ? <Spinner className="text-white" /> : `⤓ ${t('admin.exportPdf')}`}
            </Button>
            <Button variant="secondary" className="flex-[1.6]" disabled={exporting !== null} onClick={() => void doExport('xlsx')}>
              {exporting === 'xlsx' ? <Spinner /> : `⤓ ${t('admin.exportXlsx')}`}
            </Button>
          </div>

          <SectionTitle>{t('admin.worker')}</SectionTitle>

          {summaries.map((s) => (
            <WorkerRow
              key={s.userId}
              summary={s}
              expanded={openWorker === s.userId}
              onToggle={() => setOpenWorker(openWorker === s.userId ? null : s.userId)}
              onShift={setSelectedShift}
              dayNames={dayNames}
            />
          ))}

          <Card className="flex items-center justify-between bg-ink px-5 py-4">
            <span className="font-semibold text-mint">{t('common.total')}</span>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xl font-bold text-white">
                {fmt(summaries.reduce((a, s) => a + s.workMin + s.travelMin, 0))}
              </span>
              <span className="font-display text-xl font-bold text-mint">
                {formatMoney(summaries.reduce((a, s) => a + s.earnings, 0))}
              </span>
            </div>
          </Card>
        </>
      )}

      {selectedShift && <ShiftDetailsModal shift={selectedShift} onClose={() => setSelectedShift(null)} />}
    </div>
  )
}

function WorkerRow({
  summary,
  expanded,
  onToggle,
  onShift,
  dayNames,
}: {
  summary: WorkerSummary
  expanded: boolean
  onToggle: () => void
  onShift: (s: Shift) => void
  dayNames: Record<string, string>
}) {
  const { t } = useTranslation()
  const fmt = useDuration()
  const hasHours = summary.workMin + summary.travelMin > 0
  const hasHourly = summary.shifts.some((s) => s.workType !== 'project')
  const hasProject = summary.shifts.some((s) => s.workType === 'project')
  return (
    <Card className="animate-rise overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display font-bold text-ink">{summary.userName}</p>
            {hasHourly && <TypeBadge type="hourly" />}
            {hasProject && <TypeBadge type="project" />}
          </div>
          <p className="mt-1 text-sm text-slate">
            {summary.days} {t('admin.days').toLowerCase()}
            {hasHours
              ? ` · ${t('admin.workH').toLowerCase()} ${fmt(summary.workMin)}${
                  summary.travelMin > 0 ? ` · ${t('admin.travelH').toLowerCase()} ${fmt(summary.travelMin)}` : ''
                }`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            {hasHours ? (
              <>
                <span className="font-display text-lg font-bold text-brand-dark">
                  {fmt(summary.workMin + summary.travelMin)}
                </span>
                {summary.earnings > 0 && (
                  <span className="text-sm font-semibold text-slate">{formatMoney(summary.earnings)}</span>
                )}
              </>
            ) : (
              <span className="font-display text-lg font-bold text-brand-dark">{formatMoney(summary.earnings)}</span>
            )}
          </div>
          <svg
            viewBox="0 0 24 24"
            className={`size-5 text-slate transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-mist">
          {summary.shifts.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onShift(s)}
              className="flex w-full items-center justify-between border-b border-mist/60 px-5 py-3 text-left last:border-0 active:bg-mint/30"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {humanDate(s.date, dayNames)}
                  {s.editedByAdmin && <span className="ml-1.5 text-peach">⚠</span>}
                </p>
                <p className="truncate text-sm text-slate">
                  {s.objectName} · {s.arrivalTime}–{s.departureTime ?? '…'}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 flex-col items-end">
                {s.workType === 'project' ? (
                  <>
                    <span className="text-xs font-semibold text-peach">{t('shift.project')}</span>
                    {shiftEarnings(s) > 0 && (
                      <span className="font-display font-bold text-brand-dark">{formatMoney(shiftEarnings(s))}</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-display font-bold text-brand-dark">{fmt(workedMinutes(s))}</span>
                    {s.hourlyRate > 0 && (
                      <span className="text-xs font-semibold text-slate">{formatMoney(shiftEarnings(s))}</span>
                    )}
                    {travelMinutes(s) > 0 && (
                      <span className="text-xs text-slate">+{fmt(travelMinutes(s))} {t('admin.travelH').toLowerCase()}</span>
                    )}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
