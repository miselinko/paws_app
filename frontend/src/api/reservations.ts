import api from './client'
export const getReservations = () => api.get('/reservations/').then(r => r.data)
export const createReservation = (data: unknown) => api.post('/reservations/', data).then(r => r.data)
export const cancelReservation = (id: number) => api.post(`/reservations/${id}/cancel/`).then(r => r.data)
export const respondToReservation = (id: number, status: string) =>
  api.post(`/reservations/${id}/respond/`, { status }).then(r => r.data)
export const completeReservation = (id: number) =>
  api.post(`/reservations/${id}/complete/`).then(r => r.data)
export const getPendingCount = () =>
  api.get('/reservations/pending-count/').then(r => r.data)
export const startWalk = (id: number) =>
  api.post(`/reservations/${id}/start/`).then(r => r.data)
export const updateWalkLocation = (id: number, lat: number, lng: number) =>
  api.post(`/reservations/${id}/location/`, { lat, lng }).then(r => r.data)
export const getWalkLocation = (id: number): Promise<{ lat: string | null; lng: string | null; walk_started_at: string | null; status: string }> =>
  api.get(`/reservations/${id}/location/`).then(r => r.data)
export const getBusySlots = (walkerId: number, date: string): Promise<{ from: string; to: string; status: string }[]> =>
  api.get('/reservations/busy/', { params: { walker: walkerId, date } }).then(r => r.data)
