export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  role: 'owner' | 'walker' | 'admin'
  profile_image: string | null
  address: string
  lat: number | null
  lng: number | null
  walker_profile: WalkerProfile | null
}

export interface DaySchedule {
  active: boolean
  from: string
  to: string
}

export interface WalkerProfile {
  id: number
  hourly_rate: number
  daily_rate: number | null
  services: 'walking' | 'boarding' | 'both'
  bio: string
  active: boolean
  is_featured: boolean
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
  distance?: number | null
  is_favorited?: boolean
}

export interface Dog {
  id: number
  name: string
  breed: string
  age: number
  weight: number
  size: 'small' | 'medium' | 'large'
  gender: 'male' | 'female'
  neutered: boolean
  temperament: string
  notes: string
  image: string | null
}

export interface WalkerInfo {
  id: number
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  profile_image: string | null
  walker_profile: WalkerProfile
  average_rating: number | null
  review_count: number
}

export interface OwnerInfo {
  id: number
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  lat: number | null
  lng: number | null
  profile_image: string | null
}

export interface Reservation {
  id: number
  walker: number
  walker_info: WalkerInfo | null
  owner_info: OwnerInfo | null
  dogs: Dog[]
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'rejected' | 'completed' | 'cancelled'
  service_type: 'walking' | 'boarding'
  duration: number | null
  notes: string
  has_review: boolean
  walk_started_at: string | null
  last_lat: string | null
  last_lng: string | null
}
