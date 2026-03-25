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
  if (!res.ok) throw new Error('Create dog failed')
  return res.json()
}

export async function updateDog(id: number, formData: FormData): Promise<Dog> {
  const token = await AsyncStorage.getItem('access_token')
  const res = await fetch(`${API_URL}/dogs/${id}/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error('Update dog failed')
  return res.json()
}

export async function deleteDog(id: number): Promise<void> {
  await client.delete(`/dogs/${id}/`)
}

export async function deleteDogImage(id: number): Promise<void> {
  await client.delete(`/dogs/${id}/image/`)
}
