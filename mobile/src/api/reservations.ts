import client from './client'
import { Reservation } from '../types'

export async function getReservations(): Promise<Reservation[]> {
  const { data } = await client.get('/reservations/')
  return data
}

export async function createReservation(payload: {
  walker: number
  dog_ids: number[]
  service_type: 'walking' | 'boarding'
  duration?: number
  start_time: string
  end_time: string
  notes?: string
}): Promise<Reservation> {
  const { data } = await client.post('/reservations/', payload)
  return data
}

export async function cancelReservation(id: number): Promise<Reservation> {
  const { data } = await client.post(`/reservations/${id}/cancel/`)
  return data
}

export async function respondReservation(id: number, status: 'confirmed' | 'rejected'): Promise<Reservation> {
  const { data } = await client.patch(`/reservations/${id}/respond/`, { status })
  return data
}

export async function completeReservation(id: number): Promise<Reservation> {
  const { data } = await client.post(`/reservations/${id}/complete/`)
  return data
}
