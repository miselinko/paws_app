export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8001/api'

export const imgUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  const base = API_URL.replace('/api', '')
  return `${base}${url}`
}
