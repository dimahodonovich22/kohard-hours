import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { compressPhoto } from './photos'
import { enqueuePhoto } from './uploadQueue'
import { demoDb, isDemo } from './demo'
import type { AdminEdit, Shift } from './types'

const shiftsCol = collection(db, 'shifts')

function snapToShift(id: string, data: Record<string, unknown>): Shift {
  return { id, ...data } as unknown as Shift
}

/**
 * Открыть смену (приезд). Не ждём сервер: запись падает в локальный кэш
 * Firestore мгновенно, фото — в IndexedDB-очередь. Всё синхронизируется само.
 */
export async function openShift(opts: {
  userId: string
  userName: string
  date: string
  workType: 'hourly' | 'project'
  objectName: string
  objectId?: string | null
  arrivalTime: string
  photo: File | Blob
  hourlyRate: number
  travelStartTime?: string | null
  travelEndTime?: string | null
}): Promise<string> {
  if (isDemo) return demoDb.openShift(opts)
  const refDoc = doc(shiftsCol)
  const photoPath = `photos/${opts.userId}/${refDoc.id}/arrival.jpg`

  const compressed = await compressPhoto(opts.photo)
  await enqueuePhoto(photoPath, compressed)

  void setDoc(refDoc, {
    userId: opts.userId,
    userName: opts.userName,
    date: opts.date,
    workType: opts.workType,
    projectAmount: null,
    objectName: opts.objectName.trim(),
    objectId: opts.objectId ?? null,
    arrivalTime: opts.arrivalTime,
    arrivalAt: serverTimestamp(),
    arrivalPhotoPath: photoPath,
    departureTime: null,
    departureAt: null,
    departurePhotoPath: null,
    lunchMinutes: 0,
    travelStartTime: opts.travelStartTime ?? null,
    travelEndTime: opts.travelEndTime ?? null,
    hourlyRate: opts.hourlyRate || 0,
    status: 'open',
    editedByAdmin: null,
  })
  return refDoc.id
}

/** Закрыть смену (отъезд) */
export async function closeShift(opts: {
  shiftId: string
  userId: string
  departureTime: string
  lunchMinutes: number
  photo: File | Blob
  travelStartTime?: string | null
  travelEndTime?: string | null
}): Promise<void> {
  if (isDemo) return demoDb.closeShift(opts)
  const photoPath = `photos/${opts.userId}/${opts.shiftId}/departure.jpg`
  const compressed = await compressPhoto(opts.photo)
  await enqueuePhoto(photoPath, compressed)

  void updateDoc(doc(shiftsCol, opts.shiftId), {
    departureTime: opts.departureTime,
    departureAt: serverTimestamp(),
    departurePhotoPath: photoPath,
    lunchMinutes: opts.lunchMinutes,
    travelStartTime: opts.travelStartTime ?? null,
    travelEndTime: opts.travelEndTime ?? null,
    status: 'closed',
  })
}

/**
 * Правка админом. Если передан editor — ставится пометка «исправлено админом».
 * Пометку не ставим, когда админ лишь проставляет сумму проекта (штатный шаг).
 */
export function adminUpdateShift(
  shiftId: string,
  fields: Partial<Omit<Shift, 'id'>>,
  editor?: AdminEdit,
): Promise<void> {
  if (isDemo) return demoDb.adminUpdate(shiftId, fields, editor)
  return updateDoc(doc(shiftsCol, shiftId), editor ? { ...fields, editedByAdmin: editor } : fields)
}

export function adminDeleteShift(shiftId: string): Promise<void> {
  if (isDemo) return demoDb.adminDelete(shiftId)
  return deleteDoc(doc(shiftsCol, shiftId))
}

/** Подписка: смены работника за день (обычно 0–2 шт.) */
export function watchDayShifts(
  userId: string,
  date: string,
  cb: (shifts: Shift[]) => void,
): () => void {
  if (isDemo) return demoDb.watchDay(userId, date, cb)
  const q = query(shiftsCol, where('userId', '==', userId), where('date', '==', date))
  return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    const items = snap.docs.map((d) => snapToShift(d.id, d.data()))
    items.sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))
    cb(items)
  })
}

/** Подписка: смены работника за период (история) */
export function watchUserShifts(
  userId: string,
  start: string,
  end: string,
  cb: (shifts: Shift[]) => void,
): () => void {
  if (isDemo) return demoDb.watchUser(userId, start, end, cb)
  const q = query(
    shiftsCol,
    where('userId', '==', userId),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc'),
  )
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => snapToShift(d.id, d.data()))))
}

/** Подписка (админ): все смены за период */
export function watchAllShifts(
  start: string,
  end: string,
  cb: (shifts: Shift[]) => void,
): () => void {
  if (isDemo) return demoDb.watchAll(start, end, cb)
  const q = query(shiftsCol, where('date', '>=', start), where('date', '<=', end))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => snapToShift(d.id, d.data()))))
}
