export type DaySchedule = { active: boolean; from: string; to: string }

export interface WalkerProfile {
  hourly_rate: number | null
  daily_rate: number | null
  services: 'walking' | 'boarding' | 'both'
  bio: string
  active: boolean
  is_featured: boolean
  average_rating: number
  review_count: number
  availability?: Record<string, DaySchedule>
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  profile_image: string | null
  role: 'owner' | 'walker'
  address: string
  lat: number | null
  lng: number | null
  walker_profile?: WalkerProfile
  average_rating: number | null
  review_count: number
}

export interface Dog {
  id: number
  name: string
  breed: string
  age: number
  weight?: number
  size: 'small' | 'medium' | 'large'
  gender: 'male' | 'female'
  neutered: boolean
  temperament?: string
  notes: string
  image: string | null
}

export interface Reservation {
  id: number
  walker: number
  walker_info: User
  owner_info: User
  dogs: Dog[]
  service_type: 'walking' | 'boarding'
  duration: number | null
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
  notes: string
  cancelled_by: number | null
  created_at: string
  has_review: boolean
}

export interface Review {
  id: number
  rating: number
  comment: string
  reviewer: User
  created_at: string
}
