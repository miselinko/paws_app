import { imgUrl } from '../config'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWalkersPaginated, toggleFavorite } from '../api/users'
import { getReservations } from '../api/reservations'
import { useAuth } from '../context/AuthContext'
import type { Reservation } from '../types'
import Reveal from '../components/Reveal'

const SERVICES = [
  { val: '', label: 'Sve usluge' },
  { val: 'walking', label: 'Šetanje' },
  { val: 'boarding', label: 'Čuvanje' },
]

const MIN_RATINGS = [
  { val: '', label: 'Sve ocene' },
  { val: '3', label: '3+ zvezdice' },
  { val: '4', label: '4+ zvezdice' },
  { val: '4.5', label: '4.5+ zvezdice' },
]

const SORTS = [
  { val: 'rating',     label: 'Najbolje ocenjeni' },
  { val: 'price_asc',  label: 'Cena: niža prvo' },
  { val: 'price_desc', label: 'Cena: viša prvo' },
]

const INITIALS_BG = ['#00BF8F', '#FAAB43', '#6366f1', '#ec4899', '#0ea5e9']
const DAY_LABELS = ['P', 'U', 'S', 'Č', 'P', 'S', 'N']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function Stars({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs font-medium text-gray-400">Novo</span>
  }
  return (
    <div className="flex items-center gap-1">
      <svg className="w-3.5 h-3.5" fill="#FAAB43" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-sm font-bold text-gray-800">{rating.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count})</span>
    </div>
  )
}

export default function SetaciPage() {
  useEffect(() => { document.title = 'Pronađi šetača - PawsApp' }, [])
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()

  const service = params.get('usluga') || ''
  const minRating = params.get('ocena') || ''
  const maxRate = params.get('cena') || ''
  const sort = params.get('sort') || 'rating'
  const search = params.get('q') || ''
  const showFavOnly = params.get('fav') === '1'

  const setFilter = (key: string, value: string) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const isWalker = user?.role === 'walker'

  const { data: myReservations } = useQuery<Reservation[]>({
    queryKey: ['my-reservations'],
    queryFn: getReservations,
    enabled: isWalker,
  })

  const walkerStats = useMemo(() => {
    if (!myReservations) return null
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const completed = myReservations.filter(r => r.status === 'completed')
    const thisMonth = myReservations.filter(r =>
      new Date(r.start_time) >= monthStart && (r.status === 'confirmed' || r.status === 'completed' || r.status === 'in_progress')
    )
    const upcoming = myReservations.filter(r =>
      (r.status === 'confirmed' || r.status === 'in_progress') && new Date(r.start_time) >= now
    )
    return {
      completedCount: completed.length,
      thisMonthCount: thisMonth.length,
      upcomingCount: upcoming.length,
      rating: user?.walker_profile?.average_rating ?? 0,
      reviewCount: user?.walker_profile?.review_count ?? 0,
    }
  }, [myReservations, user])

  const favMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['walkers'] }),
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    if (filterOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const activeFilterCount = [minRating, maxRate, sort !== 'rating' ? sort : ''].filter(Boolean).length

  const queryParams: Record<string, string> = {}
  if (service) queryParams.usluga = service
  if (maxRate) queryParams.cena_max = maxRate
  if (search.trim()) queryParams.search = search.trim()
  if (sort && sort !== 'rating') queryParams.ordering = sort
  if (minRating) queryParams.min_rating = minRating
  if (myLocation) {
    queryParams.lat = String(myLocation.lat)
    queryParams.lng = String(myLocation.lng)
    queryParams.radius = '25'
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['walkers', queryParams],
    queryFn: ({ pageParam = 1 }) => getWalkersPaginated({ ...queryParams, page: String(pageParam) }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      const url = new URL(lastPage.next, window.location.origin)
      return Number(url.searchParams.get('page')) || undefined
    },
    initialPageParam: 1,
  })

  const walkers = useMemo(() => data?.pages.flatMap(p => p.results ?? p) ?? [], [data])

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  const [locationError, setLocationError] = useState('')

  const findNearMe = () => {
    if (myLocation) { setMyLocation(null); setLocationError(''); return }
    setLocationLoading(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLoading(false)
      },
      () => {
        setLocationError('Nije moguće dobiti lokaciju. Proverite dozvole u browseru.')
        setLocationLoading(false)
      }
    )
  }

  const clearFilters = () => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('ocena'); next.delete('cena'); next.delete('sort')
      return next
    }, { replace: true })
  }

  const totalCount = data?.pages[0]?.count ?? walkers.length
  const resultCount = showFavOnly ? walkers.filter(w => w.is_favorited).length : totalCount

  return (
    <div className="min-h-screen bg-white">
      <style>{`@keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>

      {/* Walker dashboard - above header */}
      {isWalker && walkerStats && (
        <section className="px-4 pt-8 pb-4" style={{ backgroundColor: '#f8faf9' }}>
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, #00BF8F 0%, #00a67d 100%)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-white font-black text-lg">Tvoj učinak</h2>
                    <p className="text-white/70 text-xs">Pregled tvoje aktivnosti na PawsApp-u</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
                    <div className="text-2xl sm:text-3xl font-black text-white">{walkerStats.completedCount}</div>
                    <div className="text-white/70 text-xs font-medium mt-1">Završeno</div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {walkerStats.rating > 0 ? walkerStats.rating.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-white/70 text-xs font-medium mt-1">Ocena</div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
                    <div className="text-2xl sm:text-3xl font-black text-white">{walkerStats.reviewCount}</div>
                    <div className="text-white/70 text-xs font-medium mt-1">Recenzija</div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
                    <div className="text-2xl sm:text-3xl font-black text-white">{walkerStats.thisMonthCount}</div>
                    <div className="text-white/70 text-xs font-medium mt-1">Ovog meseca</div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
                    <div className="text-2xl sm:text-3xl font-black text-white">{walkerStats.upcomingCount}</div>
                    <div className="text-white/70 text-xs font-medium mt-1">Predstojeće</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Header */}
      <section className={`${isWalker && walkerStats ? 'py-6' : 'py-8 sm:py-12'} px-4`} style={{ backgroundColor: '#f8faf9' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">Pronađi šetača</h1>
            <p className="text-gray-500 text-sm sm:text-base">
              {isLoading ? 'Učitavanje...' : `${resultCount} ${resultCount === 1 ? 'rezultat' : 'rezultata'}`}
              {myLocation && <span className="ml-1" style={{ color: '#00BF8F' }}>· u vašoj blizini</span>}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Search & Filters */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">

          {/* Search input */}
          <div className="relative mb-2.5">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setFilter('q', e.target.value)}
              placeholder="Pretraži po imenu ili lokaciji..."
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400 bg-gray-50"
            />
            {search && (
              <button onClick={() => setFilter('q', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Service select */}
            <select
              value={service}
              onChange={e => setFilter('usluga', e.target.value)}
              className="text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400 cursor-pointer appearance-none pr-7 shrink-0"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              {SERVICES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
            </select>

            {/* Sort select */}
            <select
              value={sort}
              onChange={e => setFilter('sort', e.target.value === 'rating' ? '' : e.target.value)}
              className="text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400 cursor-pointer appearance-none pr-7 shrink-0"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              {SORTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
            </select>

            {/* More filters */}
            <div className="relative shrink-0" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-1.5 transition-colors"
                style={activeFilterCount > 0
                  ? { backgroundColor: '#e6f9f3', color: '#00BF8F', borderColor: '#00BF8F' }
                  : { backgroundColor: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Više filtera
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: '#00BF8F' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 z-50 p-4 w-64"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1)', animation: 'fadeDown 0.15s ease' }}>

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Minimalna ocena</p>
                  <div className="flex flex-col gap-0.5 mb-4">
                    {MIN_RATINGS.map(s => (
                      <button key={s.val} onClick={() => setFilter('ocena', s.val)}
                        className="text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
                        style={minRating === s.val ? { backgroundColor: '#e6f9f3', color: '#059669', fontWeight: 600 } : { color: '#374151' }}>
                        {s.val && (
                          <svg className="w-3.5 h-3.5" fill="#FAAB43" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        )}
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Max cena ({service === 'boarding' ? 'RSD/dan' : 'RSD/h'})
                  </p>
                  <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 mb-4"
                    style={maxRate ? { borderColor: '#00BF8F' } : {}}>
                    <input type="number" inputMode="numeric" value={maxRate}
                      onChange={e => setFilter('cena', e.target.value)} placeholder="npr. 2000"
                      className="flex-1 text-sm text-gray-700 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    {maxRate && (
                      <button onClick={() => setFilter('cena', '')} className="text-gray-400 hover:text-gray-600 ml-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters}
                      className="w-full py-1.5 rounded-lg text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                      Ukloni sve filtere
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-200 shrink-0 hidden sm:block" />

            {/* Location */}
            <button
              onClick={findNearMe}
              disabled={locationLoading}
              className="flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-1.5 transition-colors shrink-0"
              style={myLocation
                ? { backgroundColor: '#e6f9f3', color: '#00BF8F', borderColor: '#00BF8F' }
                : { backgroundColor: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}
            >
              {locationLoading
                ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
              {locationLoading ? 'Tražim...' : myLocation ? 'Blizu mene ×' : 'Blizu mene'}
            </button>

            {locationError && (
              <span className="text-xs text-red-500 font-medium shrink-0">{locationError}</span>
            )}

            {/* Favorites - only for owners */}
            {user && user.role === 'owner' && (
              <button
                onClick={() => setFilter('fav', showFavOnly ? '' : '1')}
                className="flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-1.5 transition-colors shrink-0"
                style={showFavOnly
                  ? { backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fca5a5' }
                  : { backgroundColor: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}
              >
                <svg className="w-3.5 h-3.5" fill={showFavOnly ? '#ef4444' : 'none'} viewBox="0 0 24 24" stroke={showFavOnly ? '#ef4444' : 'currentColor'} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Omiljeni
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <section className="px-4" style={{ backgroundColor: '#f8faf9' }}>
        <div className="max-w-6xl mx-auto py-6 sm:py-8">

          {/* Loading skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse border border-gray-100">
                  <div className="h-48 bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && walkers?.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#e6f9f3' }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#00BF8F" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Nema rezultata</h3>
              <p className="text-gray-400 text-sm">Pokušajte sa drugačijim filterima ili pretragom.</p>
            </div>
          )}

          {/* Walker cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {useMemo(() => {
              return [...walkers]
                .filter(w => !showFavOnly || w.is_favorited)
            }, [walkers, showFavOnly]).map((w, idx) => {
              const wp = w.walker_profile
              const bgColor = INITIALS_BG[w.id % INITIALS_BG.length]

              const showHourly = (service === 'walking' || service === '') && (wp.services === 'walking' || wp.services === 'both') && Number(wp.hourly_rate) > 0
              const showDaily = (service === 'boarding' || service === '') && (wp.services === 'boarding' || wp.services === 'both') && Number(wp.daily_rate) > 0

              return (
                <Reveal key={w.id} delay={Math.min(idx % 3, 2) * 60}>
                  <Link
                    to={`/walkers/${w.id}`}
                    className="bg-white rounded-xl overflow-hidden flex flex-col h-full transition-all hover:-translate-y-0.5 group border border-gray-100"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      {w.profile_image ? (
                        <img src={imgUrl(w.profile_image)} alt={w.first_name}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                          <span className="text-white text-5xl font-black opacity-90">{w.first_name[0]}{w.last_name[0]}</span>
                        </div>
                      )}

                      {/* Favorite - only for owners */}
                      {user && user.role === 'owner' && (
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); favMutation.mutate(w.id) }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/80 backdrop-blur-sm hover:bg-white z-10"
                        >
                          <svg className="w-4 h-4" fill={w.is_favorited ? '#ef4444' : 'none'} viewBox="0 0 24 24"
                            stroke={w.is_favorited ? '#ef4444' : '#9ca3af'} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      )}

                      {/* Featured badge */}
                      {wp.is_featured && (
                        <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: '#FAAB43' }}>
                          Preporučen
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">

                      {/* Name + rating row */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{w.first_name} {w.last_name}</h3>
                        <Stars rating={wp.average_rating} count={wp.review_count} />
                      </div>

                      {/* Location */}
                      {w.address && (
                        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1 truncate">
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {w.address.split(',').slice(-2).join(',').trim() || w.address}
                          {w.distance != null && (
                            <span className="font-semibold" style={{ color: '#00BF8F' }}>
                              · {w.distance < 1 ? `${Math.round(w.distance * 1000)}m` : `${w.distance}km`}
                            </span>
                          )}
                        </p>
                      )}

                      {/* Bio excerpt */}
                      {wp.bio && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{wp.bio}</p>
                      )}

                      {/* Availability - weekly dots */}
                      {wp.availability && Object.keys(wp.availability).length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-[3px]">
                            {DAY_KEYS.map((key, i) => {
                              const day = wp.availability[key]
                              const isActive = day?.active
                              return (
                                <div key={key} className="flex flex-col items-center gap-0.5">
                                  <span className="text-[9px] font-medium" style={{ color: isActive ? '#059669' : '#d1d5db' }}>{DAY_LABELS[i]}</span>
                                  <div className="w-[22px] h-[6px] rounded-full" style={{ backgroundColor: isActive ? '#00BF8F' : '#f3f4f6' }} />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Divider + Services & Prices */}
                      <div className="mt-auto pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {(wp.services === 'both' ? ['walking', 'boarding'] as const : [wp.services]).map(s => (
                              <span key={s} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                                style={s === 'walking'
                                  ? { backgroundColor: '#e6f9f3', color: '#059669' }
                                  : { backgroundColor: '#fff5e6', color: '#b45309' }}>
                                {s === 'walking' ? (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
                                )}
                                {s === 'walking' ? 'Šetanje' : 'Čuvanje'}
                              </span>
                            ))}
                          </div>
                          <div className="text-right shrink-0">
                            {showHourly && (
                              <div className="text-sm font-bold text-gray-900">{Number(wp.hourly_rate).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">RSD/h</span></div>
                            )}
                            {showDaily && (
                              <div className="text-sm font-bold" style={{ color: '#b45309' }}>{Number(wp.daily_rate).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">RSD/dan</span></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="py-6 text-center">
            {isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Učitavanje...
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
