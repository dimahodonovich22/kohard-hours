import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export const DATE_FMT = 'yyyy-MM-dd'

export function todayKey(): string {
  return format(new Date(), DATE_FMT)
}

export function nowTime(): string {
  return format(new Date(), 'HH:mm')
}

export function toKey(d: Date): string {
  return format(d, DATE_FMT)
}

/** Бельгия: неделя начинается с понедельника */
export function weekRange(anchor: Date): { start: string; end: string } {
  return {
    start: toKey(startOfWeek(anchor, { weekStartsOn: 1 })),
    end: toKey(endOfWeek(anchor, { weekStartsOn: 1 })),
  }
}

export function monthRange(anchor: Date): { start: string; end: string } {
  return { start: toKey(startOfMonth(anchor)), end: toKey(endOfMonth(anchor)) }
}

export function shiftAnchor(anchor: Date, unit: 'week' | 'month', dir: -1 | 1): Date {
  return unit === 'week' ? addWeeks(anchor, dir) : addMonths(anchor, dir)
}

export function eachDateKey(start: string, end: string): string[] {
  const out: string[] = []
  let d = new Date(start + 'T00:00:00')
  const stop = new Date(end + 'T00:00:00')
  while (d <= stop) {
    out.push(toKey(d))
    d = addDays(d, 1)
  }
  return out
}

/** '2026-07-07' → 'пн 07.07' с локализованным днём недели */
export function humanDate(key: string, dayNames: Record<string, string>): string {
  const d = new Date(key + 'T00:00:00')
  const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]
  return `${dayNames[idx]} ${format(d, 'dd.MM')}`
}
