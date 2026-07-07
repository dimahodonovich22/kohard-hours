import { deleteApp, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, firebaseConfig, useEmulators } from './firebase'
import type { Lang } from './types'

let counter = 0

/**
 * Админ создаёт работника напрямую (логин + пароль), аккаунт сразу активен.
 *
 * Тонкость: createUserWithEmailAndPassword на основном приложении залогинил бы
 * админа под нового работника. Поэтому создаём пользователя во ВТОРИЧНОМ
 * экземпляре Firebase — сессия админа остаётся нетронутой. Документ users
 * пишем через основной db (в контексте админа; разрешено правилами).
 */
export async function adminCreateWorker(opts: {
  name: string
  email: string
  phone: string
  password: string
  language: Lang
}): Promise<void> {
  const secondary = initializeApp(firebaseConfig, `admin-create-${Date.now()}-${counter++}`)
  const secondaryAuth = getAuth(secondary)
  if (useEmulators) {
    connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
  }
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, opts.email.trim(), opts.password)
    await updateProfile(cred.user, { displayName: opts.name.trim() })
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: opts.name.trim(),
      email: opts.email.trim().toLowerCase(),
      phone: opts.phone.trim(),
      role: 'worker',
      status: 'active',
      language: opts.language,
      createdAt: serverTimestamp(),
    })
    await signOut(secondaryAuth)
  } finally {
    await deleteApp(secondary)
  }
}
