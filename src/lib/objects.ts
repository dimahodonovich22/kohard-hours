import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { demoDb, isDemo } from './demo'
import type { WorkType } from './types'

/** Объект/адрес из справочника, который ведёт админ */
export interface SiteObject {
  id: string
  name: string
  /** Тип работы на объекте, задаёт админ (по нему определяется тип смены) */
  workType: WorkType
}

const objectsCol = collection(db, 'objects')

/** Подписка на список объектов (сортировка по имени, работает и оффлайн) */
export function watchObjects(cb: (items: SiteObject[]) => void): () => void {
  if (isDemo) return demoDb.watchObjects(cb)
  return onSnapshot(objectsCol, (snap) => {
    const items = snap.docs.map((d) => {
      const data = d.data()
      // старые объекты без типа считаем почасовыми
      return { id: d.id, name: data.name as string, workType: (data.workType ?? 'hourly') as WorkType }
    })
    items.sort((a, b) => a.name.localeCompare(b.name))
    cb(items)
  })
}

export function addObject(name: string, workType: WorkType): Promise<unknown> {
  if (isDemo) return demoDb.addObject(name, workType)
  return addDoc(objectsCol, { name: name.trim(), workType, createdAt: serverTimestamp() })
}

export function renameObject(id: string, name: string): Promise<void> {
  if (isDemo) return demoDb.renameObject(id, name)
  return updateDoc(doc(objectsCol, id), { name: name.trim() })
}

export function setObjectType(id: string, workType: WorkType): Promise<void> {
  if (isDemo) return demoDb.setObjectType(id, workType)
  return updateDoc(doc(objectsCol, id), { workType })
}

export function deleteObject(id: string): Promise<void> {
  if (isDemo) return demoDb.deleteObject(id)
  return deleteDoc(doc(objectsCol, id))
}
