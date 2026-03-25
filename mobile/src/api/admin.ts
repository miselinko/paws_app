import client from './client'

export interface AdminStats {
  total_users: number
  owners: number
  walkers: number
  admins: number
  active_users: number
  inactive_users: number
  total_reservations: number
  pending_reservations: number
  completed_reservations: number
  cancelled_reservations: number
  total_reviews: number
  total_dogs: number
}

export interface AdminUser {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  profile_image: string | null
  role: 'owner' | 'walker' | 'admin'
  address: string
  is_active: boolean
  created_at: string
  dogs_count: number
  reservations_count: number
  reviews_count: number
  walker_profile: {
    services: string
    hourly_rate: string
    active: boolean
    is_featured: boolean
  } | null
}

export interface AdminUserDetail extends Omit<AdminUser, 'dogs_count' | 'reservations_count' | 'reviews_count' | 'walker_profile'> {
  lat: number | null
  lng: number | null
  walker_profile: {
    services: string
    hourly_rate: string
    daily_rate: string | null
    bio: string
    active: boolean
    is_featured: boolean
    average_rating: number
    review_count: number
  } | null
  dogs: { id: number; name: string; breed: string; age: number; size: string; image: string | null }[]
  recent_reservations: {
    id: number
    status: string
    service_type: string
    start_time: string
    other_user: string
  }[]
  stats: {
    total_reservations: number
    completed: number
    cancelled: number
    pending: number
  }
}

export interface AdminUsersResponse {
  count: number
  next: string | null
  previous: string | null
  results: AdminUser[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface AdminReservation {
  id: number
  owner_name: string
  owner_id: number
  walker_name: string
  walker_id: number
  status: string
  service_type: string
  start_time: string
  end_time: string
  duration: number | null
  notes: string
  created_at: string
}

export interface AdminReview {
  id: number
  owner_name: string
  owner_id: number
  walker_name: string
  walker_id: number
  rating: number
  comment: string
  created_at: string
}

export interface AdminDog {
  id: number
  name: string
  breed: string
  age: number
  size: string
  gender: string
  owner_name: string
  owner_id: number
  image: string | null
  created_at: string
}

export const getAdminStats = () =>
  client.get<AdminStats>('/users/admin/stats/').then(r => r.data)

export const getAdminUsers = (params?: Record<string, string>) =>
  client.get<AdminUsersResponse>('/users/admin/users/', { params }).then(r => r.data)

export const getAdminUser = (id: number) =>
  client.get<AdminUserDetail>(`/users/admin/users/${id}/`).then(r => r.data)

export const toggleUserActive = (id: number, is_active: boolean) =>
  client.patch<AdminUserDetail>(`/users/admin/users/${id}/`, { is_active }).then(r => r.data)

export const toggleWalkerFeatured = (id: number, is_featured: boolean) =>
  client.patch<AdminUserDetail>(`/users/admin/users/${id}/`, { is_featured }).then(r => r.data)

export const deleteUser = (id: number) =>
  client.delete(`/users/admin/users/${id}/`)

export const getAdminReservations = (params?: Record<string, string>) =>
  client.get<PaginatedResponse<AdminReservation>>('/users/admin/reservations/', { params }).then(r => r.data)

export const getAdminReviews = (params?: Record<string, string>) =>
  client.get<PaginatedResponse<AdminReview>>('/users/admin/reviews/', { params }).then(r => r.data)

export const getAdminDogs = (params?: Record<string, string>) =>
  client.get<PaginatedResponse<AdminDog>>('/users/admin/dogs/', { params }).then(r => r.data)
