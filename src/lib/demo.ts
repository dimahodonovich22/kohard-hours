/**
 * Демо-режим для GitHub Pages: приложение работает БЕЗ Firebase.
 * Все данные — в памяти браузера (сбрасываются при обновлении страницы).
 * Включается флагом VITE_DEMO=true (сборка `vite build --mode demo`).
 */
import type { Timestamp } from 'firebase/firestore'
import type { AdminEdit, Lang, Shift, UserProfile, WorkType } from './types'
import type { SiteObject } from './objects'

export const isDemo = import.meta.env.VITE_DEMO === 'true'

let seq = 100
const uid = (p: string) => `${p}-${seq++}`

function fakeTs(d: Date): Timestamp {
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 } as unknown as Timestamp
}

type Fn = () => void

class Coll<T> {
  data: T[]
  private listeners = new Set<Fn>()
  constructor(seed: T[]) {
    this.data = seed
  }
  sub(fn: Fn): Fn {
    this.listeners.add(fn)
    fn()
    return () => {
      this.listeners.delete(fn)
    }
  }
  set(next: T[]) {
    this.data = next
    this.listeners.forEach((f) => f())
  }
}

/* Плейсхолдер фото (когда реального снимка нет — сид-данные) */
const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e9e9e9"/><path d="M60 200 L200 90 L340 200 Z" fill="#cbecda"/><path d="M120 200 L200 140 L280 200 Z" fill="#4cb57a"/><text x="200" y="250" font-family="sans-serif" font-size="22" fill="#5d6773" text-anchor="middle">KOHARD</text></svg>`,
  )

const photoUrls = new Map<string, string>()
export function demoPhotoUrl(path: string | null): string {
  if (!path) return PLACEHOLDER
  return photoUrls.get(path) ?? PLACEHOLDER
}

/* ---- Дата-хелперы для сида ---- */
function dateKey(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ---- Сид пользователей ---- */
const ADMIN_UID = 'demo-admin'
const IVAN_UID = 'demo-ivan'
const PETRO_UID = 'demo-petro'

const users = new Coll<UserProfile>([
  { uid: ADMIN_UID, name: 'Саша (власник)', email: 'admin@kohard.be', phone: '+32 470 00 00 01', role: 'admin', status: 'active', language: 'ua', createdAt: fakeTs(new Date()) },
  { uid: IVAN_UID, name: 'Іван Робітник', email: 'ivan@kohard.be', phone: '+32 470 00 00 02', role: 'worker', status: 'active', language: 'ua', createdAt: fakeTs(new Date()) },
  { uid: PETRO_UID, name: 'Петро Майстер', email: 'petro@kohard.be', phone: '+32 470 00 00 03', role: 'worker', status: 'active', language: 'ua', createdAt: fakeTs(new Date()) },
  { uid: uid('user'), name: 'Новий Кандидат', email: 'new@kohard.be', phone: '+32 470 00 00 09', role: 'worker', status: 'pending', language: 'ua', createdAt: fakeTs(new Date()) },
])

const objects = new Coll<SiteObject>([
  { id: 'obj-1', name: 'Kerkstraat 5, Antwerpen', workType: 'hourly' },
  { id: 'obj-2', name: 'Brugge — Markt 12', workType: 'hourly' },
  { id: 'obj-3', name: 'Gent, Veldstraat 20', workType: 'project' },
])

function seedShift(p: Partial<Shift> & { id: string }): Shift {
  return {
    userId: IVAN_UID,
    userName: 'Іван Робітник',
    date: dateKey(0),
    workType: 'hourly',
    projectAmount: null,
    objectName: '',
    objectId: null,
    arrivalTime: '08:00',
    arrivalAt: fakeTs(new Date()),
    arrivalPhotoPath: `seed/${p.id}/a`,
    departureTime: '16:30',
    departureAt: fakeTs(new Date()),
    departurePhotoPath: `seed/${p.id}/d`,
    lunchMinutes: 30,
    travelStartTime: null,
    travelEndTime: null,
    hourlyRate: 20,
    status: 'closed',
    editedByAdmin: null,
    ...p,
  }
}

const shifts = new Coll<Shift>([
  seedShift({ id: 'sh-1', objectName: 'Kerkstraat 5, Antwerpen', objectId: 'obj-1', arrivalTime: '08:00', departureTime: '16:30', hourlyRate: 20 }),
  seedShift({ id: 'sh-2', date: dateKey(1), objectName: 'Brugge — Markt 12', objectId: 'obj-2', arrivalTime: '07:30', departureTime: '15:00', lunchMinutes: 45, hourlyRate: 20 }),
  seedShift({
    id: 'sh-3',
    userId: PETRO_UID,
    userName: 'Петро Майстер',
    workType: 'project',
    objectName: 'Gent, Veldstraat 20',
    objectId: 'obj-3',
    arrivalTime: '08:00',
    departureTime: '17:00',
    lunchMinutes: 0,
    hourlyRate: 0,
    projectAmount: 950,
  }),
])

/* ---- Демо-авторизация ---- */
let currentUid: string | null = null
const authListeners = new Set<Fn>()
function emitAuth() {
  authListeners.forEach((f) => f())
}

export const demoAuth = {
  currentUid: () => currentUid,
  sub(fn: Fn): Fn {
    authListeners.add(fn)
    fn()
    return () => {
      authListeners.delete(fn)
    }
  },
  loginAs(id: string) {
    currentUid = id
    emitAuth()
  },
  login(email: string) {
    const u = users.data.find((x) => x.email === email.trim().toLowerCase())
    if (!u) {
      const e = new Error('demo login') as Error & { code: string }
      e.code = 'auth/invalid-credential'
      throw e
    }
    currentUid = u.uid
    emitAuth()
  },
  register(name: string, email: string, phone: string, language: Lang) {
    const id = uid('user')
    users.set([
      ...users.data,
      { uid: id, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), role: 'worker', status: 'pending', language, createdAt: fakeTs(new Date()) },
    ])
    currentUid = id
    emitAuth()
  },
  logout() {
    currentUid = null
    emitAuth()
  },
  profile(): UserProfile | null {
    return users.data.find((u) => u.uid === currentUid) ?? null
  },
  updateLanguage(language: Lang) {
    if (!currentUid) return
    users.set(users.data.map((u) => (u.uid === currentUid ? { ...u, language } : u)))
  },
  quickLogins: { admin: ADMIN_UID, ivan: IVAN_UID, petro: PETRO_UID },
}

/* ---- Демо-операции с данными (зеркалят lib/shifts.ts, lib/objects.ts) ---- */
export const demoDb = {
  // users
  watchAllUsers(cb: (u: UserProfile[]) => void): Fn {
    return users.sub(() => cb([...users.data].sort((a, b) => a.name.localeCompare(b.name))))
  },
  watchPending(cb: (u: UserProfile[]) => void): Fn {
    return users.sub(() => cb(users.data.filter((u) => u.status === 'pending')))
  },
  updateUser(id: string, fields: Partial<UserProfile>) {
    users.set(users.data.map((u) => (u.uid === id ? { ...u, ...fields } : u)))
    return Promise.resolve()
  },
  deleteUser(id: string) {
    users.set(users.data.filter((u) => u.uid !== id))
    return Promise.resolve()
  },
  createWorker(opts: { name: string; email: string; phone: string; language: Lang }) {
    users.set([
      ...users.data,
      { uid: uid('user'), name: opts.name.trim(), email: opts.email.trim().toLowerCase(), phone: opts.phone.trim(), role: 'worker', status: 'active', language: opts.language, createdAt: fakeTs(new Date()) },
    ])
    return Promise.resolve()
  },

  // objects
  watchObjects(cb: (o: SiteObject[]) => void): Fn {
    return objects.sub(() => cb([...objects.data].sort((a, b) => a.name.localeCompare(b.name))))
  },
  addObject(name: string, workType: WorkType) {
    objects.set([...objects.data, { id: uid('obj'), name: name.trim(), workType }])
    return Promise.resolve()
  },
  renameObject(id: string, name: string) {
    objects.set(objects.data.map((o) => (o.id === id ? { ...o, name: name.trim() } : o)))
    return Promise.resolve()
  },
  setObjectType(id: string, workType: WorkType) {
    objects.set(objects.data.map((o) => (o.id === id ? { ...o, workType } : o)))
    return Promise.resolve()
  },
  deleteObject(id: string) {
    objects.set(objects.data.filter((o) => o.id !== id))
    return Promise.resolve()
  },

  // shifts
  watchDay(userId: string, date: string, cb: (s: Shift[]) => void): Fn {
    return shifts.sub(() =>
      cb(shifts.data.filter((s) => s.userId === userId && s.date === date).sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))),
    )
  },
  watchUser(userId: string, start: string, end: string, cb: (s: Shift[]) => void): Fn {
    return shifts.sub(() =>
      cb(shifts.data.filter((s) => s.userId === userId && s.date >= start && s.date <= end).sort((a, b) => b.date.localeCompare(a.date))),
    )
  },
  watchAll(start: string, end: string, cb: (s: Shift[]) => void): Fn {
    return shifts.sub(() => cb(shifts.data.filter((s) => s.date >= start && s.date <= end)))
  },
  openShift(opts: {
    userId: string
    userName: string
    date: string
    workType: WorkType
    objectName: string
    objectId?: string | null
    arrivalTime: string
    photo: File | Blob
    hourlyRate: number
    travelStartTime?: string | null
    travelEndTime?: string | null
  }): string {
    const id = uid('shift')
    const path = `demo/${id}/a`
    photoUrls.set(path, URL.createObjectURL(opts.photo))
    shifts.set([
      ...shifts.data,
      {
        id,
        userId: opts.userId,
        userName: opts.userName,
        date: opts.date,
        workType: opts.workType,
        projectAmount: null,
        objectName: opts.objectName.trim(),
        objectId: opts.objectId ?? null,
        arrivalTime: opts.arrivalTime,
        arrivalAt: fakeTs(new Date()),
        arrivalPhotoPath: path,
        departureTime: null,
        departureAt: null,
        departurePhotoPath: null,
        lunchMinutes: 0,
        travelStartTime: opts.travelStartTime ?? null,
        travelEndTime: opts.travelEndTime ?? null,
        hourlyRate: opts.hourlyRate || 0,
        status: 'open',
        editedByAdmin: null,
      },
    ])
    return id
  },
  closeShift(opts: {
    shiftId: string
    departureTime: string
    lunchMinutes: number
    photo: File | Blob
    travelStartTime?: string | null
    travelEndTime?: string | null
  }) {
    const path = `demo/${opts.shiftId}/d`
    photoUrls.set(path, URL.createObjectURL(opts.photo))
    shifts.set(
      shifts.data.map((s) =>
        s.id === opts.shiftId
          ? {
              ...s,
              departureTime: opts.departureTime,
              departureAt: fakeTs(new Date()),
              departurePhotoPath: path,
              lunchMinutes: opts.lunchMinutes,
              travelStartTime: opts.travelStartTime ?? null,
              travelEndTime: opts.travelEndTime ?? null,
              status: 'closed' as const,
            }
          : s,
      ),
    )
    return Promise.resolve()
  },
  adminUpdate(shiftId: string, fields: Partial<Shift>, editor?: AdminEdit) {
    shifts.set(
      shifts.data.map((s) => (s.id === shiftId ? { ...s, ...fields, ...(editor ? { editedByAdmin: editor } : {}) } : s)),
    )
    return Promise.resolve()
  },
  adminDelete(shiftId: string) {
    shifts.set(shifts.data.filter((s) => s.id !== shiftId))
    return Promise.resolve()
  },
}
