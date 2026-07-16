import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { demoDb, isDemo } from '@/lib/demo'
import { watchUserShifts } from '@/lib/shifts'
import {
  formatMoney,
  shiftEarnings,
  travelMinutes,
  workedMinutes,
  type Shift,
  type WorkType,
} from '@/lib/types'
import { useDuration } from '@/lib/useDuration'
import { humanDate } from '@/lib/dates'
import { Button, Card, Chip, EmptyState, SectionTitle, Spinner } from '@/components/ui'
import { PeriodPicker, usePeriod } from '@/components/PeriodPicker'
import { TypeBadge } from '@/components/TypeBadge'
import { summarize } from '@/reports/data'
import { useAllUsers } from './usePendingRequests'
import { ShiftDetailsModal } from './ShiftDetailsModal'

type TypeFilter = 'all' | WorkType

export function WorkerDetailPage() {
  const { t } = useTranslation()
  const fmt = useDuration()
  const navigate = useNavigate()
  const { uid } = useParams<{ uid: string }>()
  const users = useAllUsers()
  const period = usePeriod()

  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [typeF, setTypeF] = useState<TypeFilter>('all')
  const [objF, setObjF] = useState('all')
  const [selected, setSelected] = useState<Shift | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  const profile = users?.find((u) => u.uid === uid) ?? null

  useEffect(() => {
    if (!uid) return
    setShifts(null)
    return watchUserShifts(uid, period.range.start, period.range.end, setShifts)
  }, [uid, period.range.start, period.range.end])

  const objectOptions = useMemo(
    () => [...new Set((shifts ?? []).map((s) => s.objectName))].sort((a, b) => a.localeCompare(b)),
    [shifts],
  )
  const filtered = useMemo(
    () =>
      (shifts ?? []).filter(
        (s) => (typeF === 'all' || s.workType === typeF) && (objF === 'all' || s.objectName === objF),
      ),
    [shifts, typeF, objF],
  )

  const totals = useMemo(() => {
    let work = 0
    let travel = 0
    let earn = 0
    for (const s of filtered) {
      work += workedMinutes(s)
      travel += travelMinutes(s)
      earn += shiftEarnings(s)
    }
    return { work, travel, earn: Math.round(earn * 100) / 100, days: new Set(filtered.map((s) => s.date)).size }
  }, [filtered])

  const byDate = useMemo(() => {
    const map = new Map<string, Shift[]>()
    for (const s of filtered) map.set(s.date, [...(map.get(s.date) ?? []), s])
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const dayNames = t('days', { returnObjects: true }) as Record<string, string>
  const hasHourly = (shifts ?? []).some((s) => s.workType !== 'project')
  const hasProject = (shifts ?? []).some((s) => s.workType === 'project')

  async function doExport(kind: 'pdf' | 'xlsx') {
    setExporting(kind)
    try {
      const summaries = summarize(filtered)
      const label = `${profile?.name ?? ''} · ${period.range.start} – ${period.range.end}`
      if (kind === 'pdf') {
        const { exportPdf } = await import('@/reports/pdf')
        await exportPdf(summaries, label, t)
      } else {
        const { exportXlsx } = await import('@/reports/xlsx')
        exportXlsx(summaries, label, t)
      }
    } finally {
      setExporting(null)
    }
  }

  async function toggleBlock() {
    if (!profile) return
    const status = profile.status === 'blocked' ? 'active' : 'blocked'
    if (isDemo) return void demoDb.updateUser(profile.uid, { status })
    await updateDoc(doc(db, 'users', profile.uid), { status })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/workers')}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-card text-slate active:bg-mist"
          aria-label={t('common.back')}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold">{profile?.name ?? t('admin.workerHistory')}</h1>
          {profile?.phone && (
            <a href={`tel:${profile.phone}`} className="text-sm font-semibold text-brand-dark">
              {profile.phone}
            </a>
          )}
        </div>
      </div>

      {(hasHourly || hasProject) && (
        <div className="flex flex-wrap gap-2">
          {hasHourly && <TypeBadge type="hourly" />}
          {hasProject && <TypeBadge type="project" />}
        </div>
      )}

      <PeriodPicker period={period} />

      {/* Фильтр: тип работы */}
      <div className="inline-flex self-start rounded-2xl bg-mist p-1">
        {(['all', 'hourly', 'project'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTypeF(f)}
            className={`min-h-10 rounded-xl px-4 text-sm font-bold transition-colors ${
              typeF === f ? 'bg-white text-ink shadow-card' : 'text-slate'
            }`}
          >
            {f === 'all' ? t('admin.allTypes') : f === 'hourly' ? t('shift.hourly') : t('shift.project')}
          </button>
        ))}
      </div>

      {/* Фильтр: объект */}
      {objectOptions.length > 1 && (
        <div className="relative">
          <select
            value={objF}
            onChange={(e) => setObjF(e.target.value)}
            className="w-full min-h-12 appearance-none rounded-2xl border-2 border-mist bg-white px-4 pr-11 text-base text-ink outline-none focus:border-brand"
          >
            <option value="all">{t('admin.allObjects')}</option>
            {objectOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      )}

      {!shifts ? (
        <div className="flex justify-center pt-12">
          <Spinner className="size-8" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState text={t('admin.noData')} />
      ) : (
        <>
          {/* Сводка */}
          <Card className="animate-rise flex divide-x divide-mist">
            <div className="flex-1 px-3 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate">{t('admin.days')}</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{totals.days}</p>
            </div>
            {totals.work > 0 && (
              <div className="flex-1 px-3 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate">{t('admin.workH')}</p>
                <p className="mt-1 font-display text-xl font-bold text-brand-dark">{fmt(totals.work)}</p>
              </div>
            )}
            <div className="flex-1 px-3 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate">{t('report.earned')}</p>
              <p className="mt-1 font-display text-xl font-bold text-brand-dark">{formatMoney(totals.earn)}</p>
            </div>
          </Card>

          {/* Экспорт по этому работнику */}
          <div className="flex gap-3">
            <Button variant="dark" className="flex-1" disabled={exporting !== null} onClick={() => void doExport('pdf')}>
              {exporting === 'pdf' ? <Spinner className="text-white" /> : `⤓ ${t('admin.exportPdf')}`}
            </Button>
            <Button variant="secondary" className="flex-[1.6]" disabled={exporting !== null} onClick={() => void doExport('xlsx')}>
              {exporting === 'xlsx' ? <Spinner /> : `⤓ ${t('admin.exportXlsx')}`}
            </Button>
          </div>

          <SectionTitle>{t('nav.history')}</SectionTitle>
          {byDate.map(([date, items]) => (
            <Card key={date} className="animate-rise-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-mist px-5 py-2.5">
                <span className="font-semibold text-slate">{humanDate(date, dayNames)}</span>
                <span className="font-display font-bold text-brand-dark">
                  {items.some((s) => s.workType !== 'project')
                    ? fmt(items.reduce((a, s) => a + workedMinutes(s), 0))
                    : formatMoney(items.reduce((a, s) => a + shiftEarnings(s), 0))}
                </span>
              </div>
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  className="flex w-full items-center justify-between gap-2 border-b border-mist/60 px-5 py-3 text-left last:border-0 active:bg-mint/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={s.workType} />
                      {s.editedByAdmin && <span className="text-peach">⚠</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-ink">{s.objectName}</p>
                    <p className="text-sm text-slate">
                      {s.arrivalTime} – {s.departureTime ?? '…'}
                    </p>
                  </div>
                  <span className="shrink-0 font-display font-bold text-brand-dark">
                    {s.workType === 'project'
                      ? shiftEarnings(s) > 0
                        ? formatMoney(shiftEarnings(s))
                        : ''
                      : fmt(workedMinutes(s))}
                  </span>
                </button>
              ))}
            </Card>
          ))}
        </>
      )}

      {/* Блокировка */}
      {profile && profile.status !== 'pending' && (
        <Button
          variant={profile.status === 'blocked' ? 'secondary' : 'danger'}
          className="mt-2"
          onClick={() => void toggleBlock()}
        >
          {profile.status === 'blocked' ? t('admin.unblock') : t('admin.block')}
        </Button>
      )}
      {profile?.status === 'blocked' && (
        <div className="flex justify-center">
          <Chip tone="danger">{t('admin.blocked')}</Chip>
        </div>
      )}

      {selected && <ShiftDetailsModal shift={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
