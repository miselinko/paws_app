import { BACKEND_URL } from '../config'
import { useState, lazy, Suspense } from 'react'
import Reveal from '../components/Reveal'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getWalker } from '../api/users'
import { getMyDogs } from '../api/dogs'
import { createReservation } from '../api/reservations'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Walker, Dog } from '../types'

const MapaSetac = lazy(() => import('../components/MapaSetac'))

const GRAD_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-cyan-500',
  'from-rose-400 to-pink-500',
]

const SVC_LABELS: Record<string, { icon: string; label: string }> = {
  walking: { icon: '🦮', label: 'Šetanje' },
  boarding: { icon: '🏠', label: 'Čuvanje' },
}

function getAvailableServices(services: string): string[] {
  if (services === 'both') return ['walking', 'boarding']
  return [services]
}

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <svg key={n} className="w-4 h-4" fill={n <= Math.round(rating) ? '#FAAB43' : '#e5e7eb'} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-gray-500">{rating > 0 ? `${rating.toFixed(1)} (${count} recenzija)` : 'Još nema recenzija'}</span>
    </div>
  )
}

// --- Booking widget ---
function BookingWidget({ walker, dogs }: { walker: Walker; dogs: Dog[] | undefined }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const wp = walker.walker_profile
  const availableSvcs = getAvailableServices(wp.services)

  const [serviceType, setServiceType] = useState(availableSvcs[0])
  const [date, setDate] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')

  // Availability helpers
  const availability = wp.availability ?? {}
  const hasAvailability = Object.keys(availability).length > 0

  function getDayKey(dateStr: string): string {
    const jsDay = new Date(dateStr + 'T12:00:00').getDay() // 0=Sun
    return String(jsDay === 0 ? 6 : jsDay - 1) // 0=Mon...6=Sun
  }

  const dayKey = date ? getDayKey(date) : null
  const daySchedule = dayKey && hasAvailability ? availability[dayKey] : null
  const dayUnavailable = daySchedule ? !daySchedule.active : false

  const ALL_TIMES = Array.from({ length: 32 }, (_, i) => {
    const h = Math.floor(i / 2) + 6
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })
  const availableTimes = daySchedule?.active
    ? ALL_TIMES.filter(t => t >= daySchedule.from && t <= daySchedule.to)
    : ALL_TIMES
  const [selectedDogs, setSelectedDogs] = useState<number[]>([])
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const bookM = useMutation({
    mutationFn: () => {
      if (!date) throw new Error('Select a date')
      const startTime = `${date}T${timeFrom}:00`
      const endTime = `${date}T${timeTo}:00`
      return createReservation({
        walker: walker.id,
        service_type: serviceType,
        start_time: startTime,
        end_time: endTime,
        dog_ids: selectedDogs,
        notes,
      })
    },
    onSuccess: () => setSuccess(true),
    onError: (e: unknown) => {
      const err = e as { response?: { data?: Record<string, string[]> } }
      const msgs = err.response?.data
      if (msgs) {
        const first = Object.values(msgs).flat()[0]
        setError(first || 'Greška pri rezervaciji.')
      } else {
        setError('Greška pri rezervaciji.')
      }
    },
  })

  // Min date = today
  const today = new Date().toISOString().split('T')[0]

  if (success) return (
    <div className="text-center py-6 px-5">
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="font-black text-gray-900 mb-1">Rezervacija poslata!</h3>
      <p className="text-sm text-gray-500 mb-4">Šetač će te uskoro kontaktirati.</p>
      <button onClick={() => navigate('/reservations')} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ backgroundColor: '#00BF8F' }}>
        Pogledaj rezervacije
      </button>
    </div>
  )

  if (!user) return (
    <div className="p-6 text-center rounded-2xl border border-gray-100" style={{ backgroundColor: '#f0fdf9' }}>
      <div className="text-3xl mb-3">🐾</div>
      <p className="font-bold text-gray-800 mb-1">Želiš da rezervišeš?</p>
      <p className="text-sm text-gray-500 mb-4">Kreiraj nalog — besplatno je i traje 1 minut.</p>
      <Link to="/register" className="w-full block py-3 rounded-xl text-white font-bold text-sm text-center mb-2" style={{ backgroundColor: '#00BF8F' }}>
        Registruj se besplatno
      </Link>
      <Link to="/login" className="w-full block py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
        Već imaš nalog? Prijavi se
      </Link>
    </div>
  )

  if (user.role === 'walker') return (
    <div className="p-5 text-center">
      <p className="text-sm text-gray-400">Šetači ne mogu da rezervišu druge šetače.</p>
    </div>
  )

  return (
    <div className="p-5 space-y-4">
      {/* Service */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Usluga</label>
        <div className="flex flex-wrap gap-2">
          {availableSvcs.map(s => (
            <button key={s} onClick={() => setServiceType(s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
              style={serviceType === s
                ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9', color: '#059669' }
                : { borderColor: '#e5e7eb', color: '#4b5563' }}>
              {SVC_LABELS[s].icon} {SVC_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability preview (show before date) */}
      {hasAvailability && (() => {
        const DAYS_SHORT = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
        return (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Dostupnost</label>
            <div className="flex gap-1 flex-wrap">
              {DAYS_SHORT.map((d, i) => {
                const ds = availability[String(i)]
                const active = ds?.active ?? false
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={active
                        ? { backgroundColor: '#00BF8F', color: 'white' }
                        : { backgroundColor: '#f3f4f6', color: '#d1d5db' }}>
                      {d}
                    </div>
                    {active && <span className="text-[9px] text-gray-400 leading-none">{ds.from.slice(0,5)}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Date */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Datum</label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={e => {
            setDate(e.target.value)
            setTimeFrom('')
            setTimeTo('')
          }}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          style={{ borderColor: date ? (dayUnavailable ? '#fca5a5' : '#00BF8F') : '' }}
        />
        {dayUnavailable && (
          <p className="mt-1.5 text-xs font-semibold text-red-500 flex items-center gap-1">
            ✕ Šetač nije dostupan ovog dana
          </p>
        )}
        {daySchedule?.active && (
          <p className="mt-1.5 text-xs text-[#00BF8F] font-semibold">
            ✓ Dostupno: {daySchedule.from} — {daySchedule.to}h
          </p>
        )}
      </div>

      {/* Time slot picker */}
      {date && !dayUnavailable && (() => {
        const dayFrom = daySchedule?.active ? daySchedule.from : '08:00'
        const dayTo = daySchedule?.active ? daySchedule.to : '20:00'

        return (
          <div className="space-y-3">
            {/* Full day shortcut */}
            <button
              type="button"
              onClick={() => { setTimeFrom(dayFrom); setTimeTo(dayTo) }}
              className="w-full py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2"
              style={timeFrom === dayFrom && timeTo === dayTo
                ? { backgroundColor: '#FAAB43', color: 'white', borderColor: '#FAAB43' }
                : { backgroundColor: '#fffbf0', color: '#FAAB43', borderColor: '#FAAB43' }}
            >
              ☀️ Rezerviši ceo dan ({dayFrom} — {dayTo})
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              ili izaberi vreme
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Step 1: Start */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {timeFrom ? `Početak: ${timeFrom}` : 'Izaberi početak'}
                </label>
                {timeFrom && (
                  <button type="button" onClick={() => { setTimeFrom(''); setTimeTo('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline">
                    promeni
                  </button>
                )}
              </div>
              {!timeFrom && (
                <div className="flex flex-wrap gap-1.5">
                  {availableTimes.slice(0, -1).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTimeFrom(t); setTimeTo('') }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all"
                      style={{ backgroundColor: 'white', color: '#374151', borderColor: '#e5e7eb' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: End */}
            {timeFrom && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {timeTo ? `Kraj: ${timeTo}` : 'Izaberi kraj'}
                  </label>
                  {timeTo && (
                    <button type="button" onClick={() => setTimeTo('')}
                      className="text-xs text-gray-400 hover:text-gray-600 underline">
                      promeni
                    </button>
                  )}
                </div>
                {!timeTo && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableTimes.filter(t => t > timeFrom).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTimeTo(t)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all"
                        style={{ backgroundColor: 'white', color: '#374151', borderColor: '#e5e7eb' }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {timeFrom && timeTo && (() => {
              const [oh, om] = timeFrom.split(':').map(Number)
              const [dh, dm] = timeTo.split(':').map(Number)
              const mins = (dh * 60 + dm) - (oh * 60 + om)
              const h = Math.floor(mins / 60)
              const m = mins % 60
              return (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: '#f0fdf9', color: '#059669' }}>
                  ✓ {timeFrom} — {timeTo} &nbsp;·&nbsp; {h > 0 ? `${h}h` : ''}{m > 0 ? ` ${m}min` : ''}
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* Placeholder when no date */}
      {!date && (
        <div className="text-center py-5 text-sm text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
          Najpre izaberi datum
        </div>
      )}

      {/* Dogs */}
      {dogs && dogs.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Psi</label>
          <div className="space-y-2">
            {dogs.map(d => (
              <label key={d.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                style={selectedDogs.includes(d.id)
                  ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' }
                  : { borderColor: '#e5e7eb' }}>
                <input type="checkbox" checked={selectedDogs.includes(d.id)}
                  onChange={e => setSelectedDogs(e.target.checked ? [...selectedDogs, d.id] : selectedDogs.filter(x => x !== d.id))}
                  className="rounded" style={{ accentColor: '#00BF8F' }} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                  <div className="text-xs text-gray-400">{d.breed} · {d.age} god</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {dogs?.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
          Dodaj psa pre rezervacije.{' '}
          <Link to="/my-dogs" className="font-semibold underline">Dodaj psa</Link>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Napomene (opciono)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder="Posebne napomene za šetača..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none" />
      </div>

      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <button
        onClick={() => { setError(''); bookM.mutate() }}
        disabled={bookM.isPending || !date || dayUnavailable || !timeFrom || !timeTo || timeFrom >= timeTo}
        className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ backgroundColor: '#00BF8F' }}
      >
        {bookM.isPending ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : 'Rezerviši'}
      </button>
    </div>
  )
}

// --- Reviews section ---
interface ReviewItem {
  id: number
  owner_name: string
  owner_image: string | null
  rating: number
  comment: string
  created_at: string
}

function ReviewsSection({ walkerId }: { walkerId: number }) {
  const { data: reviews, isLoading } = useQuery<ReviewItem[]>({
    queryKey: ['reviews', walkerId],
    queryFn: () => api.get(`/reviews/walker/${walkerId}/`).then(r => r.data),
  })

  if (isLoading) return null
  if (!reviews || reviews.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
      <h2 className="font-black text-gray-900 text-xl mb-3">Recenzije</h2>
      <p className="text-gray-400 text-sm italic">Još nema recenzija za ovog šetača.</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
      <h2 className="font-black text-gray-900 text-xl mb-4">Recenzije ({reviews.length})</h2>
      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="flex items-center gap-3 mb-2">
              {r.owner_image ? (
                <img src={`${BACKEND_URL}${r.owner_image}`} className="w-8 h-8 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                  {r.owner_name[0]}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-gray-900">{r.owner_name}</div>
                <div className="text-xs text-gray-400">{(() => { const d = new Date(r.created_at); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}` })()}</div>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <svg key={n} className="w-4 h-4" fill={n <= r.rating ? '#FAAB43' : '#e5e7eb'} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Main page ---
export default function SetacProfilPage() {
  const { id } = useParams<{ id: string }>()
  const walkerId = Number(id)

  const { data: walker, isLoading } = useQuery<Walker>({
    queryKey: ['walker', id],
    queryFn: () => getWalker(walkerId),
  })
  const { data: dogs } = useQuery<Dog[]>({
    queryKey: ['myDogs'],
    queryFn: getMyDogs,
    enabled: true,
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="animate-spin w-8 h-8" style={{ color: '#00BF8F' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  if (!walker) return null
  const wp = walker.walker_profile
  const gradColor = GRAD_COLORS[walker.id % GRAD_COLORS.length]
  const availableSvcs = getAvailableServices(wp.services)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {walker.profile_image ? (
          <img src={`${BACKEND_URL}${walker.profile_image}`} alt={walker.first_name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradColor}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <Link to="/walkers" className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-white/90 hover:text-white bg-black/20 backdrop-blur-sm rounded-xl px-3 py-2 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Nazad
        </Link>

        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">{walker.first_name} {walker.last_name}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <Stars rating={wp.average_rating} count={wp.review_count} />
              {walker.address && (
                <span className="text-white/80 text-sm flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {walker.address}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left */}
        <div className="lg:col-span-2 space-y-5 order-2 lg:order-1">

          {/* About */}
          <Reveal>
          <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
            <h2 className="font-black text-gray-900 text-xl mb-4">O meni</h2>
            {wp.bio
              ? <p className="text-gray-600 leading-relaxed">{wp.bio}</p>
              : <p className="text-gray-400 italic">Šetač još nije napisao opis.</p>}
          </div>
          </Reveal>

          {/* Services */}
          <Reveal delay={60}>
          <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
            <h2 className="font-black text-gray-900 text-xl mb-4">Usluge & cene</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableSvcs.map(s => (
                <div key={s} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-2xl">{SVC_LABELS[s].icon}</span>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{SVC_LABELS[s].label}</div>
                    <div className="text-xs font-bold" style={{ color: '#00BF8F' }}>{Number(wp.hourly_rate).toLocaleString()} RSD/h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </Reveal>

          {/* Map */}
          {walker.lat && walker.lng && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
              <h2 className="font-black text-gray-900 text-xl mb-4">Lokacija</h2>
              <Suspense fallback={<div className="h-64 bg-gray-100 rounded-xl animate-pulse" />}>
                <MapaSetac lat={Number(walker.lat)} lng={Number(walker.lng)} name={`${walker.first_name} ${walker.last_name}`} address={walker.address} />
              </Suspense>
            </div>
          )}

          {/* Reviews */}
          <ReviewsSection walkerId={walkerId} />
        </div>

        {/* Right: Booking widget */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="sticky top-20 bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(71,71,71,0.12)' }}>
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">{Number(wp.hourly_rate).toLocaleString()}</span>
                <span className="text-gray-400 text-sm">RSD / sat</span>
              </div>
              <Stars rating={wp.average_rating} count={wp.review_count} />
            </div>
            <BookingWidget walker={walker} dogs={dogs} />
            <div className="px-5 pb-5">
              <Link
                to={`/messages/${walker.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all hover:bg-gray-50"
                style={{ borderColor: '#00BF8F', color: '#00BF8F' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
                </svg>
                Pošalji poruku
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
