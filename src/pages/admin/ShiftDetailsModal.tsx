import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { adminDeleteShift, adminUpdateShift } from '@/lib/shifts'
import { formatMoney, shiftEarnings, travelMinutes, workedMinutes, type Shift } from '@/lib/types'
import { useDuration } from '@/lib/useDuration'
import { Button, Card, Chip, Field, TimeField } from '@/components/ui'
import { StoragePhoto } from '@/components/StoragePhoto'

export function ShiftDetailsModal({
  shift,
  onClose,
  readOnly = false,
}: {
  shift: Shift
  onClose: () => void
  /** Просмотр без редактирования — для работника в разделе «Сегодня»/«История» */
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const fmt = useDuration()
  const { user, profile } = useAuth()
  const isProject = shift.workType === 'project'
  const [editing, setEditing] = useState(false)
  const [objectName, setObjectName] = useState(shift.objectName)
  const [arrivalTime, setArrivalTime] = useState(shift.arrivalTime)
  const [departureTime, setDepartureTime] = useState(shift.departureTime ?? '')
  const [lunch, setLunch] = useState(shift.lunchMinutes)
  const [rate, setRate] = useState(String(shift.hourlyRate ?? 0))
  const [amount, setAmount] = useState(shift.projectAmount != null ? String(shift.projectAmount) : '')
  const [travelStart, setTravelStart] = useState(shift.travelStartTime ?? '')
  const [travelEnd, setTravelEnd] = useState(shift.travelEndTime ?? '')
  const [busy, setBusy] = useState(false)

  const arrivalServer = shift.arrivalAt?.toDate?.()
  const departureServer = shift.departureAt?.toDate?.()

  async function save() {
    setBusy(true)
    try {
      const base = {
        objectName: objectName.trim(),
        arrivalTime,
        departureTime: departureTime || null,
        ...(departureTime ? { status: 'closed' as const } : {}),
      }
      const fields = isProject
        ? { ...base, projectAmount: amount.trim() === '' ? null : Number(amount.replace(',', '.')) || 0 }
        : {
            ...base,
            lunchMinutes: lunch,
            hourlyRate: Number(rate.replace(',', '.')) || 0,
            travelStartTime: travelStart || null,
            travelEndTime: travelEnd || null,
          }
      // Для проекта проставление суммы — штатный шаг, не «исправление».
      // Пометку ставим только если админ поменял название/время.
      const structuralChanged =
        objectName.trim() !== shift.objectName ||
        arrivalTime !== shift.arrivalTime ||
        (departureTime || null) !== (shift.departureTime ?? null)
      const editor =
        isProject && !structuralChanged
          ? undefined
          : { byUid: user!.uid, byName: profile!.name, atISO: new Date().toISOString() }
      await adminUpdateShift(shift.id, fields, editor)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(t('admin.deleteShiftConfirm'))) return
    await adminDeleteShift(shift.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper pb-safe sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-ink px-5 py-4">
          <div>
            <p className="font-display font-bold text-white">{shift.userName}</p>
            <p className="text-sm text-mint">
              {shift.date.split('-').reverse().join('.')} · {shift.arrivalTime}–{shift.departureTime ?? '…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {!editing ? (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate">{t('shift.onSite')}</p>
                  <Chip tone={isProject ? 'peach' : 'mist'}>
                    {isProject ? t('shift.project') : t('shift.hourly')}
                  </Chip>
                </div>
                <p className="font-display font-bold text-ink">{shift.objectName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isProject && shift.status === 'closed' && (
                    <Chip tone="mint">
                      {t('shift.work')}: {fmt(workedMinutes(shift))}
                    </Chip>
                  )}
                  {shiftEarnings(shift) > 0 && (
                    <Chip tone="brand">
                      {t('shift.earned')}: {formatMoney(shiftEarnings(shift))}
                    </Chip>
                  )}
                  {!isProject && shift.hourlyRate > 0 && (
                    <Chip tone="mist">
                      {t('admin.rateH')}: {formatMoney(shift.hourlyRate)}
                    </Chip>
                  )}
                  {!isProject && shift.lunchMinutes > 0 && (
                    <Chip tone="mist">
                      {t('shift.lunch')}: {shift.lunchMinutes} {t('common.minutes')}
                    </Chip>
                  )}
                  {!isProject && travelMinutes(shift) > 0 && (
                    <Chip tone="peach">
                      {t('shift.travel')}: {fmt(travelMinutes(shift))}
                    </Chip>
                  )}
                </div>
                {shift.editedByAdmin && (
                  <p className="mt-3 text-xs font-medium text-peach">
                    ⚠ {t('shift.editedByAdmin')} — {shift.editedByAdmin.byName}
                  </p>
                )}
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-slate">
                    {t('admin.photoArrival')} · {shift.arrivalTime}
                  </p>
                  <StoragePhoto path={shift.arrivalPhotoPath} className="aspect-square w-full rounded-2xl" />
                  {arrivalServer && (
                    <p className="mt-1 text-[11px] text-slate/70">
                      {t('admin.savedAt', {
                        time: arrivalServer.toLocaleString('uk-BE', { dateStyle: 'short', timeStyle: 'short' }),
                      })}
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-slate">
                    {t('admin.photoDeparture')} {shift.departureTime ? `· ${shift.departureTime}` : ''}
                  </p>
                  <StoragePhoto path={shift.departurePhotoPath} className="aspect-square w-full rounded-2xl" />
                  {departureServer && (
                    <p className="mt-1 text-[11px] text-slate/70">
                      {t('admin.savedAt', {
                        time: departureServer.toLocaleString('uk-BE', { dateStyle: 'short', timeStyle: 'short' }),
                      })}
                    </p>
                  )}
                </div>
              </div>

              {!readOnly && (
                <div className="flex gap-3">
                  <Button variant="danger" onClick={() => void remove()} className="flex-1">
                    {t('admin.deleteShift')}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(true)} className="flex-[2]">
                    {t('admin.editShift')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <Field
                label={isProject ? t('shift.projectName') : t('shift.objectName')}
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <TimeField label={t('shift.arrivalTime')} value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                <TimeField label={t('shift.departureTime')} value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
              </div>

              {isProject ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate">{t('admin.projectAmount')}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-13 rounded-2xl border-2 border-mist bg-white px-4 text-center font-display text-lg outline-none focus:border-brand"
                  />
                </label>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate">
                        {t('shift.lunch')} ({t('common.minutes')})
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={240}
                        step={5}
                        value={lunch}
                        onChange={(e) => setLunch(Number(e.target.value) || 0)}
                        className="w-full min-h-13 rounded-2xl border-2 border-mist bg-white px-4 text-center font-display text-lg outline-none focus:border-brand"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate">{t('shift.rate')}</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="w-full min-h-13 rounded-2xl border-2 border-mist bg-white px-4 text-center font-display text-lg outline-none focus:border-brand"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TimeField label={t('shift.travelStart')} value={travelStart} onChange={(e) => setTravelStart(e.target.value)} />
                    <TimeField label={t('shift.travelEnd')} value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} />
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => void save()} disabled={busy} className="flex-[2]">
                  {t('common.save')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
