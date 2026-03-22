import { imgUrl } from '../config'
import { useState, lazy, Suspense, useRef, useEffect } from 'react'
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


function getAvailableServices(services: string): Array<'walking' | 'boarding'> {
  if (services === 'both') return ['walking', 'boarding']
  if (services === 'walking') return ['walking']
  return ['boarding']
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

const MONTHS_SR = ['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar']
const DAYS_SR = ['Pon','Uto','Sri','Čet','Pet','Sub','Ned']

function DatePickerPopup({
  value, onChange, availability, hasAvailability, minDate
}: {
  value: string
  onChange: (iso: string) => void
  availability: Record<string, { active: boolean; from: string; to: string }>
  hasAvailability: boolean
  minDate?: string
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const effectiveMin = minDate ? new Date(minDate + 'T00:00:00') : today

  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const d = effectiveMin
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const { year, month } = viewDate
  const firstDay = new Date(year, month, 1)
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const isAtMinMonth = year === effectiveMin.getFullYear() && month === effectiveMin.getMonth()

  const isUnavail = (day: number) => {
    const d = new Date(year, month, day)
    if (d < effectiveMin) return true
    if (!hasAvailability) return false
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    const ds = availability[String(dow)]
    return ds ? !ds.active : false
  }

  const toIso = (day: number) => {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const displayValue = value
    ? (() => {
        const d = new Date(value + 'T12:00:00')
        return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
      })()
    : null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
        style={value
          ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9', color: '#065f46' }
          : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#9ca3af' }}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {displayValue ?? 'Izaberi datum'}
        </span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 z-50 p-4"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>

          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              disabled={isAtMinMonth}
              onClick={() => setViewDate(v => {
                const d = new Date(v.year, v.month - 1)
                return { year: d.getFullYear(), month: d.getMonth() }
              })}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-black text-gray-900">{MONTHS_SR[month]} {year}</span>
            <button type="button" onClick={() => setViewDate(v => {
              const d = new Date(v.year, v.month + 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS_SR.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const iso = toIso(day)
              const unavail = isUnavail(day)
              const selected = value === iso
              const isToday = new Date(year, month, day).toDateString() === new Date().toDateString()
              return (
                <button
                  key={i}
                  type="button"
                  disabled={unavail}
                  onClick={() => { onChange(iso); setOpen(false) }}
                  className="aspect-square rounded-xl text-sm font-semibold flex items-center justify-center transition-all"
                  style={selected
                    ? { backgroundColor: '#00BF8F', color: 'white' }
                    : unavail
                    ? { color: '#d1d5db', cursor: 'not-allowed' }
                    : isToday
                    ? { backgroundColor: '#f0fdf9', color: '#00BF8F', fontWeight: 800 }
                    : { color: '#374151' }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Walking Booking ---
function WalkingBooking({ walker, dogs }: { walker: Walker; dogs: Dog[] | undefined }) {
  const navigate = useNavigate()
  const wp = walker.walker_profile
  const availability = wp.availability ?? {}
  const hasAvailability = Object.keys(availability).length > 0

  const [date, setDate] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [durationMins, setDurationMins] = useState<number | null>(null)
  const [selectedDogs, setSelectedDogs] = useState<number[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [dogsError, setDogsError] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Auto-select if only 1 dog
  useEffect(() => {
    if (dogs && dogs.length === 1) setSelectedDogs([dogs[0].id])
  }, [dogs])

  function getDayKey(dateStr: string): string {
    const jsDay = new Date(dateStr + 'T12:00:00').getDay()
    return String(jsDay === 0 ? 6 : jsDay - 1)
  }

  const dayKey = date ? getDayKey(date) : null
  const daySchedule = dayKey && hasAvailability ? availability[dayKey] : null

  const ALL_TIMES = Array.from({ length: 32 }, (_, i) => {
    const h = Math.floor(i / 2) + 6
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  const availableTimes = daySchedule?.active
    ? ALL_TIMES.filter(t => t >= daySchedule.from && t < daySchedule.to)
    : ALL_TIMES

  const DURATION_OPTIONS = [
    { label: '30 min', mins: 30 },
    { label: '1 h', mins: 60 },
    { label: '1.5 h', mins: 90 },
    { label: '2 h', mins: 120 },
    { label: '3 h', mins: 180 },
  ]

  function addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number)
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const dayEnd = daySchedule?.active ? daySchedule.to : '22:00'
  const availableDurations = timeFrom
    ? DURATION_OPTIONS.filter(d => {
        const endTime = addMinutes(timeFrom, d.mins)
        return endTime <= dayEnd
      })
    : DURATION_OPTIONS

  const timeTo = timeFrom && durationMins ? addMinutes(timeFrom, durationMins) : ''

  const priceTotal = durationMins
    ? Math.round((Number(wp.hourly_rate) * durationMins) / 60)
    : null

  const durationLabel = durationMins
    ? DURATION_OPTIONS.find(d => d.mins === durationMins)?.label ?? `${durationMins} min`
    : ''

  const canSubmit = !!(date && timeFrom && durationMins && selectedDogs.length > 0)

  const formatDateNice = (iso: string) => {
    const d = new Date(iso + 'T12:00:00')
    const dayNames = ['nedeljom','ponedeljkom','utorkom','sredom','četvrtkom','petkom','subotom']
    const monthNames = ['jan','feb','mar','apr','maj','jun','jul','avg','sep','okt','nov','dec']
    return `${String(d.getDate()).padStart(2,'0')}. ${monthNames[d.getMonth()]} (${dayNames[d.getDay()]})`
  }

  const bookM = useMutation({
    mutationFn: () => {
      const startTime = `${date}T${timeFrom}:00`
      const endTime = `${date}T${timeTo}:00`
      return createReservation({
        walker: walker.id,
        service_type: 'walking',
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

  if (success) return (
    <div className="text-center py-6 px-5" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="font-black text-gray-900 mb-1">Rezervacija poslata!</h3>
      <p className="text-sm text-gray-500 mb-4">Šetač će te uskoro kontaktirati.</p>
      <button onClick={() => navigate('/reservations')} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ backgroundColor: '#00BF8F' }}>
        Pogledaj rezervacije
      </button>
    </div>
  )

  return (
    <div className="p-5 space-y-4">
      <style>{'@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }'}</style>

      {/* Step 1: Availability mini-grid */}
      {hasAvailability && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dostupnost</p>
          <div className="flex gap-1 flex-wrap">
            {DAYS_SR.map((d, i) => {
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
                  {active && <span className="text-[9px] text-gray-400 leading-none">{ds.from.slice(0,5)}–{ds.to.slice(0,5)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Date picker */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Datum</p>
        <DatePickerPopup
          value={date}
          onChange={iso => { setDate(iso); setTimeFrom(''); setDurationMins(null) }}
          availability={availability}
          hasAvailability={hasAvailability}
        />
      </div>

      {/* Step 3: Start time grid */}
      {date && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {timeFrom ? `Početak: ${timeFrom}` : 'Izaberi početak'}
            </p>
            {timeFrom && (
              <button type="button" onClick={() => { setTimeFrom(''); setDurationMins(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 underline">
                promeni
              </button>
            )}
          </div>
          {!timeFrom ? (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
              {availableTimes.slice(0, -1).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTimeFrom(t); setDurationMins(null) }}
                  className="py-2 rounded-lg text-xs font-bold border transition-all hover:border-[#00BF8F] hover:text-[#00BF8F] text-center"
                  style={{ backgroundColor: 'white', color: '#374151', borderColor: '#e5e7eb' }}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold"
              style={{ backgroundColor: '#f0fdf9', color: '#059669' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeFrom}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Duration pills */}
      {date && timeFrom && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Trajanje</p>
          <div className="flex flex-wrap gap-2">
            {availableDurations.map(d => (
              <button
                key={d.mins}
                type="button"
                onClick={() => setDurationMins(d.mins)}
                className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                style={durationMins === d.mins
                  ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9', color: '#059669' }
                  : { borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Price badge */}
      {date && timeFrom && durationMins && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ backgroundColor: '#fffbf0', border: '2px solid #FAAB43' }}>
            <span className="text-sm font-black" style={{ color: '#FAAB43' }}>
              {durationLabel} × {Number(wp.hourly_rate).toLocaleString()} RSD = {priceTotal?.toLocaleString()} RSD
            </span>
          </div>
        </div>
      )}

      {/* Step 6: Dogs section */}
      {dogs && dogs.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Psi</p>
          <div className="space-y-2">
            {dogs.map(d => (
              <label key={d.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                style={selectedDogs.includes(d.id)
                  ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' }
                  : { borderColor: '#e5e7eb' }}>
                <input type="checkbox" checked={selectedDogs.includes(d.id)}
                  onChange={e => {
                    setDogsError('')
                    setSelectedDogs(e.target.checked ? [...selectedDogs, d.id] : selectedDogs.filter(x => x !== d.id))
                  }}
                  className="rounded" style={{ accentColor: '#00BF8F' }} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                  <div className="text-xs text-gray-400">{d.breed} · {d.age} god</div>
                </div>
              </label>
            ))}
          </div>
          {dogsError && <p className="mt-1.5 text-xs text-red-500 font-semibold">{dogsError}</p>}
        </div>
      )}

      {dogs?.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
          Dodaj psa pre rezervacije.{' '}
          <Link to="/my-dogs" className="font-semibold underline">Dodaj psa</Link>
        </div>
      )}

      {/* Step 7: Notes collapsible */}
      <div>
        {!showNotes ? (
          <button type="button" onClick={() => setShowNotes(true)}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <span>+ Dodaj napomenu</span>
          </button>
        ) : (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Napomena</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Posebne napomene za šetača..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none" />
          </div>
        )}
      </div>

      {/* Step 8: Summary card */}
      {canSubmit && (
        <div style={{ animation: 'fadeIn 0.3s ease', borderLeft: '3px solid #00BF8F' }}
          className="bg-green-50 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pregled</p>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>🦮</span>
            <span className="font-semibold">Šetanje</span>
          </div>
          <div className="text-sm text-gray-700">📅 {formatDateNice(date)}</div>
          <div className="text-sm text-gray-700">🕐 {timeFrom} – {timeTo} ({durationLabel})</div>
          {dogs && selectedDogs.length > 0 && (
            <div className="text-sm text-gray-700">
              🐕 {dogs.filter(d => selectedDogs.includes(d.id)).map(d => d.name).join(', ')}
            </div>
          )}
          {priceTotal && (
            <div className="text-sm font-black" style={{ color: '#FAAB43' }}>
              💰 {priceTotal.toLocaleString()} RSD
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {/* Step 9: Submit */}
      <button
        onClick={() => {
          setError('')
          if (selectedDogs.length === 0) { setDogsError('Izaberi bar jednog psa.'); return }
          bookM.mutate()
        }}
        disabled={bookM.isPending || !canSubmit}
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

// --- Boarding Booking ---
function BoardingBooking({ walker, dogs }: { walker: Walker; dogs: Dog[] | undefined }) {
  const navigate = useNavigate()
  const wp = walker.walker_profile

  const [boardingType, setBoardingType] = useState<'single' | 'multi'>('single')
  const [boardingFrom, setBoardingFrom] = useState('')
  const [boardingTo, setBoardingTo] = useState('')
  const [checkIn, setCheckIn] = useState('08:00')
  const [checkOut, setCheckOut] = useState('18:00')
  const [selectedDogs, setSelectedDogs] = useState<number[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [dogsError, setDogsError] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (dogs && dogs.length === 1) setSelectedDogs([dogs[0].id])
  }, [dogs])

  // When switching type, reset dates
  function switchType(t: 'single' | 'multi') {
    setBoardingType(t)
    setBoardingFrom('')
    setBoardingTo('')
  }

  const isSingle = boardingType === 'single'

  function calcDays(): number {
    if (isSingle) return boardingFrom ? 1 : 0
    if (!boardingFrom || !boardingTo) return 0
    const a = new Date(boardingFrom + 'T12:00:00')
    const b = new Date(boardingTo + 'T12:00:00')
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  }

  const numDays = calcDays()
  const hasDate = isSingle ? !!boardingFrom : !!(boardingFrom && boardingTo)

  function calcPrice(): { label: string; total: number } | null {
    if (!hasDate) return null
    if (wp.daily_rate) {
      const total = numDays * Number(wp.daily_rate)
      const rate = Number(wp.daily_rate).toLocaleString()
      const dayLabel = numDays === 1 ? '1 dan' : `${numDays} dana`
      return { label: `${dayLabel} × ${rate} RSD = ${total.toLocaleString()} RSD`, total }
    } else {
      const [inH, inM] = checkIn.split(':').map(Number)
      const [outH, outM] = checkOut.split(':').map(Number)
      const hoursPerDay = Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60)
      const totalHours = numDays * hoursPerDay
      const total = Math.round(totalHours * Number(wp.hourly_rate))
      return { label: `${totalHours.toFixed(1)}h × ${Number(wp.hourly_rate).toLocaleString()} RSD = ${total.toLocaleString()} RSD`, total }
    }
  }

  const price = calcPrice()

  const TIMES = Array.from({ length: 17 }, (_, i) => {
    const h = i + 6
    return `${String(h).padStart(2, '0')}:00`
  })

  const formatDateNice = (iso: string) => {
    const d = new Date(iso + 'T12:00:00')
    const monthNames = ['jan','feb','mar','apr','maj','jun','jul','avg','sep','okt','nov','dec']
    return `${String(d.getDate()).padStart(2,'0')}. ${monthNames[d.getMonth()]}`
  }

  const endDate = isSingle ? boardingFrom : boardingTo
  const canSubmit = !!(hasDate && checkIn && checkOut && selectedDogs.length > 0)

  const bookM = useMutation({
    mutationFn: () => {
      return createReservation({
        walker: walker.id,
        service_type: 'boarding',
        start_time: `${boardingFrom}T${checkIn}:00`,
        end_time: `${endDate}T${checkOut}:00`,
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

  if (success) return (
    <div className="text-center py-6 px-5" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="font-black text-gray-900 mb-1">Rezervacija poslata!</h3>
      <p className="text-sm text-gray-500 mb-4">Šetač će te uskoro kontaktirati.</p>
      <button onClick={() => navigate('/reservations')} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ backgroundColor: '#00BF8F' }}>
        Pogledaj rezervacije
      </button>
    </div>
  )

  return (
    <div className="p-5 space-y-4">
      <style>{'@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }'}</style>

      {/* Type toggle: Jedan dan / Više dana */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tip čuvanja</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { val: 'single', icon: '📅', label: 'Jedan dan' },
            { val: 'multi',  icon: '📆', label: 'Više dana' },
          ] as const).map(opt => (
            <button key={opt.val} type="button" onClick={() => switchType(opt.val)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all"
              style={boardingType === opt.val
                ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9', color: '#059669' }
                : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: 'white' }}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date picker(s) */}
      <div style={{ animation: 'fadeIn 0.25s ease' }} key={boardingType}>
        {isSingle ? (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Datum</p>
            <DatePickerPopup
              value={boardingFrom}
              onChange={iso => setBoardingFrom(iso)}
              availability={{}}
              hasAvailability={false}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Od datuma</p>
              <DatePickerPopup
                value={boardingFrom}
                onChange={iso => { setBoardingFrom(iso); if (boardingTo && boardingTo < iso) setBoardingTo('') }}
                availability={{}}
                hasAvailability={false}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Do datuma</p>
              <DatePickerPopup
                value={boardingTo}
                onChange={iso => setBoardingTo(iso)}
                availability={{}}
                hasAvailability={false}
                minDate={boardingFrom || undefined}
              />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {hasDate && numDays > 0 && (
          <div className="mt-2" style={{ animation: 'fadeIn 0.3s ease' }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
              style={{ backgroundColor: '#f0fdf9', color: '#059669', border: '1.5px solid #bbf7d0' }}>
              🗓 {numDays === 1 ? '1 dan' : `${numDays} dana`}
              {!isSingle && boardingFrom && boardingTo && (
                <span className="font-normal text-gray-400 ml-1">
                  ({formatDateNice(boardingFrom)} – {formatDateNice(boardingTo)})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Times */}
      {hasDate && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Vreme</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1.5">Preuzimanje</p>
              <select value={checkIn} onChange={e => setCheckIn(e.target.value)}
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                style={{ borderColor: '#e5e7eb' }}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1.5">Vraćanje</p>
              <select value={checkOut} onChange={e => setCheckOut(e.target.value)}
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                style={{ borderColor: '#e5e7eb' }}>
                {TIMES.filter(t => t > checkIn).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Price */}
      {price && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ backgroundColor: '#fffbf0', border: '2px solid #FAAB43' }}>
            <span className="text-sm font-black" style={{ color: '#FAAB43' }}>
              {price.label}
            </span>
          </div>
        </div>
      )}

      {/* Dogs section */}
      {dogs && dogs.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Psi</p>
          <div className="space-y-2">
            {dogs.map(d => (
              <label key={d.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                style={selectedDogs.includes(d.id)
                  ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' }
                  : { borderColor: '#e5e7eb' }}>
                <input type="checkbox" checked={selectedDogs.includes(d.id)}
                  onChange={e => {
                    setDogsError('')
                    setSelectedDogs(e.target.checked ? [...selectedDogs, d.id] : selectedDogs.filter(x => x !== d.id))
                  }}
                  className="rounded" style={{ accentColor: '#00BF8F' }} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                  <div className="text-xs text-gray-400">{d.breed} · {d.age} god</div>
                </div>
              </label>
            ))}
          </div>
          {dogsError && <p className="mt-1.5 text-xs text-red-500 font-semibold">{dogsError}</p>}
        </div>
      )}

      {dogs?.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
          Dodaj psa pre rezervacije.{' '}
          <Link to="/my-dogs" className="font-semibold underline">Dodaj psa</Link>
        </div>
      )}

      {/* Notes collapsible */}
      <div>
        {!showNotes ? (
          <button type="button" onClick={() => setShowNotes(true)}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <span>+ Dodaj napomenu</span>
          </button>
        ) : (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Napomena</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Posebne napomene za čuvara..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none" />
          </div>
        )}
      </div>

      {/* Summary card */}
      {canSubmit && (
        <div style={{ animation: 'fadeIn 0.3s ease', borderLeft: '3px solid #FAAB43' }}
          className="bg-amber-50 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pregled</p>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>🏠</span>
            <span className="font-semibold">Čuvanje</span>
          </div>
          <div className="text-sm text-gray-700">
            📅 {isSingle
            ? formatDateNice(boardingFrom)
            : `${formatDateNice(boardingFrom)} – ${formatDateNice(boardingTo)}`
          } ({numDays === 1 ? '1 dan' : `${numDays} dana`})
          </div>
          <div className="text-sm text-gray-700">🕐 Preuzimanje: {checkIn} · Vraćanje: {checkOut}</div>
          {dogs && selectedDogs.length > 0 && (
            <div className="text-sm text-gray-700">
              🐕 {dogs.filter(d => selectedDogs.includes(d.id)).map(d => d.name).join(', ')}
            </div>
          )}
          {price && (
            <div className="text-sm font-black" style={{ color: '#FAAB43' }}>
              💰 {price.total.toLocaleString()} RSD
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <button
        onClick={() => {
          setError('')
          if (selectedDogs.length === 0) { setDogsError('Izaberi bar jednog psa.'); return }
          bookM.mutate()
        }}
        disabled={bookM.isPending || !canSubmit}
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

// --- Booking Widget wrapper ---
function BookingWidget({ walker, dogs }: { walker: Walker; dogs: Dog[] | undefined }) {
  const { user } = useAuth()
  const wp = walker.walker_profile
  const availableSvcs = getAvailableServices(wp.services)
  const [activeService, setActiveService] = useState<'walking' | 'boarding'>(availableSvcs[0])

  // Reset when service changes
  const [serviceKey, setServiceKey] = useState(0)
  const switchService = (svc: 'walking' | 'boarding') => {
    setActiveService(svc)
    setServiceKey(k => k + 1)
  }

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
    <div>
      {/* Service toggle (only for 'both') */}
      {availableSvcs.length > 1 && (
        <div className="px-5 pt-5">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => switchService('walking')}
              className="flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={activeService === 'walking'
                ? { backgroundColor: '#00BF8F', color: 'white' }
                : { backgroundColor: 'white', color: '#6b7280' }}
            >
              🦮 Šetanje
            </button>
            <button
              type="button"
              onClick={() => switchService('boarding')}
              className="flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={activeService === 'boarding'
                ? { backgroundColor: '#FAAB43', color: 'white' }
                : { backgroundColor: 'white', color: '#6b7280' }}
            >
              🏠 Čuvanje
            </button>
          </div>
        </div>
      )}

      {activeService === 'walking'
        ? <WalkingBooking key={`w-${serviceKey}`} walker={walker} dogs={dogs} />
        : <BoardingBooking key={`b-${serviceKey}`} walker={walker} dogs={dogs} />
      }
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
                <img src={imgUrl(r.owner_image)} className="w-8 h-8 rounded-full object-cover" alt="" />
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
          <img src={imgUrl(walker.profile_image)} alt={walker.first_name} className="w-full h-full object-cover" />
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

          {/* Services & prices */}
          <Reveal delay={60}>
          <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
            <h2 className="font-black text-gray-900 text-xl mb-4">Usluge & cene</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSvcs.includes('walking') && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-2xl">🦮</span>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Šetanje</div>
                    <div className="text-xs font-black mt-0.5" style={{ color: '#00BF8F' }}>
                      {Number(wp.hourly_rate).toLocaleString()} RSD/h
                    </div>
                  </div>
                </div>
              )}
              {availableSvcs.includes('boarding') && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-2xl">🏠</span>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Čuvanje</div>
                    <div className="text-xs font-black mt-0.5" style={{ color: '#FAAB43' }}>
                      {wp.daily_rate
                        ? `${Number(wp.daily_rate).toLocaleString()} RSD/dan`
                        : <span className="text-gray-400 font-normal">na upit</span>
                      }
                    </div>
                  </div>
                </div>
              )}
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
              <div className="flex items-baseline gap-2 flex-wrap">
                {(wp.services === 'walking' || wp.services === 'both') && Number(wp.hourly_rate) > 0 && (
                  <>
                    <span className="text-2xl font-black text-gray-900">{Number(wp.hourly_rate).toLocaleString()}</span>
                    <span className="text-gray-400 text-sm">RSD / sat</span>
                  </>
                )}
                {(wp.services === 'boarding' || wp.services === 'both') && wp.daily_rate && Number(wp.daily_rate) > 0 && (
                  <>
                    {wp.services === 'both' && <span className="text-gray-300 text-sm">·</span>}
                    <span className="text-xl font-black" style={{ color: '#FAAB43' }}>{Number(wp.daily_rate).toLocaleString()}</span>
                    <span className="text-gray-400 text-sm">RSD / dan</span>
                  </>
                )}
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
