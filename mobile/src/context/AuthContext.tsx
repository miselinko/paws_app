import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { login as apiLogin } from '../api/auth'
import { getProfile } from '../api/users'
import { User } from '../types'
import { registerPushToken } from '../utils/notifications'
import { queryClient } from './queryClient'

interface AuthContextType {
  isLoggedIn: boolean
  isLoading: boolean
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
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
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
