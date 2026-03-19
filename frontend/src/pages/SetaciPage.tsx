import { BACKEND_URL } from '../config'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getWalkers } from '../api/users'
import type { Walker } from '../types'
import Reveal from '../components/Reveal'

interface WalkerWithDistance extends Walker {
  distance?: number | null
}

const SERVICES = [
  { val: '', label: 'Sve usluge' },
  { val: 'walking', label: '🦮 Šetanje' },
  { val: 'boarding', label: '🏠 Čuvanje' },
]

const SIZES = [
  { val: '', label: 'Svi psi' },
  { val: 'small', label: 'Mali (do 10kg)' },
  { val: 'medium', label: 'Srednji (10-25kg)' },
  { val: 'large', label: 'Veliki (25kg+)' },
]

const GRAD_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-cyan-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
]

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <svg key={n} className="w-3.5 h-3.5" fill={n <= Math.round(rating) ? '#FAAB43' : '#e5e7eb'} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-gray-500 font-medium">{rating > 0 ? rating.toFixed(1) : 'Novo'} {count > 0 && `(${count})`}</span>
    </div>
  )
}

export default function SetaciPage() {
  const [params] = useSearchParams()
  const [service, setService] = useState(params.get('usluga') || '')
  const [size, setSize] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [sort, setSort] = useState('rating')
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  const queryParams: Record<string, string> = {}
  if (service) queryParams.usluga = service
  if (size) queryParams.velicina = size
  if (maxRate) queryParams.cena_max = maxRate
  if (myLocation) {
    queryParams.lat = String(myLocation.lat)
    queryParams.lng = String(myLocation.lng)
    queryParams.radius = '25'
  }

  const { data: walkers, isLoading } = useQuery<WalkerWithDistance[]>({
    queryKey: ['walkers', queryParams],
    queryFn: () => getWalkers(queryParams),
  })

  const findNearMe = () => {
    if (myLocation) { setMyLocation(null); return }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLoading(false)
      },
      () => {
        alert('Nije moguće dobiti lokaciju. Proverite dozvole u browseru.')
        setLocationLoading(false)
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
            {isLoading ? 'Učitavam šetače...' : `${walkers?.length ?? 0} šetača u tvojoj blizini`}
          </h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Service filter */}
            <div className="flex gap-1.5 flex-wrap">
              {SERVICES.map(s => (
                <button
                  key={s.val}
                  onClick={() => setService(s.val)}
                  className="px-3.5 py-2 rounded-full text-sm font-semibold transition-all border"
                  style={service === s.val
                    ? { backgroundColor: '#00BF8F', color: 'white', borderColor: '#00BF8F' }
                    : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Location filter */}
            <button
              onClick={findNearMe}
              disabled={locationLoading}
              className="px-3.5 py-2 rounded-full text-sm font-semibold transition-all border flex items-center gap-1.5"
              style={myLocation
                ? { backgroundColor: '#00BF8F', color: 'white', borderColor: '#00BF8F' }
                : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }}
            >
              {locationLoading ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : '📍'}
              {locationLoading ? 'Tražim lokaciju...' : myLocation ? 'Blizu mene (25km) ✕' : 'Blizu mene'}
            </button>

            {/* Size filter */}
            <select
              value={size}
              onChange={e => setSize(e.target.value)}
              className="border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-600 bg-white focus:outline-none"
              style={{ borderColor: size ? '#00BF8F' : '' }}
            >
              {SIZES.map(v => <option key={v.val} value={v.val}>{v.label}</option>)}
            </select>

            {/* Sort */}
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-600 bg-white focus:outline-none"
              style={{ borderColor: sort !== 'rating' ? '#00BF8F' : '' }}>
              <option value="rating">⭐ Ocena</option>
              <option value="price_asc">💰 Cena: niža prvo</option>
              <option value="price_desc">💰 Cena: viša prvo</option>
            </select>

            {/* Price filter */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2">
              <span className="text-sm text-gray-400 shrink-0">Max:</span>
              <input
                type="number"
                inputMode="numeric"
                value={maxRate}
                onChange={e => setMaxRate(e.target.value)}
                placeholder="2000"
                className="w-16 text-sm font-medium text-gray-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-gray-400 shrink-0">{service === 'boarding' ? 'RSD/dan' : 'RSD/h'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
                <div className="h-52 bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-8 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && walkers?.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Nema šetača</h3>
            <p className="text-gray-400">Pokušaj sa drugačijim filterima</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...(walkers ?? [])].sort((a, b) => {
            const priceOf = (w: WalkerWithDistance) => {
              const wp = w.walker_profile
              if (service === 'boarding' || wp.services === 'boarding') return Number(wp.daily_rate) || Number(wp.hourly_rate)
              return Number(wp.hourly_rate)
            }
            if (sort === 'rating') return (b.walker_profile?.average_rating ?? 0) - (a.walker_profile?.average_rating ?? 0)
            if (sort === 'price_asc') return priceOf(a) - priceOf(b)
            if (sort === 'price_desc') return priceOf(b) - priceOf(a)
            return 0
          }).map((w, idx) => {
            const wp = w.walker_profile
            const gradColor = GRAD_COLORS[w.id % GRAD_COLORS.length]

            const showHourly = (service === 'walking' || service === '') && (wp.services === 'walking' || wp.services === 'both') && Number(wp.hourly_rate) > 0
            const showDaily = (service === 'boarding' || service === '') && (wp.services === 'boarding' || wp.services === 'both') && Number(wp.daily_rate) > 0

            return (
              <Reveal key={w.id} delay={Math.min(idx % 3, 2) * 80}>
              <Link
                to={`/walkers/${w.id}`}
                className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1 group"
                style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.1)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(71,71,71,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 11px rgba(71,71,71,0.1)')}
              >
                {/* Photo */}
                <div className="relative h-52 overflow-hidden">
                  {w.profile_image ? (
                    <img
                      src={`${BACKEND_URL}${w.profile_image}`}
                      alt={w.first_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradColor} flex items-center justify-center`}>
                      <span className="text-white text-6xl font-black opacity-80">{w.first_name[0]}</span>
                    </div>
                  )}

                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Price badge */}
                  {(showHourly || showDaily) && (
                    <div className="absolute top-3 right-3 bg-white rounded-lg px-2.5 py-1.5 flex flex-col items-end gap-0.5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      {showHourly && (
                        <div className="flex items-baseline gap-0.5 leading-none">
                          <span className="text-sm font-black text-gray-900">{Number(wp.hourly_rate).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-400">RSD/h</span>
                        </div>
                      )}
                      {showDaily && (
                        <div className="flex items-baseline gap-0.5 leading-none">
                          <span className="text-sm font-black" style={{ color: '#FAAB43' }}>{Number(wp.daily_rate).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-400">RSD/dan</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating badge */}
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                    <Stars rating={wp.average_rating} count={wp.review_count} />
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-black text-gray-900 text-lg">{w.first_name} {w.last_name}</h3>
                    {w.distance != null && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F', border: '1px solid #bbf7d0' }}>
                        {w.distance < 1 ? `${Math.round(w.distance * 1000)}m` : `${w.distance} km`}
                      </span>
                    )}
                  </div>
                  {w.address && (
                    <p className="text-sm text-gray-400 mb-3 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {w.address.split(',').slice(-1)[0]?.trim() || w.address}
                    </p>
                  )}

                  {/* Services */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(wp.services === 'both'
                      ? ['walking', 'boarding']
                      : [wp.services]
                    ).map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#f0fdf9', color: '#059669', border: '1px solid #bbf7d0' }}>
                        {s === 'walking' ? '🦮 Šetanje' : '🏠 Čuvanje'}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <div className="w-full py-2.5 rounded-xl text-center text-sm font-bold text-white transition-all"
                      style={{ backgroundColor: '#00BF8F' }}>
                      Pogledaj profil
                    </div>
                  </div>
                </div>
              </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </div>
  )
}
