import api from './client'
export const createReview = (data: { reservation: number; rating: number; comment: string }) =>
  api.post('/reviews/', data).then(r => r.data)
