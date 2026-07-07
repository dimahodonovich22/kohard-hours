/**
 * Очередь загрузки фото. Фото кладётся в IndexedDB сразу (переживает
 * закрытие приложения и отсутствие сети) и загружается в Firebase Storage
 * с ретраями: при старте приложения, при появлении сети и раз в 30 секунд.
 */
import { openDB, type IDBPDatabase } from 'idb'
import { ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'

interface QueueItem {
  path: string
  blob: Blob
  createdAt: number
  tries: number
}

const DB_NAME = 'kohard-photo-queue'
const STORE = 'photos'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: 'path' })
    },
  })
  return dbPromise
}

const listeners = new Set<() => void>()

/** Подписка на изменения очереди (для индикатора «фото загружается») */
export function onQueueChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  listeners.forEach((fn) => fn())
}

export async function enqueuePhoto(path: string, blob: Blob): Promise<void> {
  const db = await getDb()
  const item: QueueItem = { path, blob, createdAt: Date.now(), tries: 0 }
  await db.put(STORE, item)
  notify()
  void processQueue()
}

export async function pendingCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE)
}

export async function isPending(path: string): Promise<boolean> {
  const db = await getDb()
  return (await db.getKey(STORE, path)) !== undefined
}

let processing = false

export async function processQueue(): Promise<void> {
  if (processing || !navigator.onLine) return
  processing = true
  try {
    const db = await getDb()
    const items = (await db.getAll(STORE)) as QueueItem[]
    for (const item of items) {
      try {
        await uploadBytes(ref(storage, item.path), item.blob, {
          contentType: 'image/jpeg',
          customMetadata: { queuedAt: String(item.createdAt) },
        })
        await db.delete(STORE, item.path)
        notify()
      } catch {
        item.tries += 1
        await db.put(STORE, item)
        // не удаляем — попробуем в следующий проход
      }
    }
  } finally {
    processing = false
  }
}

export function startQueueWorker(): void {
  void processQueue()
  window.addEventListener('online', () => void processQueue())
  setInterval(() => void processQueue(), 30_000)
}
