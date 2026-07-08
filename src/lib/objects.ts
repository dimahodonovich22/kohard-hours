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

/** Объект/адрес из справочника, который ведёт админ */
export interface SiteObject {
  id: string
  name: string
}

const objectsCol = collection(db, 'objects')

/** Подписка на список объектов (сортировка по имени, работает и оффлайн) */
export function watchObjects(cb: (items: SiteObject[]) => void): () => void {
  if (isDemo) return demoDb.watchObjects(cb)
  return onSnapshot(objectsCol, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SiteObject)
    items.sort((a, b) => a.name.localeCompare(b.name))
    cb(items)
  })
}

export function addObject(name: string): Promise<unknown> {
  if (isDemo) return demoDb.addObject(name)
  return addDoc(objectsCol, { name: name.trim(), createdAt: serverTimestamp() })
}

export function renameObject(id: string, name: string): Promise<void> {
  if (isDemo) return demoDb.renameObject(id, name)
  return updateDoc(doc(objectsCol, id), { name: name.trim() })
}

export function deleteObject(id: string): Promise<void> {
  if (isDemo) return demoDb.deleteObject(id)
  return deleteDoc(doc(objectsCol, id))
}
