import AsyncStorage from '@react-native-async-storage/async-storage'
import client from './client'
import { API_URL } from './config'
import { Dog } from '../types'

export async function getDogs(): Promise<Dog[]> {
  const { data } = await client.get('/dogs/')
  return data
}

export async function getMyDogs(): Promise<Dog[]> {
  const { data } = await client.get('/dogs/')
  return data
}

export async function createDog(formData: FormData): Promise<Dog> {
  const token = await AsyncStorage.getItem('access_token')
  const res = await fetch(`${API_URL}/dogs/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = body?.detail || (body ? Object.values(body).flat().join(', ') : '') || 'Greška pri kreiranju psa'
    throw new Error(msg)
  }
  return body
}

export async function updateDog(id: number, formData: FormData): Promise<Dog> {
  const token = await AsyncStorage.getItem('access_token')
  const res = await fetch(`${API_URL}/dogs/${id}/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = body?.detail || (body ? Object.values(body).flat().join(', ') : '') || 'Greška pri ažuriranju psa'
    throw new Error(msg)
  }
  return body
}

export async function deleteDog(id: number): Promise<void> {
  await client.delete(`/dogs/${id}/`)
}

export async function deleteDogImage(id: number): Promise<void> {
  await client.delete(`/dogs/${id}/image/`)
}

export async function getDogProfile(id: number): Promise<Dog> {
  const { data } = await client.get(`/dogs/${id}/profile/`)
  return data
}
