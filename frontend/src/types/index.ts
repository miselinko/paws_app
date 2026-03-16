export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'owner' | 'walker'
  profile_image: string | null
}

export interface DaySchedule {
  active: boolean
  from: string
  to: string
}

export interface WalkerProfile {
  id: number
  hourly_rate: number
  services: 'walking' | 'boarding' | 'both'
  bio: string
  active: boolean
  average_rating: number
  review_count: number
  availability: Record<string, DaySchedule>
}

export interface Walker {
  id: number
  first_name: string
  last_name: string
  email: string
  profile_image: string | null
  address: string
  lat: number | null
  lng: number | null
  walker_profile: WalkerProfile
}

export interface Dog {
  id: number
  name: string
  breed: string
  age: number
  size: 'small' | 'medium' | 'large'
  gender: 'male' | 'female'
  neutered: boolean
  temperament: string
  notes: string
  image: string | null
}

export interface Reservation {
  id: number
  walker: number
  walker_info: { id: number; first_name: string; last_name: string } | null
  dogs: { id: number; name: string }[]
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
  service_type: 'walking' | 'boarding'
  duration: number | null
  notes: string
  has_review: boolean
}
