import client from './client'
import { Review } from '../types'

export async function getWalkerReviews(walkerId: number): Promise<Review[]> {
  const { data } = await client.get(`/reviews/walker/${walkerId}/`)
  return data
}

export async function createReview(payload: {
  reservation: number
  rating: number
  comment: string
}): Promise<Review> {
  const { data } = await client.post('/reviews/', payload)
  return data
}
