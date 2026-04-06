import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  getReservations, cancelReservation, respondToReservation,
  completeReservation, startWalk, updateWalkLocation, getWalkLocation,
} from '../api/reservations'
import { createReview } from '../api/reviews'
import { useAuth } from '../context/AuthContext'
import { imgUrl } from '../config'
import type { Reservation, Dog, WalkerInfo } from '../types'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const walkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const STATUS = {
  pending:     { label: 'Na čekanju', color: '#92400e', bg: '#fef3c7', border: '#f59e0b' },
  confirmed:   { label: 'Potvrđeno',  color: '#065f46', bg: '#d1fae5', border: '#00BF8F' },
  in_progress: { label: 'U toku',      color: '#065f46', bg: '#d1fae5', border: '#00BF8F' },
  rejected:    { label: 'Odbijeno',   color: '#991b1b', bg: '#fee2e2', border: '#f87171' },
  completed:   { label: 'Završeno',   color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  cancelled:   { label: 'Otkazano',   color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
} as const

const SVC = {
  walking:  { label: 'Šetanje' },
  boarding: { label: 'Čuvanje' },
} as const

function fmtRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const days = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    day: days[s.getDay()],
    date: `${pad(s.getDate())}.${pad(s.getMonth() + 1)}.${s.getFullYear()}`,
    time: `${pad(s.getHours())}:${pad(s.getMinutes())} – ${pad(e.getHours())}:${pad(e.getMinutes())}`,
  }
}

function Avatar({ firstName, lastName, image, size = 10 }: { firstName: string; lastName: string; image: string | null; size?: number }) {
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500']
  const color = colors[(firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length]
  const sz = `w-${size} h-${size}`
  if (image) return <img src={imgUrl(image)} className={`${sz} rounded-full object-cover shrink-0`} />
  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white font-bold shrink-0`}
      style={{ fontSize: size > 8 ? 14 : 11 }}>
      {firstName[0]}{lastName[0]}
    </div>
  )
}

function DogChip({ dog }: { dog: Dog }) {
  return (
    <Link to={`/dogs/${dog.id}`}
      className="rounded-xl border border-gray-200 overflow-hidden flex items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:border-[#00BF8F] hover:bg-[#f0fdf9] no-underline">
      <svg className="w-5 h-5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="8" cy="6" rx="2" ry="2.5"/><ellipse cx="16" cy="6" rx="2" ry="2.5"/><ellipse cx="4.5" cy="12" rx="2" ry="2.5"/><ellipse cx="19.5" cy="12" rx="2" ry="2.5"/><path d="M12 22c-3.5 0-6-2.2-6-5 0-2.5 2-4.5 3.5-6 .7-.7 1.5-1 2.5-1s1.8.3 2.5 1c1.5 1.5 3.5 3.5 3.5 6 0 2.8-2.5 5-6 5z"/></svg>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-900">{dog.name}</span>
        <span className="text-xs text-gray-400 ml-1.5">{dog.breed}</span>
      </div>
      <span className="text-gray-400 text-xs">→</span>
    </Link>
  )
}

function Stars({ rating, count }: { rating: number | null; count: number }) {
  const r = rating ?? 0
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <svg key={n} className="w-3.5 h-3.5" fill={n <= Math.round(r) ? '#FAAB43' : '#e5e7eb'} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {rating != null ? rating.toFixed(1) : 'Novo'} {count > 0 && `(${count})`}
      </span>
    </div>
  )
}

function WalkerInfoSection({ w }: { w: WalkerInfo }) {
  const wp = w.walker_profile
  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">O šetaču</p>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 p-3 bg-gray-50">
          <Avatar firstName={w.first_name} lastName={w.last_name} image={w.profile_image} size={10} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900">{w.first_name} {w.last_name}</p>
            <Stars rating={w.average_rating} count={w.review_count} />
          </div>
          {wp && (
            <div className="text-right shrink-0">
              <p className="font-black text-sm text-gray-900">{Number(wp.hourly_rate).toLocaleString()} <span className="text-xs font-medium text-gray-400">RSD/h</span></p>
              <p className="text-xs text-gray-400">
                {wp.services === 'both' ? 'Šetanje & Čuvanje' : wp.services === 'walking' ? 'Šetanje' : 'Čuvanje'}
              </p>
            </div>
          )}
        </div>
        {/* Bio */}
        {wp?.bio && (
          <div className="px-3 py-2.5 border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">{wp.bio}</p>
          </div>
        )}
        {/* Contact */}
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {w.phone && (
            <a href={`tel:${w.phone}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              <div>
                <div className="text-xs text-gray-400">Telefon</div>
                <div className="font-semibold text-sm text-gray-900">{w.phone}</div>
              </div>
            </a>
          )}
          <a href={`mailto:${w.email}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            <div>
              <div className="text-xs text-gray-400">Email</div>
              <div className="font-semibold text-sm text-gray-900">{w.email}</div>
            </div>
          </a>
          {w.address && (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              <div>
                <div className="text-xs text-gray-400">Lokacija</div>
                <div className="font-semibold text-sm text-gray-900">{w.address}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
          <button key={n} type="button" onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            className="text-2xl transition-transform hover:scale-110"
            style={{ color: n <= (hover || rating) ? '#FAAB43' : '#e5e7eb' }}>★</button>
        ))}
        <span className="text-sm text-gray-400 ml-2">{rating}/5</span>
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none mb-3 focus:outline-none"
        rows={2} placeholder="Kako je prošlo? (opciono)"
        style={{ borderColor: comment ? '#00BF8F' : '' }} />
      <button onClick={() => m.mutate()} disabled={m.isPending}
        className="text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all"
        style={{ backgroundColor: '#00BF8F' }}>
        {m.isPending ? 'Šaljem...' : 'Pošalji recenziju'}
      </button>
    </div>
  )
}

function walkDuration(startedAt: string | null): string {
  if (!startedAt) return ''
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
  if (mins < 1) return 'Upravo počelo'
  if (mins < 60) return `Traje ${mins} min`
  return `Traje ${Math.floor(mins / 60)}h ${mins % 60}min`
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.panTo([lat, lng]) }, [lat, lng])
  return null
}

function WalkLiveMap({ reservationId }: { reservationId: number }) {
  const { data: loc } = useQuery({
    queryKey: ['walk-location', reservationId],
    queryFn: () => getWalkLocation(reservationId),
    refetchInterval: 5000,
  })

  const lat = loc?.lat ? parseFloat(loc.lat) : null
  const lng = loc?.lng ? parseFloat(loc.lng) : null

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-green-200"
      style={{ boxShadow: '0 1px 6px rgba(0,191,143,0.15)' }}>
      <div className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: '#f0fdf9' }}>
        <span className="text-xs font-bold text-green-800 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Lokacija šetača</span>
        {loc?.walk_started_at && (
          <span className="text-xs font-medium text-green-600">{walkDuration(loc.walk_started_at)}</span>
        )}
      </div>
      {lat && lng ? (
        <div style={{ height: 220 }}>
          <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[lat, lng]} icon={walkerIcon}>
            </Marker>
            <MapRecenter lat={lat} lng={lng} />
          </MapContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-8 bg-white">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Čekanje na lokaciju šetača...</span>
        </div>
      )}
    </div>
  )
}

function ReservationCard({ r }: { r: Reservation }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [respondError, setRespondError] = useState('')
  const [gpsError, setGpsError] = useState(false)
  const gpsFailCountRef = useRef(0)
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const st = STATUS[r.status as keyof typeof STATUS] ?? STATUS.cancelled
  const svc = SVC[r.service_type as keyof typeof SVC] ?? { label: r.service_type }
  const { day, date, time } = fmtRange(r.start_time, r.end_time)
  const isWithin3h = r.status === 'confirmed' && (new Date(r.start_time).getTime() - Date.now()) <= 3 * 60 * 60 * 1000
  const hasStarted = new Date(r.start_time).getTime() - Date.now() <= 30 * 60 * 1000

  const isWalkerPending = user?.role === 'walker' && r.status === 'pending'

  const isInProgress = r.status === 'in_progress'

  const cancelM = useMutation({
    mutationFn: () => cancelReservation(r.id),
    onSuccess: () => { setCancelError(''); queryClient.invalidateQueries({ queryKey: ['reservations'] }) },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { detail?: string } } }
      setCancelError(err.response?.data?.detail || 'Greška pri otkazivanju.')
    },
  })
  const completeM = useMutation({
    mutationFn: () => completeReservation(r.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  })
  const startM = useMutation({
    mutationFn: () => startWalk(r.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  })

  const respondM = useMutation({
    mutationFn: (s: 'confirmed' | 'rejected') => respondToReservation(r.id, s),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { detail?: string } } }
      setRespondError(err.response?.data?.detail || 'Greška. Pokušaj ponovo.')
    },
  })

  // Walker: send GPS every 5s when in_progress
  useEffect(() => {
    if (!isInProgress || user?.role !== 'walker') {
      if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null }
      return
    }
    if (!navigator.geolocation) return

    const send = () => navigator.geolocation.getCurrentPosition(
      pos => {
        updateWalkLocation(r.id, pos.coords.latitude, pos.coords.longitude)
          .then(() => { gpsFailCountRef.current = 0; setGpsError(false) })
          .catch(() => {
            gpsFailCountRef.current += 1
            if (gpsFailCountRef.current >= 3) setGpsError(true)
          })
      },
      () => {
        gpsFailCountRef.current += 1
        if (gpsFailCountRef.current >= 3) setGpsError(true)
      }
    )
    send()
    locationIntervalRef.current = setInterval(send, 5000)
    return () => { if (locationIntervalRef.current) clearInterval(locationIntervalRef.current) }
  }, [isInProgress, user?.role, r.id])

  const person = user?.role === 'walker' ? r.owner_info : r.walker_info
  const personName = person ? `${person.first_name} ${person.last_name}` : null

  return (
    <div className="bg-white rounded-xl overflow-hidden transition-all border border-gray-100"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${st.border}` }}>

      {/* Walker pending — action banner */}
      {isWalkerPending && (
        <div className="px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
          Čeka tvoj odgovor
        </div>
      )}

      {/* Main info row */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        {/* Avatar */}
        {user?.role === 'walker' && r.owner_info
          ? <Avatar firstName={r.owner_info.first_name} lastName={r.owner_info.last_name} image={r.owner_info.profile_image} size={11} />
          : r.walker_info
            ? <Avatar firstName={r.walker_info.first_name} lastName={r.walker_info.last_name} image={null} size={11} />
            : <div className="w-11 h-11 rounded-full bg-gray-100 shrink-0" />
        }

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              {personName && <p className="font-bold text-gray-900 text-sm leading-tight">{personName}</p>}
              <p className="text-xs text-gray-400 mt-0.5">{svc.label}{r.duration ? ` · ${r.duration} min` : ''}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ backgroundColor: st.bg, color: st.color }}>
              {st.label}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mt-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
            <span>{day}, {date}</span>
            <span className="text-gray-300">·</span>
            <span style={{ color: '#00BF8F' }}>{time}</span>
          </div>

          {/* Dog pills */}
          {r.dogs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.dogs.map(d => (
                <Link key={d.id} to={`/dogs/${d.id}`}
                  className="text-xs font-medium px-2.5 py-1 rounded-full border transition-all hover:shadow-sm hover:opacity-80"
                  style={{ backgroundColor: '#f0fdf9', color: '#059669', borderColor: '#bbf7d0' }}>
                  {d.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pokreni šetnju — walker na confirmed */}
      {user?.role === 'walker' && r.status === 'confirmed' && (
        <div className="px-4 pb-1">
          <button onClick={() => startM.mutate()} disabled={startM.isPending || !hasStarted}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#00BF8F' }}>
            {startM.isPending ? 'Pokretanje...' : !hasStarted ? `Čeka početak (${time})` : 'Pokreni šetnju'}
          </button>
        </div>
      )}

      {/* Završi šetnju — walker na in_progress */}
      {user?.role === 'walker' && r.status === 'in_progress' && (
        <div className="px-4 pb-1">
          <button onClick={() => completeM.mutate()} disabled={completeM.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#059669' }}>
            {completeM.isPending ? 'Završavam...' : 'Završi šetnju'}
          </button>
        </div>
      )}


      {/* Cancel button — vidljivo za otkazive rezervacije */}
      {((user?.role === 'owner' && (r.status === 'pending' || r.status === 'confirmed')) ||
        (user?.role === 'walker' && r.status === 'confirmed')) && (
        <div className="px-4 pb-3">
          <button
            onClick={() => { setCancelError(''); cancelM.mutate() }}
            disabled={cancelM.isPending || isWithin3h}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:bg-red-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: '#ef4444', borderColor: '#fecaca' }}>
            {cancelM.isPending ? 'Otkazujem...' : isWithin3h ? 'Otkaži (blokiran - manje od 3h)' : 'Otkaži rezervaciju'}
          </button>
          {cancelError && <p className="text-xs text-red-500 mt-1.5 text-center">{cancelError}</p>}
        </div>
      )}

      {/* Walker pending — big action buttons */}
      {isWalkerPending && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setRespondError(''); respondM.mutate('confirmed') }} disabled={respondM.isPending}
              className="py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#00BF8F' }}>
              {respondM.isPending ? '...' : '✓ Prihvati'}
            </button>
            <button onClick={() => { setRespondError(''); respondM.mutate('rejected') }} disabled={respondM.isPending}
              className="py-3 rounded-xl font-bold text-sm border-2 transition-all hover:bg-red-50 active:scale-95"
              style={{ color: '#ef4444', borderColor: '#fecaca' }}>
              {respondM.isPending ? '...' : '✕ Odbij'}
            </button>
          </div>
          {respondError && <p className="text-xs text-red-500 mt-2 text-center">{respondError}</p>}
        </div>
      )}

      {/* Review prompt — owner, completed, no review yet */}
      {user?.role === 'owner' && r.status === 'completed' && !r.has_review && !showReview && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowReview(true)}
            className="w-full py-2.5 rounded-xl text-sm font-bold border-2 transition-all hover:bg-amber-50 active:scale-95"
            style={{ color: '#92400e', borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}>
            Ostavi recenziju za ovu šetnju
          </button>
        </div>
      )}

      {/* Review form — inline, outside expanded */}
      {user?.role === 'owner' && r.status === 'completed' && showReview && (
        <div className="px-4 pb-4">
          <ReviewForm r={r} onDone={() => setShowReview(false)} />
        </div>
      )}

      {/* Review sent confirmation */}
      {user?.role === 'owner' && r.status === 'completed' && r.has_review && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
          style={{ backgroundColor: '#f0fdf9', color: '#065f46' }}>
          ✓ Recenzija je poslata
        </div>
      )}

      {/* GPS status bar for walker in_progress */}
      {user?.role === 'walker' && isInProgress && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold"
          style={{ backgroundColor: '#f0fdf9', color: '#065f46' }}>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Lokacija se šalje vlasniku · {walkDuration(r.walk_started_at)}</span>
        </div>
      )}

      {/* GPS error warning */}
      {user?.role === 'walker' && isInProgress && gpsError && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold"
          style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }}>
          <span>GPS signal nije dostupan. Lokacija se ne šalje vlasniku.</span>
          <button onClick={() => { gpsFailCountRef.current = 0; setGpsError(false) }}
            className="ml-2 text-xs font-bold hover:underline" style={{ color: '#92400e' }}>
            Zatvori
          </button>
        </div>
      )}

      {/* Live map preview for owner in_progress (collapsed) */}
      {user?.role === 'owner' && isInProgress && !expanded && (
        <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer"
          style={{ backgroundColor: '#f0fdf9', border: '1px solid #bbf7d0' }}
          onClick={() => setExpanded(true)}>
          <span className="text-xs font-bold text-green-800">Šetnja je u toku - prikaži mapu ▼</span>
          {r.walk_started_at && (
            <span className="text-xs text-green-600">{walkDuration(r.walk_started_at)}</span>
          )}
        </div>
      )}

      {/* Expandable details */}
      <button onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-100 text-xs font-semibold text-gray-400 hover:bg-gray-50 transition-colors">
        {expanded ? 'Sakrij detalje ▲' : 'Prikaži detalje ▼'}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">

          {/* Live mapa — samo za vlasnika kada je in_progress */}
          {user?.role === 'owner' && r.status === 'in_progress' && (
            <WalkLiveMap reservationId={r.id} />
          )}

          {/* Walker info — samo za vlasnika */}
          {user?.role === 'owner' && r.walker_info && (
            <WalkerInfoSection w={r.walker_info} />
          )}

          {/* Owner info — samo za šetača */}
          {user?.role === 'walker' && r.owner_info && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kontakt vlasnika</p>
              <div className="space-y-2">
                {r.owner_info.phone && (
                  <a href={`tel:${r.owner_info.phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    <div>
                      <div className="text-xs text-gray-400">Telefon</div>
                      <div className="font-semibold text-sm text-gray-900">{r.owner_info.phone}</div>
                    </div>
                  </a>
                )}
                <a href={`mailto:${r.owner_info.email}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  <div>
                    <div className="text-xs text-gray-400">Email</div>
                    <div className="font-semibold text-sm text-gray-900">{r.owner_info.email}</div>
                  </div>
                </a>
                {r.owner_info.address && (
                  <a href={r.owner_info.lat && r.owner_info.lng
                      ? `https://www.google.com/maps?q=${r.owner_info.lat},${r.owner_info.lng}`
                      : `https://www.google.com/maps?q=${encodeURIComponent(r.owner_info.address)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400">Adresa</div>
                      <div className="font-semibold text-sm text-gray-900 truncate">{r.owner_info.address}</div>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: '#00BF8F' }}>Otvori →</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Dog details */}
          {r.dogs.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                {r.dogs.length === 1 ? 'Pas' : 'Psi'}
              </p>
              <div className="space-y-2">
                {r.dogs.map(d => <DogChip key={d.id} dog={d} />)}
              </div>
            </div>
          )}

          {/* Notes */}
          {r.notes && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Napomena</p>
              <p className="text-sm text-gray-600 italic">"{r.notes}"</p>
            </div>
          )}

          {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
        </div>
      )}
    </div>
  )
}

type TabKey = 'all' | 'pending' | 'upcoming' | 'completed' | 'past'

export default function RezervacijePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<TabKey>('all')
  const { data: reservations, isLoading } = useQuery({ queryKey: ['reservations'], queryFn: getReservations })

  const all: Reservation[]       = reservations ?? []
  const pending: Reservation[]   = all.filter(r => r.status === 'pending')
  const upcoming: Reservation[]  = all.filter(r => r.status === 'confirmed' || r.status === 'in_progress')
  const completed: Reservation[] = all.filter(r => r.status === 'completed')
  const past: Reservation[]      = all.filter(r => r.status === 'rejected' || r.status === 'cancelled')

  const needsAction = user?.role === 'walker' ? pending : []

  const TABS: { key: TabKey; label: string; count: number; urgent?: boolean }[] = [
    { key: 'all',       label: 'Sve',        count: all.length },
    { key: 'pending',   label: 'Na čekanju', count: pending.length,   urgent: needsAction.length > 0 },
    { key: 'upcoming',  label: 'Nadolazeće', count: upcoming.length },
    { key: 'completed', label: 'Završene',   count: completed.length },
    { key: 'past',      label: 'Otkazane',   count: past.length },
  ]

  const visibleAll      = tab === 'all'
  const visiblePending  = tab === 'all' || tab === 'pending'
  const visibleUpcoming = tab === 'all' || tab === 'upcoming'
  const visibleCompleted = tab === 'all' || tab === 'completed'
  const visiblePast     = tab === 'all' || tab === 'past'

  const isEmpty = !isLoading && (
    tab === 'all'       ? all.length === 0 :
    tab === 'pending'   ? pending.length === 0 :
    tab === 'upcoming'  ? upcoming.length === 0 :
    tab === 'completed' ? completed.length === 0 :
    past.length === 0
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <section className="py-6 sm:py-8 px-4" style={{ backgroundColor: '#f8faf9' }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-0.5">Rezervacije</h1>
          {reservations && (
            <p className="text-gray-500 text-sm">
              {all.length} ukupno
              {needsAction.length > 0 && (
                <span className="ml-2 font-bold" style={{ color: '#92400e' }}>· {needsAction.length} čeka odgovor</span>
              )}
            </p>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-16 z-20 bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {TABS.map(t => {
              const isActive = tab === t.key
              const isUrgent = t.urgent && !isActive
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all shrink-0"
                  style={isActive
                    ? { borderColor: '#00BF8F', color: '#00BF8F' }
                    : { borderColor: 'transparent', color: '#6b7280' }}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className="text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                      style={isActive
                        ? { backgroundColor: '#00BF8F', color: 'white' }
                        : isUrgent
                        ? { backgroundColor: '#f59e0b', color: 'white' }
                        : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                      {t.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl animate-pulse overflow-hidden h-28"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderLeft: '4px solid #e5e7eb' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 text-gray-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-1">
              {tab === 'all' ? 'Nema rezervacija' :
               tab === 'pending' ? 'Nema rezervacija na čekanju' :
               tab === 'upcoming' ? 'Nema nadolazećih rezervacija' :
               tab === 'completed' ? 'Nema završenih rezervacija' :
               'Nema otkazanih rezervacija'}
            </h3>
            <p className="text-gray-400 text-sm">
              {tab === 'all' ? 'Rezervacije će se pojaviti ovde' : 'Promeni filter da vidiš ostale'}
            </p>
          </div>
        )}

        {/* Na čekanju */}
        {!isLoading && visiblePending && pending.length > 0 && (
          <section>
            {visibleAll && (
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Na čekanju</h2>
                <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold bg-amber-500">{pending.length}</span>
              </div>
            )}
            <div className="space-y-3">{pending.map((r: Reservation) => <ReservationCard key={r.id} r={r} />)}</div>
          </section>
        )}

        {/* Nadolazeće */}
        {!isLoading && visibleUpcoming && upcoming.length > 0 && (
          <section>
            {visibleAll && (
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nadolazeće</h2>
                <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                  style={{ backgroundColor: '#00BF8F' }}>{upcoming.length}</span>
              </div>
            )}
            <div className="space-y-3">{upcoming.map((r: Reservation) => <ReservationCard key={r.id} r={r} />)}</div>
          </section>
        )}

        {/* Završene */}
        {!isLoading && visibleCompleted && completed.length > 0 && (
          <section>
            {visibleAll && (
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Završene</h2>
            )}
            <div className="space-y-3 opacity-80">{completed.map((r: Reservation) => <ReservationCard key={r.id} r={r} />)}</div>
          </section>
        )}

        {/* Otkazane / odbijene */}
        {!isLoading && visiblePast && past.length > 0 && (
          <section>
            {visibleAll && (
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Otkazane / Odbijene</h2>
            )}
            <div className="space-y-3 opacity-60">{past.map((r: Reservation) => <ReservationCard key={r.id} r={r} />)}</div>
          </section>
        )}

      </div>
    </div>
  )
}
