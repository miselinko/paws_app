export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export const imgUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `${BACKEND_URL}${url}`
}
