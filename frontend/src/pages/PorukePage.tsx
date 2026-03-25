import { imgUrl } from '../config'
import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConversations, getMessages, sendMessage, sendBotMessage, deleteConversation } from '../api/chat'
import type { Conversation, Message, ChatUser, MessagesResponse } from '../api/chat'
import { useAuth } from '../context/AuthContext'

const BOT_ID = 'bot'

interface BotMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

function BotChat() {
  const [history, setHistory] = useState<BotMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  const send = async () => {
    const t = text.trim()
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

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/messages')}
          className="md:hidden w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 transition-colors">
          ←
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: '#f0fdf9' }}>🐾</div>
        <div>
          <div className="font-bold text-gray-900">Paws Asistent</div>
          <div className="text-xs" style={{ color: '#00BF8F' }}>● Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-gray-50">
        {history.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">🐾</div>
            <p className="font-bold text-gray-700">Zdravo! Ja sam Paws Asistent.</p>
            <p className="text-sm text-gray-400">Pitaj me bilo šta o rezervacijama, šetačima ili kako koristiti aplikaciju.</p>
            <div className="flex flex-col gap-2 mt-4">
              {['Kako da rezervišem šetnju?', 'Kako da otkažem rezervaciju?', 'Kako funkcioniše plaćanje?'].map(q => (
                <button key={q} onClick={() => { setText(q); }}
                  className="text-sm px-4 py-2.5 rounded-xl border-2 font-medium transition-all text-left"
                  style={{ borderColor: '#00BF8F', color: '#00BF8F', backgroundColor: '#f0fdf9' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: '#f0fdf9' }}>🐾</div>
            )}
            <div className={`max-w-[75%] sm:max-w-xs lg:max-w-sm`}>
              <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={m.role === 'user'
                  ? { backgroundColor: '#00BF8F', color: 'white', borderRadius: '18px 18px 4px 18px' }
                  : { backgroundColor: 'white', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: '18px 18px 18px 4px' }}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ backgroundColor: '#f0fdf9' }}>🐾</div>
            <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 flex gap-1 items-center"
              style={{ borderRadius: '18px 18px 18px 4px' }}>
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3.5 border-t border-gray-100 flex gap-2.5 shrink-0 bg-white">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pitaj Paws Asistenta..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
          style={{ borderColor: text ? '#00BF8F' : '' }}
        />
        <button onClick={send} disabled={!text.trim() || loading}
          className="text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 shrink-0"
          style={{ backgroundColor: '#00BF8F' }}>
          {loading ? '...' : '→'}
        </button>
      </div>
    </>
  )
}

function ConversationItem({ c, active, onDeleted }: { c: Conversation; active: boolean; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const navigate = useNavigate()
  const deleteM = useMutation({
    mutationFn: () => deleteConversation(c.user.id),
    onSuccess: () => { onDeleted(); navigate('/messages') },
  })

  return (
    <div className="relative flex items-center border-b border-gray-50 group"
      style={active ? { backgroundColor: '#f0fdf9', borderLeft: '3px solid #00BF8F' } : {}}>
      <Link to={`/messages/${c.user.id}`} className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0">
        <Avatar {...c.user} id={c.user.id} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold text-sm text-gray-900 truncate">{c.user.first_name} {c.user.last_name}</span>
            <span className="text-xs text-gray-400 shrink-0 ml-1">{fmtTime(c.time)}</span>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-xs text-gray-400 truncate flex-1">{c.last_message}</p>
            {c.unread > 0 && (
              <span className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center shrink-0 font-bold"
                style={{ backgroundColor: '#00BF8F' }}>{c.unread}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Delete button — pojavljuje se na hover */}
      {!confirm && (
        <button onClick={() => setConfirm(true)}
          className="shrink-0 mr-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
          🗑
        </button>
      )}

      {/* Potvrda brisanja */}
      {confirm && (
        <div className="absolute inset-0 flex items-center justify-between px-4 bg-white z-10 border-l-4 border-red-300">
          <span className="text-xs text-gray-600 font-medium">Obriši razgovor?</span>
          <div className="flex gap-1.5">
            <button onClick={() => deleteM.mutate()}
              className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600">
              {deleteM.isPending ? '...' : 'Obriši'}
            </button>
            <button onClick={() => setConfirm(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
              Otkaži
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500']

function Avatar({ first_name, last_name, profile_image, id, size = 'md' }: { first_name: string; last_name: string; profile_image: string | null; id: number; size?: 'sm' | 'md' }) {
  const color = COLORS[id % COLORS.length]
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'
  if (profile_image) return <img src={imgUrl(profile_image)} alt="" className={`${sz} rounded-full object-cover shrink-0`} />
  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white font-bold shrink-0`}>
      {first_name[0]}{last_name[0]}
    </div>
  )
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'malopre'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
  if (diff < 86400000) return d.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('sr-Latn', { day: 'numeric', month: 'short' })
}

export default function PorukePage() {
  const { userId } = useParams<{ userId?: string }>()
  const isBot = userId === BOT_ID
  const activeId = userId && !isBot ? Number(userId) : null
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 5000,
  })

  const [olderMessages, setOlderMessages] = useState<Message[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(false)

  const { data: messagesData } = useQuery<MessagesResponse>({
    queryKey: ['messages', activeId],
    queryFn: () => getMessages(activeId!),
    enabled: !!activeId,
    refetchInterval: 3000,
  })

  const latestMessages = messagesData?.results ?? []
  const messages = [...olderMessages, ...latestMessages]

  useEffect(() => {
    setOlderMessages([])
    setHasMoreOlder(false)
  }, [activeId])

  useEffect(() => {
    if (messagesData?.has_more && olderMessages.length === 0) {
      setHasMoreOlder(true)
    }
  }, [messagesData?.has_more])

  async function loadOlderMessages() {
    if (!activeId || !latestMessages.length) return
    const oldest = olderMessages.length > 0 ? olderMessages[0].id : latestMessages[0]?.id
    if (!oldest) return
    const res = await getMessages(activeId, oldest)
    setOlderMessages(prev => [...res.results, ...prev])
    setHasMoreOlder(res.has_more)
  }

  const mutation = useMutation({
    mutationFn: (t: string) => sendMessage(activeId!, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setText('')
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [latestMessages])

  const activeUser: ChatUser | undefined = !isBot
    ? conversations?.find((c: Conversation) => c.user.id === activeId)?.user
    : undefined

  const send = () => {
    const t = text.trim()
    if (!t || mutation.isPending) return
    mutation.mutate(t)
  }

  return (
    <div className="bg-gray-50 flex flex-col" style={{ height: 'calc(100dvh - 4rem)' }}>

      {/* Header */}
      <div className={`bg-white border-b border-gray-100 shrink-0 ${(activeId || isBot) ? 'hidden md:block' : 'block'}`}
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Poruke</h1>
          {conversations && (
            <p className="text-gray-400 text-sm mt-0.5">{conversations.length} razgovor{conversations.length === 1 ? '' : 'a'}</p>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-0 sm:px-5 sm:py-5 flex gap-0 sm:gap-4 min-h-0 overflow-hidden">

        {/* Sidebar */}
        <div className={`${(activeId || isBot) ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 md:shrink-0 bg-white sm:rounded-2xl border-0 sm:border sm:border-gray-100 overflow-hidden`}
          style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Razgovori</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Bot — uvek pinovan na vrhu */}
            <Link to="/messages/bot"
              className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 transition-colors"
              style={isBot
                ? { backgroundColor: '#f0fdf9', borderLeft: '3px solid #00BF8F' }
                : {}}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: '#f0fdf9', border: '2px solid #00BF8F' }}>🐾</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-sm text-gray-900">Paws Asistent</span>
                  <span className="text-xs font-bold" style={{ color: '#00BF8F' }}>Bot</span>
                </div>
                <p className="text-xs text-gray-400 truncate">Pitaj me nešto o aplikaciji...</p>
              </div>
            </Link>

            {(!conversations || conversations.length === 0) && (
              <div className="text-center py-12 px-4">
                <p className="text-xs text-gray-400">Razgovori sa šetačima će se pojaviti ovde</p>
              </div>
            )}
            {conversations?.map((c: Conversation) => (
              <ConversationItem
                key={c.user.id}
                c={c}
                active={activeId === c.user.id}
                onDeleted={() => queryClient.invalidateQueries({ queryKey: ['conversations'] })}
              />
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className={`${(activeId || isBot) ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white sm:rounded-2xl border-0 sm:border sm:border-gray-100 overflow-hidden min-w-0`}
          style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>

          {isBot ? <BotChat /> : !activeId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-3">💬</div>
                <p className="font-medium text-gray-600 mb-1">Izaberi razgovor</p>
                <p className="text-sm text-gray-400">Klikni na razgovor sa leve strane</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header - regular user */}
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 shrink-0">
                <button onClick={() => navigate('/messages')}
                  className="md:hidden w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 transition-colors">
                  ←
                </button>
                {activeUser && (
                  <>
                    <Avatar {...activeUser} id={activeUser.id} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 truncate">{activeUser.first_name} {activeUser.last_name}</div>
                      <div className="text-xs text-gray-400">{activeUser.role === 'walker' ? '🦮 Šetač' : '🏠 Vlasnik'}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-gray-50">
                {hasMoreOlder && (
                  <div className="text-center pt-1 pb-2">
                    <button onClick={loadOlderMessages}
                      className="text-xs font-medium px-4 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500">
                      Učitaj starije poruke
                    </button>
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">Započni razgovor</p>
                  </div>
                )}
                {messages.map((m) => {
                  const isMine = m.sender.id === user?.id
                  return (
                    <div key={m.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                      {!isMine && <Avatar {...m.sender} id={m.sender.id} size="sm" />}
                      <div className={`max-w-[75%] sm:max-w-xs lg:max-w-sm flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={isMine
                            ? { backgroundColor: '#00BF8F', color: 'white', borderRadius: '18px 18px 4px 18px' }
                            : { backgroundColor: 'white', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: '18px 18px 18px 4px' }}>
                          {m.text}
                        </div>
                        <span className="text-xs text-gray-400 px-1">{fmtTime(m.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />

              </div>

              {/* Input */}
              <div className="px-4 py-3.5 border-t border-gray-100 flex gap-2.5 shrink-0 bg-white">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Napiši poruku..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  style={{ borderColor: text ? '#00BF8F' : '' }}
                  autoFocus
                />
                <button
                  onClick={send}
                  disabled={!text.trim() || mutation.isPending}
                  className="text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 shrink-0"
                  style={{ backgroundColor: '#00BF8F' }}
                >
                  {mutation.isPending ? '...' : '→'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
