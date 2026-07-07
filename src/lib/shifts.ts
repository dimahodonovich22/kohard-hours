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
  objectName: string
  arrivalTime: string
  photo: File | Blob
  hourlyRate: number
  travelStartTime?: string | null
  travelEndTime?: string | null
}): Promise<string> {
  const refDoc = doc(shiftsCol)
  const photoPath = `photos/${opts.userId}/${refDoc.id}/arrival.jpg`

  const compressed = await compressPhoto(opts.photo)
  await enqueuePhoto(photoPath, compressed)

  void setDoc(refDoc, {
    userId: opts.userId,
    userName: opts.userName,
    date: opts.date,
    objectName: opts.objectName.trim(),
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

/** Правка админом: любые поля + пометка «исправлено админом» */
export function adminUpdateShift(
  shiftId: string,
  fields: Partial<Omit<Shift, 'id'>>,
  editor: AdminEdit,
): Promise<void> {
  return updateDoc(doc(shiftsCol, shiftId), { ...fields, editedByAdmin: editor })
}

export function adminDeleteShift(shiftId: string): Promise<void> {
  return deleteDoc(doc(shiftsCol, shiftId))
}

/** Подписка: смены работника за день (обычно 0–2 шт.) */
export function watchDayShifts(
  userId: string,
  date: string,
  cb: (shifts: Shift[]) => void,
): () => void {
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
  const q = query(shiftsCol, where('date', '>=', start), where('date', '<=', end))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => snapToShift(d.id, d.data()))))
}
