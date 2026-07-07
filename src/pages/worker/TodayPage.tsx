import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { closeShift, openShift, watchDayShifts } from '@/lib/shifts'
import {
  formatMinutes,
  formatMoney,
  minutesBetween,
  shiftEarnings,
  workedMinutes,
  type Shift,
} from '@/lib/types'
import { nowTime, todayKey } from '@/lib/dates'
import { Button, Card, Chip, Field, SectionTitle, Spinner, TimeField } from '@/components/ui'
import { PhotoCapture } from '@/components/PhotoCapture'

type View = 'idle' | 'arrive' | 'leave'

export function TodayPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [view, setView] = useState<View>('idle')
  const date = todayKey()

  useEffect(() => {
    if (!user) return
    return watchDayShifts(user.uid, date, setShifts)
  }, [user, date])

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
            <ArriveHero hasClosed={closed.length > 0} onArrive={() => setView('arrive')} />
          )}

          {closed.length > 0 && (
            <>
              <SectionTitle>{t('shift.workedToday')}</SectionTitle>
              {closed.map((s) => (
                <ClosedShiftCard key={s.id} shift={s} />
              ))}
              <Card className="flex items-center justify-between px-5 py-4">
                <span className="font-semibold text-slate">{t('common.total')}</span>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-xl font-bold text-brand-dark">
                    {formatMinutes(totalToday)}
                  </span>
                  {earnedToday > 0 && (
                    <span className="font-display text-xl font-bold text-ink">{formatMoney(earnedToday)}</span>
                  )}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

function ArriveHero({ hasClosed, onArrive }: { hasClosed: boolean; onArrive: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="animate-rise-1 overflow-hidden">
      <div className="roof-stripes px-5 pb-6 pt-7 text-center">
        <p className="mb-5 text-balance text-slate">
          {hasClosed ? t('shift.newShift') : t('shift.startHint')}
        </p>
        <Button big onClick={onArrive} className="w-full">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('shift.arrive')}
        </Button>
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
        <p className="mb-1 text-sm font-semibold text-slate">{t('shift.onSite')}</p>
        <p className="mb-5 text-balance font-display text-lg font-bold text-ink">{shift.objectName}</p>
        <Button big variant="dark" onClick={onLeave} className="w-full">
          {t('shift.leave')}
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </Button>
      </div>
    </Card>
  )
}

function ClosedShiftCard({ shift }: { shift: Shift }) {
  const { t } = useTranslation()
  return (
    <Card className="animate-rise-2 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{shift.objectName}</p>
          <p className="mt-0.5 text-sm text-slate">
            {shift.arrivalTime} – {shift.departureTime}
            {shift.lunchMinutes > 0 && ` · ${t('shift.lunch').toLowerCase()} ${shift.lunchMinutes} ${t('common.minutes')}`}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display text-lg font-bold text-brand-dark">
            {formatMinutes(workedMinutes(shift))}
          </span>
          {shift.hourlyRate > 0 && (
            <span className="text-sm font-semibold text-slate">{formatMoney(shiftEarnings(shift))}</span>
          )}
        </div>
      </div>
    </Card>
  )
}

const LUNCH_PRESETS = [0, 30, 45, 60]
const RATE_STORAGE_KEY = 'kohard-last-rate'

function ArriveForm({
  userId,
  userName,
  date,
  onDone,
  onCancel,
}: {
  userId: string
  userName: string
  date: string
  onDone: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [objectName, setObjectName] = useState('')
  const [time, setTime] = useState(nowTime())
  // Ставка по умолчанию — та, что работник вводил в прошлый раз (обычно не меняется)
  const [rate, setRate] = useState(() => localStorage.getItem(RATE_STORAGE_KEY) ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [withTravel, setWithTravel] = useState(false)
  const [travelStart, setTravelStart] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!photo) return setPhotoError(t('shift.photoRequired'))
    const rateNum = Number(rate.replace(',', '.')) || 0
    localStorage.setItem(RATE_STORAGE_KEY, rate)
    setBusy(true)
    try {
      await openShift({
        userId,
        userName,
        date,
        objectName,
        arrivalTime: time,
        photo,
        hourlyRate: rateNum,
        travelStartTime: withTravel && travelStart ? travelStart : null,
        travelEndTime: withTravel && travelStart ? time : null,
      })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="animate-rise overflow-hidden">
      <div className="bg-brand px-5 py-3.5">
        <h2 className="font-display font-bold text-white">{t('shift.arrival')}</h2>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <Field
          label={t('shift.objectName')}
          placeholder={t('shift.objectPlaceholder')}
          value={objectName}
          onChange={(e) => setObjectName(e.target.value)}
          required
        />
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

        {/* Дорога: выехал из дома → приехал на объект */}
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
        lunchMinutes: lunch,
        photo,
        travelStartTime: withTravel && travelStart ? travelStart : null,
        travelEndTime: withTravel && travelStart ? shift.arrivalTime : null,
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

        <PhotoCapture
          photo={photo}
          onPhoto={(f) => {
            setPhoto(f)
            setPhotoError('')
          }}
          error={photoError}
        />

        {/* Живой итог: сколько отработал и заработал при выбранном времени */}
        {(() => {
          const workedMin = Math.max(0, minutesBetween(shift.arrivalTime, time) - lunch)
          const earned = Math.round((workedMin / 60) * (shift.hourlyRate || 0) * 100) / 100
          return (
            <div className="flex items-stretch gap-3">
              <div className="flex-1 rounded-2xl bg-mint/60 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-deep">{t('shift.work')}</p>
                <p className="mt-0.5 font-display text-2xl font-bold text-brand-dark">{formatMinutes(workedMin)}</p>
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
