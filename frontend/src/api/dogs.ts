import api from './client'
export const getMyDogs = () => api.get('/dogs/').then(r => r.data)
export const createDog = (data: FormData) => api.post('/dogs/', data).then(r => r.data)
export const updateDog = (id: number, data: FormData) => api.patch(`/dogs/${id}/`, data).then(r => r.data)
export const deleteDog = (id: number) => api.delete(`/dogs/${id}/`).then(r => r.data)
