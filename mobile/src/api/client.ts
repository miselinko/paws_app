import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from './config'

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token refresh mutex — only one refresh at a time (#16)
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void): Promise<string> {
  return new Promise((resolve) => {
    refreshSubscribers.push((token: string) => {
      resolve(token)
      cb(token)
    })
  })
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        const newToken = await addRefreshSubscriber((t) => t)
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      }

      isRefreshing = true
      try {
        const refresh = await AsyncStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh })
        await AsyncStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        onRefreshed(data.access)
        return client(original)
      } catch {
        refreshSubscribers = []
        await AsyncStorage.multiRemove(['access_token', 'refresh_token'])
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default client
