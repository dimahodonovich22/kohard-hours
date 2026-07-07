import {
  formatDuration,
  formatMoney,
  minutesToDecimal,
  shiftEarnings,
  travelMinutes,
  workedMinutes,
  type Shift,
} from '@/lib/types'

export interface WorkerSummary {
  userId: string
  userName: string
  days: number
  workMin: number
  travelMin: number
  lunchMin: number
  /** Суммарный заработок за период, € */
  earnings: number
  shifts: Shift[]
}

/** Свод по работникам за период (только закрытые смены попадают в часы) */
export function summarize(shifts: Shift[]): WorkerSummary[] {
  const map = new Map<string, WorkerSummary>()
  for (const s of shifts) {
    let row = map.get(s.userId)
    if (!row) {
      row = { userId: s.userId, userName: s.userName, days: 0, workMin: 0, travelMin: 0, lunchMin: 0, earnings: 0, shifts: [] }
      map.set(s.userId, row)
    }
    row.shifts.push(s)
    row.workMin += workedMinutes(s)
    row.travelMin += travelMinutes(s)
    row.lunchMin += s.status === 'closed' ? s.lunchMinutes || 0 : 0
    row.earnings += shiftEarnings(s)
  }
  for (const row of map.values()) row.earnings = Math.round(row.earnings * 100) / 100
  for (const row of map.values()) {
    row.days = new Set(row.shifts.map((s) => s.date)).size
    row.shifts.sort((a, b) => a.date.localeCompare(b.date) || a.arrivalTime.localeCompare(b.arrivalTime))
  }
  return [...map.values()].sort((a, b) => a.userName.localeCompare(b.userName))
}

export { formatDuration, formatMoney, minutesToDecimal, shiftEarnings, travelMinutes, workedMinutes }
