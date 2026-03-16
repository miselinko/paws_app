import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReservations, cancelReservation, respondToReservation } from '../api/reservations'
import { createReview } from '../api/reviews'
import { useAuth } from '../context/AuthContext'
import type { Reservation } from '../types'

const STATUS = {
  pending:   { label: 'Na čekanju', bg: '#fef3c7', color: '#92400e' },
  confirmed: { label: 'Potvrđeno',  bg: '#d1fae5', color: '#065f46' },
  rejected:  { label: 'Odbijeno',   bg: '#fee2e2', color: '#991b1b' },
  completed: { label: 'Završeno',   bg: '#f3f4f6', color: '#6b7280' },
  cancelled: { label: 'Otkazano',   bg: '#f3f4f6', color: '#9ca3af' },
} as const

const SVC = {
  walking:  { icon: '🦮', label: 'Šetanje' },
  boarding: { icon: '🏠', label: 'Čuvanje' },
} as const

function fmtDate(iso: string) {
  const d = new Date(iso)
  const days = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']
  const day = days[d.getDay()]
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${day}, ${date} u ${time}`
}

function ReviewForm({ r, onDone }: { r: Reservation; onDone: () => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [hover, setHover] = useState(0)
  const queryClient = useQueryClient()
  const m = useMutation({
    mutationFn: () => createReview({ reservation: r.id, rating, comment }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservations'] }); onDone() },
  })

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="font-semibold text-sm text-gray-900 mb-3">Ostavi recenziju</p>
      <div className="flex gap-1 mb-3 items-center">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl transition-transform hover:scale-110"
            style={{ color: n <= (hover || rating) ? '#FAAB43' : '#e5e7eb' }}
          >★</button>
        ))}
        <span className="text-sm text-gray-400 ml-2">{rating}/5</span>
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none mb-3 focus:outline-none"
        rows={2}
        placeholder="Kako je prošlo? (opciono)"
        style={{ borderColor: comment ? '#00BF8F' : '' }}
      />
      <button
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all"
        style={{ backgroundColor: '#00BF8F' }}
      >
        {m.isPending ? 'Šaljem...' : 'Pošalji recenziju'}
      </button>
    </div>
  )
}

function ReservationCard({ r }: { r: Reservation }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showReview, setShowReview] = useState(false)
  const st = STATUS[r.status]
  const svc = SVC[r.service_type as keyof typeof SVC] ?? { icon: '📅', label: r.service_type }

  const cancelM = useMutation({
    mutationFn: () => cancelReservation(r.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  })
  const respondM = useMutation({
    mutationFn: (status: 'confirmed' | 'rejected') => respondToReservation(r.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{svc.icon}</span>
          <span className="font-bold text-gray-900 text-sm">{svc.label}</span>
          {r.duration && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-600">{r.duration} min</span>
          )}
          {user?.role === 'owner' && r.walker_info && (
            <span className="text-gray-400 text-sm">· {r.walker_info.first_name} {r.walker_info.last_name}</span>
          )}
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: st.bg, color: st.color }}>
          {st.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-xs text-gray-400 font-medium mb-1">Početak</div>
            <div className="text-sm font-bold text-gray-900">{fmtDate(r.start_time)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-xs text-gray-400 font-medium mb-1">Kraj</div>
            <div className="text-sm font-bold text-gray-900">{fmtDate(r.end_time)}</div>
          </div>
        </div>

        {r.dogs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {r.dogs.map(d => (
              <span key={d.id} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
                style={{ backgroundColor: '#f0fdf9', color: '#059669', borderColor: '#bbf7d0' }}>
                🐕 {d.name}
              </span>
            ))}
          </div>
        )}

        {r.notes && (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 mb-3 italic border border-gray-100">
            💬 {r.notes}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {user?.role === 'owner' && r.status === 'pending' && (
            <button onClick={() => cancelM.mutate()} disabled={cancelM.isPending}
              className="text-sm text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors font-medium">
              {cancelM.isPending ? 'Otkazujem...' : 'Otkaži'}
            </button>
          )}
          {user?.role === 'walker' && r.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={() => respondM.mutate('confirmed')} disabled={respondM.isPending}
                className="text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: '#00BF8F' }}>
                Prihvati
              </button>
              <button onClick={() => respondM.mutate('rejected')} disabled={respondM.isPending}
                className="text-sm text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors font-medium">
                Odbij
              </button>
            </div>
          )}
          {user?.role === 'owner' && r.status === 'completed' && !r.has_review && !showReview && (
            <button onClick={() => setShowReview(true)}
              className="text-sm font-medium px-4 py-2 rounded-xl border transition-all hover:bg-amber-50"
              style={{ color: '#92400e', borderColor: '#fcd34d' }}>
              ⭐ Ostavi recenziju
            </button>
          )}
          {user?.role === 'owner' && r.status === 'completed' && r.has_review && (
            <span className="text-xs text-gray-400 flex items-center gap-1">✓ Recenzija poslata</span>
          )}
        </div>

        {showReview && <ReviewForm r={r} onDone={() => setShowReview(false)} />}
      </div>
    </div>
  )
}

export default function RezervacijePage() {
  const { data: reservations, isLoading } = useQuery({ queryKey: ['reservations'], queryFn: getReservations })
  const active = reservations?.filter((r: Reservation) => ['pending', 'confirmed'].includes(r.status)) ?? []
  const past = reservations?.filter((r: Reservation) => ['completed', 'rejected', 'cancelled'].includes(r.status)) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-7">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">Rezervacije</h1>
          <p className="text-gray-400 text-sm">
            {reservations ? `${reservations.length} ukupno · ${active.length} aktivnih` : 'Učitavam...'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-7">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden"
                style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.06)' }}>
                <div className="h-12 bg-gray-100 border-b border-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-16 rounded-xl bg-gray-100" />
                    <div className="h-16 rounded-xl bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && reservations?.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Nema rezervacija</h3>
            <p className="text-gray-400 text-sm">Rezervacije će se pojaviti ovde</p>
          </div>
        )}

        {active.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aktivne</h2>
              <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                style={{ backgroundColor: '#00BF8F' }}>{active.length}</span>
            </div>
            <div className="space-y-4">{active.map((r: Reservation) => <ReservationCard key={r.id} r={r} />)}</div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Istorija</h2>
            <div className="space-y-4 opacity-80">{past.map((r: Reservation) => <ReservationCard key={r.id} r={r} />)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
