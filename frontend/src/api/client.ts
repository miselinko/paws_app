import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_URL, BACKEND_URL } from '../config'
import { markSlowEnd, markSlowStart, SLOW_REQUEST_MS } from './serverStatus'

type Cfg = InternalAxiosRequestConfig & { _retry?: boolean; _attempt?: number; _slowTimer?: ReturnType<typeof setTimeout>; _slow?: boolean }

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  // Buđenje Render servera može da traje i do ~60 s.
  timeout: 70_000,
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

api.interceptors.request.use((config: Cfg) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config._slowTimer = setTimeout(() => { config._slow = true; markSlowStart() }, SLOW_REQUEST_MS)
  return config
})

api.interceptors.response.use(
  (res) => { clearSlow(res.config as Cfg); return res },
  async (err: AxiosError) => {
    const original = err.config as Cfg | undefined
    clearSlow(original)
    if (!original) return Promise.reject(err)

    // Server se budi / mreža puca: ponovi samo bezbedne (GET) zahteve, sa pauzom.
    const method = (original.method || 'get').toLowerCase()
    const status = err.response?.status
    const transient = !err.response || (status != null && RETRYABLE_STATUS.has(status))
    original._attempt = (original._attempt ?? 1)
    if (transient && method === 'get' && original._attempt < MAX_ATTEMPTS) {
      original._attempt += 1
      await sleep(1500 * original._attempt)
      return api(original)
    }

    if (status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BACKEND_URL}/api/auth/refresh/`, { refresh }, { timeout: 70_000 })
          localStorage.setItem('access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (refreshErr) {
          // Izloguj samo ako je token zaista odbijen, ne kad server spava/mreža pukne.
          const rs = (refreshErr as AxiosError).response?.status
          if (rs === 401 || rs === 400) {
            localStorage.removeItem('access')
            localStorage.removeItem('refresh')
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(err)
  }
)

/** Probudi backend čim se aplikacija otvori (ne čeka korisnika). */
export function warmUpBackend() {
  fetch(`${BACKEND_URL}/api/health/`, { method: 'GET', cache: 'no-store' }).catch(() => {})
}

export default api
