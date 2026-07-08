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

/** Объект/адрес из справочника, который ведёт админ */
export interface SiteObject {
  id: string
  name: string
}

const objectsCol = collection(db, 'objects')

/** Подписка на список объектов (сортировка по имени, работает и оффлайн) */
export function watchObjects(cb: (items: SiteObject[]) => void): () => void {
  return onSnapshot(objectsCol, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SiteObject)
    items.sort((a, b) => a.name.localeCompare(b.name))
    cb(items)
  })
}

export function addObject(name: string): Promise<unknown> {
  return addDoc(objectsCol, { name: name.trim(), createdAt: serverTimestamp() })
}

export function renameObject(id: string, name: string): Promise<void> {
  return updateDoc(doc(objectsCol, id), { name: name.trim() })
}

export function deleteObject(id: string): Promise<void> {
  return deleteDoc(doc(objectsCol, id))
}
