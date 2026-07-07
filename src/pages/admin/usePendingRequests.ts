import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { UserProfile } from '@/lib/types'

export function usePendingRequests(): UserProfile[] {
  const [items, setItems] = useState<UserProfile[]>([])
  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'pending'))
    return onSnapshot(q, (snap) =>
      setItems(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)),
    )
  }, [])
  return items
}

export function useAllUsers(): UserProfile[] | null {
  const [items, setItems] = useState<UserProfile[] | null>(null)
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
      users.sort((a, b) => a.name.localeCompare(b.name))
      setItems(users)
    })
  }, [])
  return items
}
