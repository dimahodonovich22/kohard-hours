import type { Timestamp } from 'firebase/firestore'

export type Role = 'worker' | 'admin'
export type UserStatus = 'pending' | 'active' | 'blocked'
export type Lang = 'ua' | 'ru'

export interface UserProfile {
  uid: string
  name: string
  email: string
  phone: string
  role: Role
  status: UserStatus
  language: Lang
  createdAt: Timestamp | null
}

export interface AdminEdit {
  byUid: string
  byName: string
  atISO: string
}

export interface Shift {
  id: string
  userId: string
  userName: string
  /** YYYY-MM-DD (локальная дата работника) */
  date: string
  objectName: string
  /** HH:mm — время, выбранное работником */
  arrivalTime: string
  /** Серверная метка создания записи (антифрод) */
  arrivalAt: Timestamp | null
  arrivalPhotoPath: string | null
  departureTime: string | null
  departureAt: Timestamp | null
  departurePhotoPath: string | null
  lunchMinutes: number
  travelStartTime: string | null
  travelEndTime: string | null
  /** Ставка €/час, вводит работник при приезде */
  hourlyRate: number
  status: 'open' | 'closed'
  editedByAdmin: AdminEdit | null
}

/** Минуты между HH:mm; отрицательное → 0 (защита от опечаток) */
export function minutesBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = eh * 60 + em - (sh * 60 + sm)
  return Math.max(0, diff)
}

export function workedMinutes(s: Shift): number {
  if (!s.departureTime) return 0
  return Math.max(0, minutesBetween(s.arrivalTime, s.departureTime) - (s.lunchMinutes || 0))
}

export function travelMinutes(s: Shift): number {
  return minutesBetween(s.travelStartTime, s.travelEndTime)
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/**
 * Длительность в виде «8 ч 50 м» / «8 г 50 хв» — чтобы не путать с временем
 * на циферблате. Подписи часов/минут передаются из перевода.
 */
export function formatDuration(min: number, hLabel: string, mLabel: string): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0 && m > 0) return `${h} ${hLabel} ${m} ${mLabel}`
  if (h > 0) return `${h} ${hLabel}`
  return `${m} ${mLabel}`
}

/** Часы с десятичной дробью для Excel, напр. 7.5 */
export function minutesToDecimal(min: number): number {
  return Math.round((min / 60) * 100) / 100
}

/** Заработок за смену = отработанные часы × ставка (дорога не оплачивается) */
export function shiftEarnings(s: Shift): number {
  const hours = workedMinutes(s) / 60
  return Math.round(hours * (s.hourlyRate || 0) * 100) / 100
}

/** Формат денег: «€ 123.45» */
export function formatMoney(amount: number): string {
  return `€ ${amount.toFixed(2)}`
}
