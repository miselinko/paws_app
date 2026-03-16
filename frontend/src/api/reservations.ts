import api from './client'
export const getReservations = () => api.get('/reservations/').then(r => r.data)
export const createReservation = (data: unknown) => api.post('/reservations/', data).then(r => r.data)
export const cancelReservation = (id: number) => api.post(`/reservations/${id}/cancel/`).then(r => r.data)
export const respondToReservation = (id: number, status: string) =>
  api.post(`/reservations/${id}/respond/`, { status }).then(r => r.data)
