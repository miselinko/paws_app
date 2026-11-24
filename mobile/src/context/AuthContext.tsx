import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { login as apiLogin } from '../api/auth'
import { getProfile } from '../api/users'
import { User } from '../types'
import { registerPushToken } from '../utils/notifications'
import { queryClient } from './queryClient'
import { onAuthLost } from '../api/serverStatus'

interface AuthContextType {
  isLoggedIn: boolean
  isLoading: boolean
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    AsyncStorage.getItem('access_token').then(async (token) => {
      if (token) {
        setIsLoggedIn(true)
        try {
          const profile = await getProfile()
          setUser(profile)
          registerPushToken()
        } catch {
          // token expired, will refresh on next request
        }
      }
      setIsLoading(false)
    })
  }, [])

  const lastProfileFetch = useRef(0)
  const isLoggedInRef = useRef(false)
  isLoggedInRef.current = isLoggedIn

  const refreshUser = useCallback(async () => {
    if (!isLoggedInRef.current) return
    lastProfileFetch.current = Date.now()
    try {
      setUser(await getProfile())
    } catch {
      // 401 posle neuspešnog refresh-a javlja onAuthLost; ostale greške (mreža) ignorišemo
    }
  }, [])

  // Nalog obrisan/deaktiviran ili refresh token istekao → odjava, bez zastarelih podataka u kešu.
  useEffect(() => onAuthLost(() => {
    queryClient.clear()
    setIsLoggedIn(false)
    setUser(null)
  }), [])

  // Kad se aplikacija vrati u prvi plan, osveži profil (najviše jednom u minutu).
  useEffect(() => {
    const sub = AppState.addEventListener('change', status => {
      if (status === 'active' && Date.now() - lastProfileFetch.current > 60_000) refreshUser()
    })
    return () => sub.remove()
  }, [refreshUser])

  async function login(email: string, password: string) {
    const { access, refresh } = await apiLogin(email, password)
    await AsyncStorage.multiSet([
      ['access_token', access],
      ['refresh_token', refresh],
    ])
    setIsLoggedIn(true)
    const profile = await getProfile()
    setUser(profile)
    registerPushToken()
  }

  async function logout() {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token'])
    queryClient.clear()
    setIsLoggedIn(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
