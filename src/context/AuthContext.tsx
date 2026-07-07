import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import i18n, { setLang, type Lang } from '@/i18n'
import type { UserProfile } from '@/lib/types'

interface AuthCtx {
  user: User | null
  profile: UserProfile | null
  /** true, пока не известно состояние авторизации/профиля */
  loading: boolean
  register: (name: string, email: string, phone: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  changeLanguage: (lang: Lang) => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
      if (!u) setProfile(null)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setProfileReady(false)
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const p = snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null
        setProfile(p)
        setProfileReady(true)
        if (p && p.language && p.language !== i18n.language) setLang(p.language)
      },
      () => setProfileReady(true),
    )
    return unsub
  }, [user])

  async function register(name: string, email: string, phone: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    await updateProfile(cred.user, { displayName: name.trim() })
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: 'worker',
      status: 'pending',
      language: (i18n.language as Lang) || 'ua',
      createdAt: serverTimestamp(),
    })
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }

  async function logout() {
    await signOut(auth)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email.trim())
  }

  function changeLanguage(lang: Lang) {
    setLang(lang)
    if (user && profile) {
      void updateDoc(doc(db, 'users', user.uid), { language: lang })
    }
  }

  return (
    <Ctx.Provider
      value={{
        user,
        profile,
        loading: !authReady || !profileReady,
        register,
        login,
        logout,
        resetPassword,
        changeLanguage,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
