import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { closeShift, openShift, watchDayShifts } from '@/lib/shifts'
import { watchObjects, type SiteObject } from '@/lib/objects'
import {
  formatMoney,
  minutesBetween,
  shiftEarnings,
  workedMinutes,
  type Shift,
  type WorkType,
} from '@/lib/types'
import { useDuration } from '@/lib/useDuration'
import { nowTime, todayKey } from '@/lib/dates'
import { Button, Card, Chip, Field, SectionTitle, Spinner, TimeField } from '@/components/ui'
import { PhotoCapture } from '@/components/PhotoCapture'
import { ShiftDetailsModal } from '@/pages/admin/ShiftDetailsModal'

type View = 'idle' | 'arrive' | 'leave'

export function TodayPage() {
  const { t } = useTranslation()
  const fmt = useDuration()
  const { user, profile } = useAuth()
  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [objects, setObjects] = useState<SiteObject[]>([])
  const [view, setView] = useState<View>('idle')
  const [arriveType, setArriveType] = useState<WorkType>('hourly')
  const [reviewed, setReviewed] = useState<Shift | null>(null)
  const date = todayKey()

  useEffect(() => {
    if (!user) return
    return watchDayShifts(user.uid, date, setShifts)
  }, [user, date])

  useEffect(() => watchObjects(setObjects), [])

  const open = useMemo(() => shifts?.find((s) => s.status === 'open') ?? null, [shifts])
  const closed = useMemo(() => shifts?.filter((s) => s.status === 'closed') ?? [], [shifts])
  const totalToday = closed.reduce((acc, s) => acc + workedMinutes(s), 0)
  const earnedToday = closed.reduce((acc, s) => acc + shiftEarnings(s), 0)

  if (!shifts) {
    return (
      <div className="flex justify-center pt-20">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="animate-rise font-display text-xs font-medium uppercase tracking-[0.18em] text-slate">
        {t('common.today')} · {date.split('-').reverse().join('.')}
      </p>

      {view === 'arrive' && (
        <ArriveForm
          userId={user!.uid}
          userName={profile!.name}
          date={date}
          workType={arriveType}
          objects={objects}
          onDone={() => setView('idle')}
          onCancel={() => setView('idle')}
        />
      )}

      {view === 'leave' && open && (
        <LeaveForm shift={open} userId={user!.uid} onDone={() => setView('idle')} onCancel={() => setView('idle')} />
      )}

      {view === 'idle' && (
        <>
          {open ? (
            <OpenShiftCard shift={open} onLeave={() => setView('leave')} />
          ) : (
            <WorkTypeChoice
              hasClosed={closed.length > 0}
              onChoose={(type) => {
                setArriveType(type)
                setView('arrive')
              }}
            />
          )}

          {closed.length > 0 && (
            <>
              <SectionTitle>{t('shift.workedToday')}</SectionTitle>
              {closed.map((s) => (
                <ClosedShiftCard key={s.id} shift={s} onOpen={() => setReviewed(s)} />
              ))}
              <Card className="flex items-center justify-between px-5 py-4">
                <span className="font-semibold text-slate">{t('common.total')}</span>
                <div className="flex items-baseline gap-3">
                  {totalToday > 0 && (
                    <span className="font-display text-xl font-bold text-brand-dark">{fmt(totalToday)}</span>
                  )}
                  {earnedToday > 0 && (
                    <span className="font-display text-xl font-bold text-ink">{formatMoney(earnedToday)}</span>
                  )}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {reviewed && <ShiftDetailsModal shift={reviewed} readOnly onClose={() => setReviewed(null)} />}
    </div>
  )
}

/** Выбор способа работы перед началом смены: по часам или по проекту */
function WorkTypeChoice({ hasClosed, onChoose }: { hasClosed: boolean; onChoose: (t: WorkType) => void }) {
  const { t } = useTranslation()
  return (
    <Card className="animate-rise-1 overflow-hidden">
      <div className="roof-stripes px-5 pb-6 pt-6">
        <p className="mb-1 text-center text-balance text-slate">
          {hasClosed ? t('shift.newShift') : t('shift.startHint')}
        </p>
        <p className="mb-4 text-center font-display text-base font-bold text-ink">{t('shift.todayQuestion')}</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onChoose('hourly')}
            className="flex min-h-16 items-center gap-4 rounded-2xl bg-brand px-5 text-left text-white shadow-lift transition-colors active:bg-brand-dark"
          >
            <svg viewBox="0 0 24 24" className="size-8 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <span>
              <span className="block font-display text-lg font-bold">{t('shift.hourly')}</span>
              <span className="block text-sm text-white/80">{t('shift.hourlyDesc')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChoose('project')}
            className="flex min-h-16 items-center gap-4 rounded-2xl bg-ink px-5 text-left text-white shadow-lift transition-colors active:bg-ink-soft"
          >
            <svg viewBox="0 0 24 24" className="size-8 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
              <path d="M4 8.5 12 13l8-4.5M12 13v7" />
            </svg>
            <span>
              <span className="block font-display text-lg font-bold">{t('shift.project')}</span>
              <span className="block text-sm text-white/70">{t('shift.projectDesc')}</span>
            </span>
          </button>
        </div>
      </div>
    </Card>
  )
}

function OpenShiftCard({ shift, onLeave }: { shift: Shift; onLeave: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="animate-rise-1 overflow-hidden">
      <div className="flex items-center justify-between bg-ink px-5 py-3">
        <Chip tone="brand">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-white" />
          {t('shift.openShift')}
        </Chip>
        <span className="text-sm font-semibold text-mint">
          {t('shift.openSince', { time: shift.arrivalTime })}
        </span>
      </div>
      <div className="px-5 py-5">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-sm font-semibold text-slate">{t('shift.onSite')}</p>
          {shift.workType === 'project' && <Chip tone="peach">{t('shift.project')}</Chip>}
        </div>
        <p className="mb-5 text-balance font-display text-lg font-bold text-ink">{shift.objectName}</p>
        <Button big variant="dark" onClick={onLeave} className="w-full">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
          {t('shift.leave')}
        </Button>
      </div>
    </Card>
  )
}

function ClosedShiftCard({ shift, onOpen }: { shift: Shift; onOpen: () => void }) {
  const { t } = useTranslation()
  const fmt = useDuration()
  const isProject = shift.workType === 'project'
  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <Card className="animate-rise-2 px-5 py-4 transition-colors active:bg-mint/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-ink">{shift.objectName}</p>
              {isProject && <Chip tone="peach">{t('shift.project')}</Chip>}
            </div>
            <p className="mt-0.5 text-sm text-slate">
              {shift.arrivalTime} – {shift.departureTime}
              {!isProject &&
                shift.lunchMinutes > 0 &&
                ` · ${t('shift.lunch').toLowerCase()} ${shift.lunchMinutes} ${t('common.minutes')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              {!isProject && (
                <span className="font-display text-lg font-bold text-brand-dark">{fmt(workedMinutes(shift))}</span>
              )}
              {shiftEarnings(shift) > 0 && (
                <span className={`font-semibold ${isProject ? 'font-display text-lg text-brand-dark' : 'text-sm text-slate'}`}>
                  {formatMoney(shiftEarnings(shift))}
                </span>
              )}
            </div>
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-slate/60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Card>
    </button>
  )
}

const LUNCH_PRESETS = [0, 30, 45, 60]
const RATE_STORAGE_KEY = 'kohard-last-rate'

function ArriveForm({
  userId,
  userName,
  date,
  workType,
  objects,
  onDone,
  onCancel,
}: {
  userId: string
  userName: string
  date: string
  workType: WorkType
  objects: SiteObject[]
  onDone: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const isProject = workType === 'project'
  const hasObjects = objects.length > 0
  // Если справочник пуст — оставляем ручной ввод, чтобы работника не заблокировать
  const [objectId, setObjectId] = useState('')
  const [objectText, setObjectText] = useState('')
  const [objectError, setObjectError] = useState('')
  const [time, setTime] = useState(nowTime())
  // Ставка по умолчанию — та, что работник вводил в прошлый раз (обычно не меняется)
  const [rate, setRate] = useState(() => localStorage.getItem(RATE_STORAGE_KEY) ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [withTravel, setWithTravel] = useState(false)
  const [travelStart, setTravelStart] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const selected = objects.find((o) => o.id === objectId)
  const objectName = hasObjects ? (selected?.name ?? '') : objectText.trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!objectName) return setObjectError(t('common.required'))
    if (!photo) return setPhotoError(t('shift.photoRequired'))
    const rateNum = isProject ? 0 : Number(rate.replace(',', '.')) || 0
    if (!isProject) localStorage.setItem(RATE_STORAGE_KEY, rate)
    setBusy(true)
    try {
      await openShift({
        userId,
        userName,
        date,
        workType,
        objectName,
        objectId: hasObjects && selected ? selected.id : null,
        arrivalTime: time,
        photo,
        hourlyRate: rateNum,
        travelStartTime: !isProject && withTravel && travelStart ? travelStart : null,
        travelEndTime: !isProject && withTravel && travelStart ? time : null,
      })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="animate-rise overflow-hidden">
      <div className={`px-5 py-3.5 ${isProject ? 'bg-ink' : 'bg-brand'}`}>
        <h2 className="font-display font-bold text-white">
          {t('shift.arrival')} · {isProject ? t('shift.project') : t('shift.hourly')}
        </h2>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        {hasObjects ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate">
              {isProject ? t('shift.projectName') : t('shift.objectName')}
            </span>
            <div className="relative">
              <select
                value={objectId}
                onChange={(e) => {
                  setObjectId(e.target.value)
                  setObjectError('')
                }}
                className={`w-full min-h-13 appearance-none rounded-2xl border-2 bg-white px-4 pr-11 text-base text-ink outline-none focus:border-brand ${
                  objectError ? 'border-danger/60' : 'border-mist'
                } ${objectId ? '' : 'text-slate/50'}`}
              >
                <option value="" disabled>
                  {t('shift.selectObject')}
                </option>
                {objects.map((o) => (
                  <option key={o.id} value={o.id} className="text-ink">
                    {o.name}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            {objectError && <span className="mt-1 block text-sm font-medium text-danger">{objectError}</span>}
          </label>
        ) : (
          <div>
            <Field
              label={isProject ? t('shift.projectName') : t('shift.objectName')}
              placeholder={t('shift.objectPlaceholder')}
              value={objectText}
              onChange={(e) => {
                setObjectText(e.target.value)
                setObjectError('')
              }}
              error={objectError}
            />
            <p className="mt-1.5 text-xs text-slate">{t('shift.objectsEmptyWorker')}</p>
          </div>
        )}

        {isProject ? (
          <TimeField label={t('shift.arrivalTime')} value={time} onChange={(e) => setTime(e.target.value)} required />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <TimeField label={t('shift.arrivalTime')} value={time} onChange={(e) => setTime(e.target.value)} required />
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate">{t('shift.rate')}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder={t('shift.ratePlaceholder')}
                  className="w-full min-h-14 rounded-2xl border-2 border-mist bg-white px-4 text-center font-display text-xl font-medium text-ink outline-none focus:border-brand placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-slate/50"
                />
              </label>
            </div>

            {/* Дорога: выехал из дома → приехал на объект (только по часам) */}
            {withTravel ? (
              <div className="rounded-2xl bg-mint/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-brand-deep">{t('shift.travel')}</span>
                  <button type="button" className="text-sm font-semibold text-slate" onClick={() => setWithTravel(false)}>
                    {t('common.cancel')}
                  </button>
                </div>
                <TimeField label={t('shift.travelStart')} value={travelStart} onChange={(e) => setTravelStart(e.target.value)} />
                <p className="mt-2 text-xs text-slate">{t('shift.travelHint')}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setWithTravel(true)}
                className="min-h-12 rounded-2xl border-2 border-dashed border-mist font-semibold text-slate active:border-brand active:text-brand-dark"
              >
                + {t('shift.travelAdd')}
              </button>
            )}
          </>
        )}

        <PhotoCapture
          photo={photo}
          onPhoto={(f) => {
            setPhoto(f)
            setPhotoError('')
          }}
          error={photoError}
        />

        <div className="mt-1 flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy} className="flex-[2]">
            {busy ? <Spinner className="text-white" /> : t('shift.confirmArrival')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function LeaveForm({
  shift,
  userId,
  onDone,
  onCancel,
}: {
  shift: Shift
  userId: string
  onDone: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const fmt = useDuration()
  const isProject = shift.workType === 'project'
  const [time, setTime] = useState(nowTime())
  const [photo, setPhoto] = useState<File | null>(null)
  const [lunch, setLunch] = useState(30)
  const [customLunch, setCustomLunch] = useState(false)
  const [withTravel, setWithTravel] = useState(!!shift.travelStartTime)
  const [travelStart, setTravelStart] = useState(shift.travelStartTime ?? '')
  const [busy, setBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!photo) return setPhotoError(t('shift.photoRequired'))
    setBusy(true)
    try {
      await closeShift({
        shiftId: shift.id,
        userId,
        departureTime: time,
        lunchMinutes: isProject ? 0 : lunch,
        photo,
        travelStartTime: !isProject && withTravel && travelStart ? travelStart : null,
        travelEndTime: !isProject && withTravel && travelStart ? shift.arrivalTime : null,
      })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="animate-rise overflow-hidden">
      <div className="bg-ink px-5 py-3.5">
        <h2 className="font-display font-bold text-white">{t('shift.departure')}</h2>
        <p className="mt-0.5 text-sm text-mint">{shift.objectName}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <TimeField label={t('shift.departureTime')} value={time} onChange={(e) => setTime(e.target.value)} required />

        {!isProject && (
          <>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate">{t('shift.lunch')}</span>
              <div className="flex flex-wrap gap-2">
                {LUNCH_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setLunch(m)
                      setCustomLunch(false)
                    }}
                    className={`min-h-12 flex-1 rounded-2xl border-2 px-3 font-semibold transition-colors ${
                      !customLunch && lunch === m
                        ? 'border-brand bg-mint/60 text-brand-deep'
                        : 'border-mist bg-white text-slate'
                    }`}
                  >
                    {m === 0 ? t('shift.lunchNone') : `${m} ${t('common.minutes')}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomLunch(true)}
                  className={`min-h-12 flex-1 rounded-2xl border-2 px-3 font-semibold transition-colors ${
                    customLunch ? 'border-brand bg-mint/60 text-brand-deep' : 'border-mist bg-white text-slate'
                  }`}
                >
                  {t('shift.lunchCustom')}
                </button>
              </div>
              {customLunch && (
                <input
                  type="number"
                  min={0}
                  max={240}
                  step={5}
                  value={lunch}
                  onChange={(e) => setLunch(Number(e.target.value) || 0)}
                  className="mt-2 w-full min-h-13 rounded-2xl border-2 border-mist bg-white px-4 text-center font-display text-lg outline-none focus:border-brand"
                  placeholder={t('common.minutes')}
                />
              )}
            </div>

            {withTravel ? (
              <div className="rounded-2xl bg-mint/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-brand-deep">{t('shift.travel')}</span>
                  <button type="button" className="text-sm font-semibold text-slate" onClick={() => setWithTravel(false)}>
                    {t('common.cancel')}
                  </button>
                </div>
                <TimeField label={t('shift.travelStart')} value={travelStart} onChange={(e) => setTravelStart(e.target.value)} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setWithTravel(true)}
                className="min-h-12 rounded-2xl border-2 border-dashed border-mist font-semibold text-slate active:border-brand active:text-brand-dark"
              >
                + {t('shift.travelAdd')}
              </button>
            )}
          </>
        )}

        <PhotoCapture
          photo={photo}
          onPhoto={(f) => {
            setPhoto(f)
            setPhotoError('')
          }}
          error={photoError}
        />

        {/* Живой итог часов и заработка (только по часам) */}
        {!isProject &&
          (() => {
            const workedMin = Math.max(0, minutesBetween(shift.arrivalTime, time) - lunch)
            const earned = Math.round((workedMin / 60) * (shift.hourlyRate || 0) * 100) / 100
            return (
              <div className="flex items-stretch gap-3">
                <div className="flex-1 rounded-2xl bg-mint/60 px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-deep">{t('shift.work')}</p>
                  <p className="mt-0.5 font-display text-2xl font-bold text-brand-dark">{fmt(workedMin)}</p>
                </div>
                {shift.hourlyRate > 0 && (
                  <div className="flex-1 rounded-2xl bg-ink px-4 py-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-mint">{t('shift.earned')}</p>
                    <p className="mt-0.5 font-display text-2xl font-bold text-white">{formatMoney(earned)}</p>
                  </div>
                )}
              </div>
            )
          })()}

        <div className="mt-1 flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy} className="flex-[2]">
            {busy ? <Spinner className="text-white" /> : t('shift.confirmDeparture')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
