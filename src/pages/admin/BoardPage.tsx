import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { watchAllShifts } from '@/lib/shifts'
import { formatMoney, shiftEarnings, workedMinutes, type Shift } from '@/lib/types'
import { useDuration } from '@/lib/useDuration'
import { todayKey } from '@/lib/dates'
import { Card, Chip, EmptyState, SectionTitle, Spinner } from '@/components/ui'
import { StoragePhoto } from '@/components/StoragePhoto'
import { TypeBadge } from '@/components/TypeBadge'
import { ShiftDetailsModal } from './ShiftDetailsModal'

/** «Кто сейчас на объектах» — живой снимок дня */
export function BoardPage() {
  const { t } = useTranslation()
  const fmt = useDuration()
  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [selected, setSelected] = useState<Shift | null>(null)
  const date = todayKey()

  useEffect(() => watchAllShifts(date, date, setShifts), [date])

  if (!shifts) {
    return (
      <div className="flex justify-center pt-20">
        <Spinner className="size-8" />
      </div>
    )
  }

  const open = shifts.filter((s) => s.status === 'open').sort((a, b) => a.userName.localeCompare(b.userName))
  const closed = shifts.filter((s) => s.status === 'closed').sort((a, b) => a.userName.localeCompare(b.userName))

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold">{t('admin.boardTitle')}</h1>

      {open.length === 0 && closed.length === 0 && <EmptyState text={t('admin.boardEmpty')} />}

      {open.map((s) => (
        <button key={s.id} type="button" onClick={() => setSelected(s)} className="text-left">
          <Card className="animate-rise flex gap-4 overflow-hidden">
            <StoragePhoto path={s.arrivalPhotoPath} className="h-24 w-24 shrink-0" />
            <div className="flex flex-1 flex-col justify-center py-2 pr-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-ink">{s.userName}</p>
                <Chip tone="brand">
                  <span className="size-1.5 animate-pulse-dot rounded-full bg-white" />
                  {s.arrivalTime}
                </Chip>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <TypeBadge type={s.workType} />
                <p className="line-clamp-2 text-sm text-slate">{s.objectName}</p>
              </div>
            </div>
          </Card>
        </button>
      ))}

      {closed.length > 0 && (
        <>
          <SectionTitle>{t('admin.boardClosed')}</SectionTitle>
          {closed.map((s) => (
            <button key={s.id} type="button" onClick={() => setSelected(s)} className="text-left">
              <Card className="animate-rise-1 flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{s.userName}</p>
                    <TypeBadge type={s.workType} />
                  </div>
                  <p className="truncate text-sm text-slate">
                    {s.objectName} · {s.arrivalTime}–{s.departureTime}
                  </p>
                </div>
                <span className="ml-3 shrink-0 font-display font-bold text-brand-dark">
                  {s.workType === 'project'
                    ? shiftEarnings(s) > 0
                      ? formatMoney(shiftEarnings(s))
                      : t('shift.project')
                    : fmt(workedMinutes(s))}
                </span>
              </Card>
            </button>
          ))}
        </>
      )}

      {selected && <ShiftDetailsModal shift={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
