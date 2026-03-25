import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Alert, ScrollView,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import {
  getConversations, getMessages, sendMessage, sendBotMessage, deleteConversation,
  Conversation, Message, MessagesResponse,
} from '../api/chat'
import { imgUrl } from '../api/config'
import { useAuth } from '../context/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'malopre'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
  if (diff < 86400000) return d.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('sr-Latn', { day: 'numeric', month: 'short' })
}

const AVATAR_COLORS = ['#6d28d9', '#2563eb', '#059669', '#dc2626', '#d97706']

function Avatar({ first_name, last_name, profile_image, id, size = 36 }: {
  first_name: string; last_name: string; profile_image: string | null; id: number; size?: number
}) {
  const photo = imgUrl(profile_image)
  const color = AVATAR_COLORS[id % AVATAR_COLORS.length]
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>
        {first_name[0]}{last_name[0]}
      </Text>
    </View>
  )
}

// ─── Bot Chat ─────────────────────────────────────────────────────────────────

interface BotMessage {
  id: number; role: 'user' | 'assistant'; content: string
}

const BOT_SUGGESTIONS = [
  'Kako da rezervišem šetnju?',
  'Kako da otkažem rezervaciju?',
  'Kako funkcioniše plaćanje?',
]

function BotChatView({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets()
  const [history, setHistory] = useState<BotMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const flatRef = useRef<FlatList>(null)

  useEffect(() => {
    if (history.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [history, loading])

  async function send(msg?: string) {
    const t = (msg ?? text).trim()
    if (!t || loading) return
    const userMsg: BotMessage = { id: Date.now(), role: 'user', content: t }
    setHistory(h => [...h, userMsg])
    setText('')
    setLoading(true)
    try {
      const { reply } = await sendBotMessage(t, history.map(m => ({ role: m.role, content: m.content })))
      setHistory(h => [...h, { id: Date.now() + 1, role: 'assistant', content: reply }])
    } catch {
      setHistory(h => [...h, { id: Date.now() + 1, role: 'assistant', content: 'Došlo je do greške. Pokušaj ponovo.' }])
    } finally {
      setLoading(false)
    }
  }

  const allItems: (BotMessage | { id: 'loading' })[] = loading
    ? [...history, { id: 'loading' as const }]
    : history

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={[styles.botAvatar]}>
          <Text style={{ fontSize: 20 }}>🐾</Text>
        </View>
        <View>
          <Text style={styles.chatHeaderName}>Paws Asistent</Text>
          <Text style={[styles.chatHeaderSub, { color: '#00BF8F' }]}>● Online</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={allItems}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.messageList}
        ListHeaderComponent={history.length === 0 ? (
          <View style={styles.botWelcome}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🐾</Text>
            <Text style={styles.botWelcomeTitle}>Zdravo! Ja sam Paws Asistent.</Text>
            <Text style={styles.botWelcomeSub}>
              Pitaj me bilo šta o rezervacijama, šetačima ili kako koristiti aplikaciju.
            </Text>
            <View style={{ gap: 8, marginTop: 16 }}>
              {BOT_SUGGESTIONS.map(q => (
                <TouchableOpacity key={q} style={styles.botSuggestion} onPress={() => send(q)}>
                  <Text style={styles.botSuggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
        renderItem={({ item }) => {
          if (item.id === 'loading') {
            return (
              <View style={[styles.msgRow, { alignItems: 'flex-start' }]}>
                <View style={styles.botAvatarSmall}><Text style={{ fontSize: 14 }}>🐾</Text></View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color="#aaa" />
                </View>
              </View>
            )
          }
          const m = item as BotMessage
          const isUser = m.role === 'user'
          return (
            <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
              {!isUser && <View style={styles.botAvatarSmall}><Text style={{ fontSize: 14 }}>🐾</Text></View>}
              <View style={[styles.bubble, isUser ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, isUser && { color: '#fff' }]}>{m.content}</Text>
              </View>
            </View>
          )
        }}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.msgInput, text.length > 0 && { borderColor: '#00BF8F' }]}
          value={text}
          onChangeText={setText}
          placeholder="Pitaj Paws Asistenta..."
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || loading) && { opacity: 0.4 }]}
          onPress={() => send()}
          disabled={!text.trim() || loading}
        >
          <Text style={styles.sendBtnText}>{loading ? '...' : '›'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Chat View (single conversation) ─────────────────────────────────────────

function ChatView({ userId, onBack }: { userId: number; onBack: () => void }) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const flatRef = useRef<FlatList>(null)

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  })

  const [olderMessages, setOlderMessages] = useState<Message[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const { data: messagesData, isLoading } = useQuery<MessagesResponse>({
    queryKey: ['messages', userId],
    queryFn: () => getMessages(userId),
    refetchInterval: 3000,
  })

  const latestMessages = messagesData?.results ?? []
  const messages = [...olderMessages, ...latestMessages]

  useEffect(() => {
    setOlderMessages([])
    setHasMoreOlder(false)
  }, [userId])

  useEffect(() => {
    if (messagesData?.has_more && olderMessages.length === 0) {
      setHasMoreOlder(true)
    }
  }, [messagesData?.has_more])

  async function loadOlderMessages() {
    if (loadingOlder) return
    const oldest = olderMessages.length > 0 ? olderMessages[0].id : latestMessages[0]?.id
    if (!oldest) return
    setLoadingOlder(true)
    try {
      const res = await getMessages(userId, oldest)
      setOlderMessages(prev => [...res.results, ...prev])
      setHasMoreOlder(res.has_more)
    } finally {
      setLoadingOlder(false)
    }
  }

  const mutation = useMutation({
    mutationFn: (t: string) => sendMessage(userId, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', userId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setText('')
    },
  })

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const activeUser = conversations?.find((c: Conversation) => c.user.id === userId)?.user

  function doSend() {
    const t = text.trim()
    if (!t || mutation.isPending) return
    mutation.mutate(t)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        {activeUser && (
          <>
            <Avatar {...activeUser} id={activeUser.id} size={38} />
            <View>
              <Text style={styles.chatHeaderName}>{activeUser.first_name} {activeUser.last_name}</Text>
              <Text style={styles.chatHeaderSub}>{activeUser.role === 'walker' ? '🦮 Šetač' : '🏠 Vlasnik'}</Text>
            </View>
          </>
        )}
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#00BF8F" /></View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={styles.messageList}
          ListHeaderComponent={hasMoreOlder ? (
            <TouchableOpacity onPress={loadOlderMessages} disabled={loadingOlder}
              style={{ alignSelf: 'center', marginBottom: 12, paddingHorizontal: 16, paddingVertical: 6,
                borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {loadingOlder ? 'Učitavam...' : 'Učitaj starije poruke'}
              </Text>
            </TouchableOpacity>
          ) : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Započni razgovor</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender.id === user?.id
            return (
              <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
                {!isMine && <Avatar {...item.sender} id={item.sender.id} size={30} />}
                <View style={{ flexShrink: 1, gap: 3, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && { color: '#fff' }]}>{item.text}</Text>
                  </View>
                  <Text style={styles.msgTime}>{fmtTime(item.created_at)}</Text>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.msgInput, text.length > 0 && { borderColor: '#00BF8F' }]}
          value={text}
          onChangeText={setText}
          placeholder="Napiši poruku..."
          onSubmitEditing={doSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || mutation.isPending) && { opacity: 0.4 }]}
          onPress={doSend}
          disabled={!text.trim() || mutation.isPending}
        >
          <Text style={styles.sendBtnText}>{mutation.isPending ? '...' : '›'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Conversations List ───────────────────────────────────────────────────────

function ConversationRow({ c, onPress, onDelete }: { c: Conversation; onPress: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const queryClient = useQueryClient()
  const deleteM = useMutation({
    mutationFn: () => deleteConversation(c.user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      onDelete()
    },
  })

  if (confirmDelete) {
    return (
      <View style={[styles.convRow, { backgroundColor: '#fff5f5' }]}>
        <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>Obriši razgovor?</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#ef4444', borderRadius: 8 }}
            onPress={() => deleteM.mutate()}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
              {deleteM.isPending ? '...' : 'Obriši'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
            onPress={() => setConfirmDelete(false)}
          >
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Otkaži</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <TouchableOpacity style={styles.convRow} onPress={onPress} onLongPress={() => setConfirmDelete(true)}>
      <Avatar {...c.user} id={c.user.id} size={40} />
      <View style={styles.convInfo}>
        <View style={styles.convTopRow}>
          <Text style={styles.convName}>{c.user.first_name} {c.user.last_name}</Text>
          <Text style={styles.convTime}>{fmtTime(c.time)}</Text>
        </View>
        <View style={styles.convBottomRow}>
          <Text style={styles.convLast} numberOfLines={1}>{c.last_message}</Text>
          {c.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{c.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Glavni ekran ─────────────────────────────────────────────────────────────

type ScreenView = 'list' | 'bot' | { userId: number }

export default function PorukeScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const route = useRoute<any>()
  const [view, setView] = useState<ScreenView>('list')
  const queryClient = useQueryClient()

  // Kada se naviguje sa drugog ekrana sa userId (npr. WalkerDetailScreen → Pošalji poruku)
  useEffect(() => {
    const userId = route.params?.userId
    if (userId) setView({ userId })
  }, [route.params?.userId])

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 5000,
  })

  if (view === 'bot') {
    return <BotChatView onBack={() => setView('list')} />
  }

  if (typeof view === 'object') {
    return <ChatView userId={view.userId} onBack={() => setView('list')} />
  }

  // List view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Poruke</Text>
        {conversations && (
          <Text style={styles.headerSub}>{conversations.length} razgovor{conversations.length === 1 ? '' : 'a'}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 8 }}>
        {/* Bot pinned */}
        <TouchableOpacity style={[styles.convRow, styles.botRow]} onPress={() => setView('bot')}>
          <View style={styles.botAvatarLarge}>
            <Text style={{ fontSize: 22 }}>🐾</Text>
          </View>
          <View style={styles.convInfo}>
            <View style={styles.convTopRow}>
              <Text style={styles.convName}>Paws Asistent</Text>
              <Text style={[styles.convTime, { color: '#00BF8F', fontWeight: '700' }]}>Bot</Text>
            </View>
            <Text style={styles.convLast}>Pitaj me nešto o aplikaciji...</Text>
          </View>
        </TouchableOpacity>

        {/* Separator */}
        <View style={styles.separator}>
          <Text style={styles.separatorText}>RAZGOVORI</Text>
        </View>

        {isLoading && (
          <View style={styles.center}><ActivityIndicator color="#00BF8F" /></View>
        )}

        {!isLoading && (!conversations || conversations.length === 0) && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Razgovori sa šetačima će se pojaviti ovde</Text>
          </View>
        )}

        {conversations?.map((c: Conversation) => (
          <ConversationRow
            key={c.user.id}
            c={c}
            onPress={() => setView({ userId: c.user.id })}
            onDelete={() => setView('list')}
          />
        ))}
      </ScrollView>
    </View>
  )
}

// ─── Stilovi ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginTop: 2 },
  center: { padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  // Conversation row
  convRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12,
  },
  botRow: { backgroundColor: '#fff' },
  botAvatarLarge: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#f0fdf9', borderWidth: 2, borderColor: '#00BF8F',
    justifyContent: 'center', alignItems: 'center',
  },
  botAvatarSmall: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0fdf9', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  convInfo: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontSize: 15, fontWeight: '800', color: '#111' },
  convTime: { fontSize: 11, color: '#9ca3af' },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  convLast: { fontSize: 12, color: '#9ca3af', flex: 1 },
  unreadBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#00BF8F', justifyContent: 'center', alignItems: 'center' },
  unreadText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  separator: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f5f5f5' },
  separatorText: { fontSize: 11, fontWeight: '800', color: '#bbb', letterSpacing: 1 },

  // Chat
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { fontSize: 20, color: '#374151', lineHeight: 26 },
  chatHeaderName: { fontSize: 17, fontWeight: '900', color: '#111', letterSpacing: -0.2 },
  chatHeaderSub: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  botAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f0fdf9', borderWidth: 2, borderColor: '#00BF8F',
    justifyContent: 'center', alignItems: 'center',
  },
  messageList: { padding: 16, paddingBottom: 8, gap: 10, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: '#00BF8F', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  msgTime: { fontSize: 11, color: '#9ca3af', paddingHorizontal: 2 },
  typingBubble: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb' },
  inputRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  msgInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#00BF8F',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },

  // Bot welcome
  botWelcome: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  botWelcomeTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  botWelcomeSub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  botSuggestion: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 2, borderColor: '#00BF8F', backgroundColor: '#f0fdf9',
  },
  botSuggestionText: { fontSize: 13, color: '#00BF8F', fontWeight: '600' },
})
