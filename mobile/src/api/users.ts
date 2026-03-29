import AsyncStorage from '@react-native-async-storage/async-storage'
import client from './client'
import { API_URL } from './config'
import { User } from '../types'

export interface WalkerFilters {
  usluga?: string
  velicina?: string
  cena_max?: string
  search?: string
  lat?: string
  lng?: string
  radius?: string
}

export async function getProfile(): Promise<User> {
  const { data } = await client.get('/users/profile/')
  return data
}

export async function updateMyProfile(data: Partial<User>): Promise<User> {
  const { data: res } = await client.patch('/users/profile/', data)
  return res
}

export async function updateWalkerProfile(data: Record<string, unknown>): Promise<void> {
  await client.patch('/users/profile/walker/', data)
}

export async function uploadProfileImage(
  uri: string,
  fileName?: string | null,
  mimeType?: string | null,
): Promise<void> {
  const token = await AsyncStorage.getItem('access_token')
  const fd = new FormData()
  const name = fileName || `photo_${Date.now()}.jpg`
  const type = mimeType || 'image/jpeg'
  fd.append('profile_image', { uri, name, type } as any)
  const res = await fetch(`${API_URL}/users/profile/image/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  if (!res.ok) throw new Error('Upload failed')
}

export async function deleteProfileImage(): Promise<void> {
  await client.delete('/users/profile/image/')
}

export async function deleteAccount(): Promise<void> {
  await client.delete('/users/profile/delete/')
}

export async function getWalkers(filters?: WalkerFilters): Promise<User[]> {
  const { data } = await client.get('/users/walkers/', { params: filters })
  return data.results ?? data
}

export async function getWalker(id: number): Promise<User> {
  const { data } = await client.get(`/users/walkers/${id}/`)
  return data
}

export async function savePushToken(token: string): Promise<void> {
  await client.post('/users/push-token/', { token })
}

export async function toggleFavorite(walkerId: number): Promise<{ is_favorited: boolean }> {
  const { data } = await client.post(`/users/favorites/${walkerId}/toggle/`)
  return data
}

export async function getFavoriteIds(): Promise<number[]> {
  const { data } = await client.get('/users/favorites/')
  return data
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post('/users/forgot-password/', { email })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await client.post('/users/reset-password/', { token, password })
}

export async function verifyEmail(token: string): Promise<{ detail: string }> {
  const { data } = await client.get('/users/verify-email/', { params: { token } })
  return data
}
