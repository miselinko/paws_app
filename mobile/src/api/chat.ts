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

export async function getMessages(userId: number): Promise<Message[]> {
  const { data } = await client.get(`/chat/${userId}/`)
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
