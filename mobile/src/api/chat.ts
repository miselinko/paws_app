import client from './client'

export interface ChatUser {
  id: number
  first_name: string
  last_name: string
  role: string
  profile_image: string | null
}

export interface Conversation {
  user: ChatUser
  last_message: string
  time: string
  unread: number
}

export interface Message {
  id: number
  sender: ChatUser
  text: string
  created_at: string
}

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await client.get('/chat/')
  return data
}

export interface MessagesResponse { results: Message[]; has_more: boolean }

export async function getMessages(userId: number, before?: number): Promise<MessagesResponse> {
  const { data } = await client.get(`/chat/${userId}/`, { params: before ? { before } : {} })
  return data
}

export async function sendMessage(userId: number, text: string): Promise<Message> {
  const { data } = await client.post(`/chat/${userId}/`, { text })
  return data
}

export async function sendBotMessage(
  message: string,
  history: { role: string; content: string }[]
): Promise<{ reply: string }> {
  const { data } = await client.post('/chat/bot/', { message, history })
  return data
}

export async function deleteConversation(userId: number): Promise<void> {
  await client.delete(`/chat/${userId}/delete/`)
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await client.get('/chat/unread/')
  return data.count ?? 0
}
