import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from './config'
import { emitAuthLost, markSlowEnd, markSlowStart, SLOW_REQUEST_MS } from './serverStatus'

type Cfg = InternalAxiosRequestConfig & { _retry?: boolean; _attempt?: number; _slowTimer?: ReturnType<typeof setTimeout>; _slow?: boolean }

const client = axios.create({
  baseURL: API_URL,
  // Buđenje Render servera (Free plan) zna da traje 30–60 s.
  timeout: 70000,
})

const RETRYABLE_STATUS = new Set([502, 503, 504])
const MAX_ATTEMPTS = 3
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function clearSlow(cfg?: Cfg) {
  if (!cfg) return
  if (cfg._slowTimer) clearTimeout(cfg._slowTimer)
  cfg._slowTimer = undefined
  if (cfg._slow) { cfg._slow = false; markSlowEnd() }
}

client.interceptors.request.use(async (config: Cfg) => {
  const token = await AsyncStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config._slowTimer = setTimeout(() => { config._slow = true; markSlowStart() }, SLOW_REQUEST_MS)
  return config
})

// Token refresh mutex — only one refresh at a time (#16)
let isRefreshing = false
let refreshSubscribers: ((token: string | null) => void)[] = []

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function waitForRefresh(): Promise<string | null> {
  return new Promise((resolve) => { refreshSubscribers.push(resolve) })
}

client.interceptors.response.use(
  (response) => { clearSlow(response.config as Cfg); return response },
  async (error: AxiosError) => {
    const original = error.config as Cfg | undefined
    clearSlow(original)
    if (!original) return Promise.reject(error)

    // Server spava ili mreža puca: ponovi GET zahteve sa pauzom.
    const method = (original.method || 'get').toLowerCase()
    const status = error.response?.status
    const transient = !error.response || (status != null && RETRYABLE_STATUS.has(status))
    original._attempt = original._attempt ?? 1
    if (transient && method === 'get' && original._attempt < MAX_ATTEMPTS) {
      original._attempt += 1
      await sleep(1500 * original._attempt)
      return client(original)
    }

    if (status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        const newToken = await waitForRefresh()
        if (!newToken) return Promise.reject(error)
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      }

      isRefreshing = true
      try {
        const refresh = await AsyncStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh }, { timeout: 70000 })
        await AsyncStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        onRefreshed(data.access)
        return client(original)
      } catch (refreshErr) {
        onRefreshed(null)
        const rs = (refreshErr as AxiosError).response?.status
        // Odjavi samo kad je token zaista odbijen (obrisan/deaktiviran nalog), ne kad server spava.
        if (rs === 401 || rs === 400 || (refreshErr as Error).message === 'No refresh token') {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token'])
          emitAuthLost()
        }
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default client
