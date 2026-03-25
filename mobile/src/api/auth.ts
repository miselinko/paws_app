import axios from 'axios'
import { API_URL } from './config'

export async function login(email: string, password: string) {
  const { data } = await axios.post(`${API_URL}/auth/login/`, { email, password })
  return data as { access: string; refresh: string }
}

export interface RegisterPayload {
  email: string
  first_name: string
  last_name: string
  role: 'owner' | 'walker'
  address: string
  password: string
  password2: string
  lat?: number | null
  lng?: number | null
  services?: 'walking' | 'boarding' | 'both'
}

export async function register(payload: RegisterPayload) {
  const { data } = await axios.post(`${API_URL}/users/register/`, payload)
  return data
}
