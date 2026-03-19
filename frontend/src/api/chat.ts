import api from './client'

export interface ChatUser {
  id: number; first_name: string; last_name: string; role: string; profile_image: string | null
}
export interface Conversation {
  user: ChatUser; last_message: string; time: string; unread: number
}
export interface Message {
  id: number; sender: ChatUser; text: string; created_at: string
}

export const getConversations = () => api.get('/chat/').then(r => r.data)
export const getMessages = (userId: number) => api.get(`/chat/${userId}/`).then(r => r.data)
export const sendMessage = (userId: number, text: string) =>
  api.post(`/chat/${userId}/`, { text }).then(r => r.data)
export const getUnreadCount = () => api.get('/chat/unread/').then(r => r.data)
export const sendBotMessage = (message: string, history: { role: string; content: string }[]) =>
  api.post('/chat/bot/', { message, history }).then(r => r.data)
export const deleteConversation = (userId: number) =>
  api.delete(`/chat/${userId}/delete/`)
