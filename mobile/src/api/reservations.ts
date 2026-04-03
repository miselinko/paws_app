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
  const { data } = await client.post(`/reservations/${id}/respond/`, { status })
  return data
}

export async function completeReservation(id: number): Promise<Reservation> {
  const { data } = await client.post(`/reservations/${id}/complete/`)
  return data
}

export async function startWalk(id: number): Promise<{ status: string }> {
  const { data } = await client.post(`/reservations/${id}/start/`)
  return data
}

export interface WalkLocation {
  lat: string | null
  lng: string | null
  walk_started_at: string | null
  status: string
}

export async function updateWalkLocation(id: number, lat: number, lng: number): Promise<void> {
  await client.post(`/reservations/${id}/location/`, { lat, lng })
}

export async function getWalkLocation(id: number): Promise<WalkLocation> {
  const { data } = await client.get(`/reservations/${id}/location/`)
  return data
}

export async function getPendingCount(): Promise<number> {
  const { data } = await client.get('/reservations/pending-count/')
  return data.count ?? 0
}

export interface BusySlot {
  from: string
  to: string
  status: string
}

export async function getBusySlots(walkerId: number, date: string): Promise<BusySlot[]> {
  const { data } = await client.get('/reservations/busy/', { params: { walker: walkerId, date } })
  return data
}
