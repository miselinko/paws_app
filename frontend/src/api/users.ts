import api from './client'
export const getMyProfile = () => api.get('/users/profile/').then(r => r.data)
export const updateMyProfile = (data: unknown) => api.patch('/users/profile/', data).then(r => r.data)
export const updateWalkerProfile = (data: unknown) => api.patch('/users/profile/walker/', data).then(r => r.data)
export const uploadProfileImage = (file: File) => {
  const fd = new FormData()
  fd.append('profile_image', file)
  return api.patch('/users/profile/image/', fd).then(r => r.data)
}
export const getWalkers = (params?: Record<string, string>) => api.get('/users/walkers/', { params }).then(r => r.data.results ?? r.data)
export const getWalker = (id: number) => api.get(`/users/walkers/${id}/`).then(r => r.data)
export const forgotPassword = (email: string) => api.post('/users/forgot-password/', { email }).then(r => r.data)
export const resetPassword = (token: string, password: string) => api.post('/users/reset-password/', { token, password }).then(r => r.data)
export const deleteAccount = () => api.delete('/users/profile/delete/')
