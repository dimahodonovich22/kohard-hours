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

/* ---- Генератор демо-данных: 30 работников + месяц смен ---- */
const ADMIN_UID = 'demo-admin'
const IVAN_UID = 'demo-w0' // почасовой — под ним заходит демо-«Працівник»
const PETRO_UID = 'demo-w1' // проектный

const ri = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const FIRST = [
  'Іван', 'Петро', 'Олександр', 'Андрій', 'Микола', 'Сергій', 'Дмитро', 'Василь', 'Богдан', 'Тарас',
  'Юрій', 'Роман', 'Олег', 'Ігор', 'Максим', 'Віктор', 'Павло', 'Степан', 'Володимир', 'Артем',
  'Назар', 'Остап', 'Ярослав', 'Марія', 'Оксана', 'Наталія', 'Ірина', 'Софія', 'Ольга', 'Катерина',
]
const LAST = [
  'Коваленко', 'Бондаренко', 'Шевченко', 'Ткаченко', 'Кравченко', 'Мельник', 'Бойко', 'Ковальчук', 'Поліщук', 'Марченко',
  'Савченко', 'Руденко', 'Лисенко', 'Гончаренко', 'Мороз', 'Клименко', 'Данилюк', 'Кравець', 'Пилипчук', 'Захарчук',
  'Іваненко', 'Петренко', 'Сидоренко', 'Гнатюк', 'Дяченко', 'Романюк', 'Кулик', 'Науменко', 'Швець', 'Ткачук',
]

const HOURLY_OBJECTS = [
  'Kerkstraat 5, Antwerpen', 'Brugge — Markt 12', 'Meir 40, Antwerpen', 'Stationsstraat 8, Mechelen',
  'Grote Markt 3, Leuven', 'Nieuwstraat 22, Gent', 'Dorpsstraat 15, Aalst', 'Lange Nieuwstraat 7, Antwerpen',
]
const PROJECT_OBJECTS = [
  'Gent, Veldstraat 20', 'Vilvoorde — Industrieweg 9', 'Hasselt, Kempische Steenweg 55',
  'Kortrijk, Doorniksewijk 30', 'Oostende, Zeedijk 100', 'Brugge — Ezelstraat 44',
]

const objectsSeed: SiteObject[] = [
  ...HOURLY_OBJECTS.map((name, i) => ({ id: `obj-h-${i}`, name, workType: 'hourly' as WorkType })),
  ...PROJECT_OBJECTS.map((name, i) => ({ id: `obj-p-${i}`, name, workType: 'project' as WorkType })),
]

const usersSeed: UserProfile[] = [
  { uid: ADMIN_UID, name: 'Саша (власник)', email: 'admin@kohard.be', phone: '+32 470 00 00 01', role: 'admin', status: 'active', language: 'ua', createdAt: fakeTs(new Date()) },
]
const shiftsSeed: Shift[] = []
let sid = 1

const now = new Date()
const Y = now.getFullYear()
const M = now.getMonth()
const TODAY = now.getDate()

for (let i = 0; i < 30; i++) {
  const uidW = i === 0 ? IVAN_UID : i === 1 ? PETRO_UID : `demo-w${i}`
  const name = `${FIRST[i]} ${LAST[i]}`
  const workType: WorkType = i % 2 === 0 ? 'hourly' : 'project'
  const rate = ri(16, 24)
  usersSeed.push({
    uid: uidW,
    name,
    email: `worker${i}@kohard.be`,
    phone: `+32 470 ${String(100 + i).padStart(3, '0')} ${String(ri(10, 99))}`,
    role: 'worker',
    status: 'active',
    language: 'ua',
    createdAt: fakeTs(new Date(Y, M, 1)),
  })

  // Смены за текущий месяц: будни (пн–пт), с пропусками ~15%
  for (let d = 1; d <= TODAY; d++) {
    const day = new Date(Y, M, d)
    const dow = day.getDay()
    if (dow === 0 || dow === 6) continue
    if (Math.random() < 0.15) continue

    const id = `s${sid++}`
    const isToday = d === TODAY
    // немного открытых смен «прямо сейчас» на сегодня — оживить доску
    const open = isToday && i % 6 === 0
    const arrMin = ri(7 * 12, 8 * 12 + 6) * 5 // 07:00–08:30, шаг 5 мин

    if (workType === 'hourly') {
      const lunch = pick([30, 30, 45])
      const workedMin = ri(7, 10) * 60 + pick([0, 0, 30])
      const depMin = arrMin + workedMin + lunch
      shiftsSeed.push({
        id,
        userId: uidW,
        userName: name,
        date: `${Y}-${String(M + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        workType: 'hourly',
        projectAmount: null,
        objectName: pick(HOURLY_OBJECTS),
        objectId: null,
        arrivalTime: hhmm(arrMin),
        arrivalAt: fakeTs(new Date(Y, M, d, 8)),
        arrivalPhotoPath: `seed/${id}/a`,
        departureTime: open ? null : hhmm(depMin),
        departureAt: open ? null : fakeTs(new Date(Y, M, d, 17)),
        departurePhotoPath: open ? null : `seed/${id}/d`,
        lunchMinutes: open ? 0 : lunch,
        travelStartTime: null,
        travelEndTime: null,
        hourlyRate: rate,
        status: open ? 'open' : 'closed',
        editedByAdmin: null,
      })
    } else {
      const depMin = ri(16 * 12, 18 * 12) * 5 // 16:00–18:00
      shiftsSeed.push({
        id,
        userId: uidW,
        userName: name,
        date: `${Y}-${String(M + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        workType: 'project',
        projectAmount: open ? null : ri(20, 60) * 10, // 200–600 €
        objectName: pick(PROJECT_OBJECTS),
        objectId: null,
        arrivalTime: hhmm(arrMin),
        arrivalAt: fakeTs(new Date(Y, M, d, 8)),
        arrivalPhotoPath: `seed/${id}/a`,
        departureTime: open ? null : hhmm(depMin),
        departureAt: open ? null : fakeTs(new Date(Y, M, d, 17)),
        departurePhotoPath: open ? null : `seed/${id}/d`,
        lunchMinutes: 0,
        travelStartTime: null,
        travelEndTime: null,
        hourlyRate: 0,
        status: open ? 'open' : 'closed',
        editedByAdmin: null,
      })
    }
  }
}

// одна заявка на подтверждение — показать бейдж «Заявки»
usersSeed.push({ uid: uid('user'), name: 'Новий Кандидат', email: 'new@kohard.be', phone: '+32 470 00 00 99', role: 'worker', status: 'pending', language: 'ua', createdAt: fakeTs(new Date()) })

const users = new Coll<UserProfile>(usersSeed)
const objects = new Coll<SiteObject>(objectsSeed)
const shifts = new Coll<Shift>(shiftsSeed)

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
