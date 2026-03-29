import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, FlatList, Linking,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { getWalker, toggleFavorite } from '../api/users'
import { getDogs } from '../api/dogs'
import { createReservation } from '../api/reservations'
import { getWalkerReviews } from '../api/reviews'
import { imgUrl } from '../api/config'
import { useAuth } from '../context/AuthContext'
import { User, Dog } from '../types'
import { WalkersStackParamList } from '../navigation/WalkersNavigator'

type Route = RouteProp<WalkersStackParamList, 'WalkerDetail'>

// ─── Konstante ────────────────────────────────────────────────────────────────

const GREEN = '#00BF8F'
const GOLD  = '#FAAB43'
const DAYS_SR = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
const MONTHS_SR = ['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar']
const DURATION_OPTIONS = [
  { label: '30 min', mins: 30 },
  { label: '1 h', mins: 60 },
  { label: '1.5 h', mins: 90 },
  { label: '2 h', mins: 120 },
  { label: '3 h', mins: 180 },
]
const CHECK_TIMES = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`)
const ALL_TIMES = Array.from({ length: 32 }, (_, i) => {
  const h = Math.floor(i / 2) + 6
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function toIso(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function formatNiceDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  const months = ['jan','feb','mar','apr','maj','jun','jul','avg','sep','okt','nov','dec']
  return `${pad(d.getDate())}. ${months[d.getMonth()]}`
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function getDayIndex(iso: string) {
  const jsDay = new Date(iso + 'T12:00:00').getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

function getAvailableServices(services: string): ('walking' | 'boarding')[] {
  if (services === 'both') return ['walking', 'boarding']
  if (services === 'walking') return ['walking']
  return ['boarding']
}

// ─── Kalendar (inline) ────────────────────────────────────────────────────────

function MiniCalendar({
  value, onChange, minDate, availability, hasAvailability,
}: {
  value: string
  onChange: (iso: string) => void
  minDate?: string
  availability?: Record<string, { active: boolean; from: string; to: string }>
  hasAvailability?: boolean
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const effectiveMin = minDate ? new Date(minDate + 'T00:00:00') : today
  const [view, setView] = useState(() => ({
    year: effectiveMin.getFullYear(),
    month: effectiveMin.getMonth(),
  }))

  const { year, month } = view
  const startDow = (() => {
    const dow = new Date(year, month, 1).getDay()
    return dow === 0 ? 6 : dow - 1
  })()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const isAtMinMonth = year === effectiveMin.getFullYear() && month === effectiveMin.getMonth()

  function isUnavail(day: number) {
    const d = new Date(year, month, day)
    if (d < effectiveMin) return true
    if (!hasAvailability || !availability) return false
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    const ds = availability[String(dow)]
    return ds ? !ds.active : false
  }

  return (
    <View style={cal.container}>
      {/* Nav */}
      <View style={cal.nav}>
        <TouchableOpacity
          disabled={isAtMinMonth}
          onPress={() => setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}
          style={[cal.navBtn, isAtMinMonth && { opacity: 0.3 }]}
        >
          <Text style={cal.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={cal.navTitle}>{MONTHS_SR[month]} {year}</Text>
        <TouchableOpacity
          onPress={() => setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}
          style={cal.navBtn}
        >
          <Text style={cal.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={cal.dayHeader}>
        {DAYS_SR.map(d => (
          <Text key={d} style={cal.dayHeaderText}>{d}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={cal.cell} />
          const iso = toIso(year, month, day)
          const unavail = isUnavail(day)
          const selected = value === iso
          const isToday = new Date(year, month, day).toDateString() === new Date().toDateString()
          return (
            <TouchableOpacity
              key={i}
              style={[
                cal.cell,
                selected && { backgroundColor: GREEN, borderRadius: 8 },
                isToday && !selected && { backgroundColor: '#f0fdf9', borderRadius: 8 },
              ]}
              disabled={unavail}
              onPress={() => onChange(iso)}
            >
              <Text style={[
                cal.cellText,
                unavail && { color: '#d1d5db' },
                selected && { color: '#fff', fontWeight: '700' },
                isToday && !selected && { color: GREEN, fontWeight: '800' },
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const cal = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: '#e5e7eb' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { padding: 6 },
  navArrow: { fontSize: 22, color: '#6b7280' },
  navTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  dayHeader: { flexDirection: 'row', marginBottom: 4 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#9ca3af' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  cellText: { fontSize: 13, color: '#374151' },
})

// ─── Dostupnost (mini-grid) ───────────────────────────────────────────────────

function AvailabilityGrid({ availability }: { availability: Record<string, { active: boolean; from: string; to: string }> }) {
  if (Object.keys(availability).length === 0) return null
  return (
    <View>
      <Text style={s.sectionLabel}>DOSTUPNOST</Text>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {DAYS_SR.map((d, i) => {
          const ds = availability[String(i)]
          const active = ds?.active ?? false
          return (
            <View key={i} style={{ alignItems: 'center', gap: 2 }}>
              <View style={[s.dayBadge, active && { backgroundColor: GREEN }]}>
                <Text style={[s.dayBadgeText, active && { color: '#fff' }]}>{d}</Text>
              </View>
              {active && <Text style={s.dayTime}>{ds.from.slice(0,5)}–{ds.to.slice(0,5)}</Text>}
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Selekcija pasa ───────────────────────────────────────────────────────────

function DogSelector({
  dogs, selected, onChange, error,
}: {
  dogs: Dog[]; selected: number[]; onChange: (ids: number[]) => void; error: string
}) {
  if (dogs.length === 0) {
    return (
      <View style={s.warningBox}>
        <Text style={s.warningText}>⚠️ Dodaj psa pre rezervacije na web verziji.</Text>
      </View>
    )
  }
  return (
    <View>
      <Text style={s.sectionLabel}>PSI</Text>
      {dogs.map(d => (
        <TouchableOpacity
          key={d.id}
          style={[s.dogRow, selected.includes(d.id) && s.dogRowActive]}
          onPress={() => onChange(selected.includes(d.id) ? selected.filter(x => x !== d.id) : [...selected, d.id])}
        >
          <View style={[s.checkbox, selected.includes(d.id) && s.checkboxChecked]}>
            {selected.includes(d.id) && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
          </View>
          <View>
            <Text style={s.dogName}>{d.name}</Text>
            <Text style={s.dogBreed}>{d.breed} · {d.age} god</Text>
          </View>
        </TouchableOpacity>
      ))}
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  )
}

// ─── Walking Booking ──────────────────────────────────────────────────────────

function WalkingBooking({ walker, dogs }: { walker: User; dogs: Dog[] }) {
  const qc = useQueryClient()
  const navigation = useNavigation()
  const wp = walker.walker_profile!
  const availability: Record<string, { active: boolean; from: string; to: string }> = wp.availability ?? {}
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

  useEffect(() => {
    if (dogs.length === 1) setSelectedDogs([dogs[0].id])
  }, [dogs])

  const dayKey = date ? String(getDayIndex(date)) : null
  const daySchedule = dayKey && hasAvailability ? availability[dayKey] : null
  const availableTimes = daySchedule?.active
    ? ALL_TIMES.filter(t => t >= daySchedule.from && t < daySchedule.to)
    : ALL_TIMES
  const dayEnd = daySchedule?.active ? daySchedule.to : '22:00'
  const availableDurations = timeFrom
    ? DURATION_OPTIONS.filter(d => addMinutes(timeFrom, d.mins) <= dayEnd)
    : DURATION_OPTIONS
  const timeTo = timeFrom && durationMins ? addMinutes(timeFrom, durationMins) : ''
  const priceTotal = durationMins ? Math.round(Number(wp.hourly_rate) * durationMins / 60) : null
  const durationLabel = durationMins ? DURATION_OPTIONS.find(d => d.mins === durationMins)?.label ?? '' : ''
  const canSubmit = !!(date && timeFrom && durationMins && selectedDogs.length > 0)

  const bookM = useMutation({
    mutationFn: () => createReservation({
      walker: walker.id,
      service_type: 'walking',
      start_time: `${date}T${timeFrom}:00`,
      end_time: `${date}T${timeTo}:00`,
      dog_ids: selectedDogs,
      duration: durationMins ?? undefined,
      notes,
    }),
    onSuccess: () => { setSuccess(true); qc.invalidateQueries({ queryKey: ['reservations'] }) },
    onError: (e: any) => {
      const msgs = e?.response?.data
      const first = msgs ? Object.values(msgs).flat()[0] as string : 'Greška pri rezervaciji.'
      setError(first)
    },
  })

  if (success) return (
    <View style={s.successBox}>
      <Text style={s.successEmoji}>🎉</Text>
      <Text style={s.successTitle}>Rezervacija poslata!</Text>
      <Text style={s.successSub}>Šetač će te uskoro kontaktirati.</Text>
      <TouchableOpacity style={s.greenBtn} onPress={() => navigation.getParent()?.navigate('ReservationsTab' as never)}>
        <Text style={s.greenBtnText}>Pogledaj rezervacije</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={{ gap: 18 }}>
      {hasAvailability && <AvailabilityGrid availability={availability} />}

      {/* Datum */}
      <View>
        <Text style={s.sectionLabel}>DATUM</Text>
        <MiniCalendar
          value={date}
          onChange={iso => { setDate(iso); setTimeFrom(''); setDurationMins(null) }}
          availability={availability}
          hasAvailability={hasAvailability}
        />
      </View>

      {/* Vreme */}
      {date && (
        <View>
          <View style={s.rowBetween}>
            <Text style={s.sectionLabel}>{timeFrom ? `POČETAK: ${timeFrom}` : 'IZABERI POČETAK'}</Text>
            {timeFrom && (
              <TouchableOpacity onPress={() => { setTimeFrom(''); setDurationMins(null) }}>
                <Text style={{ fontSize: 12, color: '#9ca3af', textDecorationLine: 'underline' }}>promeni</Text>
              </TouchableOpacity>
            )}
          </View>
          {!timeFrom ? (
            <View style={s.timeGrid}>
              {availableTimes.slice(0, -1).map(t => (
                <TouchableOpacity key={t} style={s.timeBtn} onPress={() => { setTimeFrom(t); setDurationMins(null) }}>
                  <Text style={s.timeBtnText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={s.selectedTime}>
              <Text style={s.selectedTimeText}>🕐 {timeFrom}</Text>
            </View>
          )}
        </View>
      )}

      {/* Trajanje */}
      {date && timeFrom && (
        <View>
          <Text style={s.sectionLabel}>TRAJANJE</Text>
          <View style={s.pillRow}>
            {availableDurations.map(d => (
              <TouchableOpacity
                key={d.mins}
                style={[s.pill, durationMins === d.mins && s.pillActive]}
                onPress={() => setDurationMins(d.mins)}
              >
                <Text style={[s.pillText, durationMins === d.mins && s.pillTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Cena */}
      {priceTotal && (
        <View style={s.priceBadge}>
          <Text style={[s.priceBadgeText, { color: GOLD }]}>
            {durationLabel} × {Number(wp.hourly_rate).toLocaleString()} RSD = {priceTotal.toLocaleString()} RSD
          </Text>
        </View>
      )}

      {/* Psi */}
      <DogSelector dogs={dogs} selected={selectedDogs} onChange={ids => { setSelectedDogs(ids); setDogsError('') }} error={dogsError} />

      {/* Napomene */}
      {!showNotes ? (
        <TouchableOpacity onPress={() => setShowNotes(true)}>
          <Text style={s.addNote}>+ Dodaj napomenu</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={s.sectionLabel}>NAPOMENA</Text>
          <TextInput
            style={s.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Posebne napomene za šetača..."
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Summary */}
      {canSubmit && (
        <View style={s.summaryBox}>
          <Text style={[s.sectionLabel, { color: GREEN }]}>PREGLED</Text>
          <Text style={s.summaryRow}>🦮 Šetanje</Text>
          <Text style={s.summaryRow}>📅 {formatNiceDate(date)}</Text>
          <Text style={s.summaryRow}>🕐 {timeFrom} – {timeTo} ({durationLabel})</Text>
          {selectedDogs.length > 0 && (
            <Text style={s.summaryRow}>🐕 {dogs.filter(d => selectedDogs.includes(d.id)).map(d => d.name).join(', ')}</Text>
          )}
          {priceTotal && <Text style={[s.summaryRow, { color: GOLD, fontWeight: '800' }]}>💰 {priceTotal.toLocaleString()} RSD</Text>}
        </View>
      )}

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[s.greenBtn, (!canSubmit || bookM.isPending) && { opacity: 0.4 }]}
        disabled={!canSubmit || bookM.isPending}
        onPress={() => {
          setError('')
          if (selectedDogs.length === 0) { setDogsError('Izaberi bar jednog psa.'); return }
          bookM.mutate()
        }}
      >
        {bookM.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.greenBtnText}>Rezerviši</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

// ─── Boarding Booking ─────────────────────────────────────────────────────────

function BoardingBooking({ walker, dogs }: { walker: User; dogs: Dog[] }) {
  const qc = useQueryClient()
  const navigation = useNavigation()
  const wp = walker.walker_profile!

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
  const [pickerModal, setPickerModal] = useState<'checkIn' | 'checkOut' | null>(null)

  useEffect(() => {
    if (dogs.length === 1) setSelectedDogs([dogs[0].id])
  }, [dogs])

  function switchType(t: 'single' | 'multi') {
    setBoardingType(t); setBoardingFrom(''); setBoardingTo('')
  }

  const isSingle = boardingType === 'single'
  const hasDate = isSingle ? !!boardingFrom : !!(boardingFrom && boardingTo)
  const endDate = isSingle ? boardingFrom : boardingTo

  function calcDays() {
    if (isSingle) return boardingFrom ? 1 : 0
    if (!boardingFrom || !boardingTo) return 0
    const a = new Date(boardingFrom + 'T12:00:00'), b = new Date(boardingTo + 'T12:00:00')
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)
  }

  const numDays = calcDays()

  function calcPrice() {
    if (!hasDate) return null
    if (wp.daily_rate) {
      const total = numDays * Number(wp.daily_rate)
      return { label: `${numDays === 1 ? '1 dan' : `${numDays} dana`} × ${Number(wp.daily_rate).toLocaleString()} RSD = ${total.toLocaleString()} RSD`, total }
    }
    const [inH, inM] = checkIn.split(':').map(Number)
    const [outH, outM] = checkOut.split(':').map(Number)
    const hoursPerDay = Math.max(0, (outH * 60 + outM - inH * 60 - inM) / 60)
    const totalHours = numDays * hoursPerDay
    const total = Math.round(totalHours * Number(wp.hourly_rate))
    return { label: `${totalHours.toFixed(1)}h × ${Number(wp.hourly_rate).toLocaleString()} RSD = ${total.toLocaleString()} RSD`, total }
  }

  const price = calcPrice()
  const canSubmit = !!(hasDate && checkIn && checkOut && selectedDogs.length > 0)

  const bookM = useMutation({
    mutationFn: () => createReservation({
      walker: walker.id,
      service_type: 'boarding',
      start_time: `${boardingFrom}T${checkIn}:00`,
      end_time: `${endDate}T${checkOut}:00`,
      dog_ids: selectedDogs,
      notes,
    }),
    onSuccess: () => { setSuccess(true); qc.invalidateQueries({ queryKey: ['reservations'] }) },
    onError: (e: any) => {
      const msgs = e?.response?.data
      setError(msgs ? (Object.values(msgs).flat()[0] as string) : 'Greška.')
    },
  })

  if (success) return (
    <View style={s.successBox}>
      <Text style={s.successEmoji}>🎉</Text>
      <Text style={s.successTitle}>Rezervacija poslata!</Text>
      <Text style={s.successSub}>Šetač će te uskoro kontaktirati.</Text>
      <TouchableOpacity style={s.greenBtn} onPress={() => navigation.getParent()?.navigate('ReservationsTab' as never)}>
        <Text style={s.greenBtnText}>Pogledaj rezervacije</Text>
      </TouchableOpacity>
    </View>
  )

  const checkOutTimes = CHECK_TIMES.filter(t => t > checkIn)

  return (
    <View style={{ gap: 18 }}>
      {/* Tip čuvanja */}
      <View>
        <Text style={s.sectionLabel}>TIP ČUVANJA</Text>
        <View style={s.typeRow}>
          {[{ val: 'single', icon: '📅', label: 'Jedan dan' }, { val: 'multi', icon: '📆', label: 'Više dana' }].map(opt => (
            <TouchableOpacity
              key={opt.val}
              style={[s.typeBtn, boardingType === opt.val && s.typeBtnActive]}
              onPress={() => switchType(opt.val as 'single' | 'multi')}
            >
              <Text style={[s.typeBtnText, boardingType === opt.val && s.typeBtnTextActive]}>
                {opt.icon} {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Datum */}
      {isSingle ? (
        <View>
          <Text style={s.sectionLabel}>DATUM</Text>
          <MiniCalendar value={boardingFrom} onChange={setBoardingFrom} availability={{}} hasAvailability={false} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View>
            <Text style={s.sectionLabel}>OD DATUMA</Text>
            <MiniCalendar
              value={boardingFrom}
              onChange={iso => { setBoardingFrom(iso); if (boardingTo && boardingTo < iso) setBoardingTo('') }}
              availability={{}} hasAvailability={false}
            />
          </View>
          <View>
            <Text style={s.sectionLabel}>DO DATUMA</Text>
            <MiniCalendar value={boardingTo} onChange={setBoardingTo} minDate={boardingFrom || undefined} availability={{}} hasAvailability={false} />
          </View>
        </View>
      )}

      {/* Broj dana badge */}
      {hasDate && numDays > 0 && (
        <View style={s.daysBadge}>
          <Text style={s.daysBadgeText}>
            🗓 {numDays === 1 ? '1 dan' : `${numDays} dana`}
            {!isSingle && boardingFrom && boardingTo ? `  (${formatNiceDate(boardingFrom)} – ${formatNiceDate(boardingTo)})` : ''}
          </Text>
        </View>
      )}

      {/* Vreme */}
      {hasDate && (
        <View>
          <Text style={s.sectionLabel}>VREME</Text>
          <View style={s.typeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.timePickerLabel}>Preuzimanje</Text>
              <TouchableOpacity style={s.timePicker} onPress={() => setPickerModal('checkIn')}>
                <Text style={s.timePickerText}>{checkIn}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.timePickerLabel}>Vraćanje</Text>
              <TouchableOpacity style={s.timePicker} onPress={() => setPickerModal('checkOut')}>
                <Text style={s.timePickerText}>{checkOut}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Cena */}
      {price && (
        <View style={[s.priceBadge, { borderColor: GOLD }]}>
          <Text style={[s.priceBadgeText, { color: GOLD }]}>{price.label}</Text>
        </View>
      )}

      {/* Psi */}
      <DogSelector dogs={dogs} selected={selectedDogs} onChange={ids => { setSelectedDogs(ids); setDogsError('') }} error={dogsError} />

      {/* Napomene */}
      {!showNotes ? (
        <TouchableOpacity onPress={() => setShowNotes(true)}>
          <Text style={s.addNote}>+ Dodaj napomenu</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={s.sectionLabel}>NAPOMENA</Text>
          <TextInput style={s.textarea} value={notes} onChangeText={setNotes} placeholder="Posebne napomene..." multiline numberOfLines={3} />
        </View>
      )}

      {/* Summary */}
      {canSubmit && (
        <View style={[s.summaryBox, { borderLeftColor: GOLD }]}>
          <Text style={[s.sectionLabel, { color: GOLD }]}>PREGLED</Text>
          <Text style={s.summaryRow}>🏠 Čuvanje</Text>
          <Text style={s.summaryRow}>
            📅 {isSingle ? formatNiceDate(boardingFrom) : `${formatNiceDate(boardingFrom)} – ${formatNiceDate(boardingTo)}`} ({numDays === 1 ? '1 dan' : `${numDays} dana`})
          </Text>
          <Text style={s.summaryRow}>🕐 Preuzimanje: {checkIn} · Vraćanje: {checkOut}</Text>
          {selectedDogs.length > 0 && (
            <Text style={s.summaryRow}>🐕 {dogs.filter(d => selectedDogs.includes(d.id)).map(d => d.name).join(', ')}</Text>
          )}
          {price && <Text style={[s.summaryRow, { color: GOLD, fontWeight: '800' }]}>💰 {price.total.toLocaleString()} RSD</Text>}
        </View>
      )}

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[s.greenBtn, (!canSubmit || bookM.isPending) && { opacity: 0.4 }]}
        disabled={!canSubmit || bookM.isPending}
        onPress={() => {
          setError('')
          if (selectedDogs.length === 0) { setDogsError('Izaberi bar jednog psa.'); return }
          bookM.mutate()
        }}
      >
        {bookM.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.greenBtnText}>Rezerviši</Text>}
      </TouchableOpacity>

      {/* Time picker modal */}
      <Modal visible={!!pickerModal} transparent animationType="slide" onRequestClose={() => setPickerModal(null)}>
        <View style={s.pickerOverlay}>
          <View style={s.pickerSheet}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>{pickerModal === 'checkIn' ? 'Preuzimanje' : 'Vraćanje'}</Text>
              <TouchableOpacity onPress={() => setPickerModal(null)}><Text style={{ color: GREEN, fontWeight: '700' }}>Zatvori</Text></TouchableOpacity>
            </View>
            <FlatList
              data={pickerModal === 'checkOut' ? checkOutTimes : CHECK_TIMES}
              keyExtractor={t => t}
              renderItem={({ item }) => {
                const selected = pickerModal === 'checkIn' ? checkIn === item : checkOut === item
                return (
                  <TouchableOpacity
                    style={[s.pickerItem, selected && { backgroundColor: '#f0fdf9' }]}
                    onPress={() => {
                      if (pickerModal === 'checkIn') setCheckIn(item)
                      else setCheckOut(item)
                      setPickerModal(null)
                    }}
                  >
                    <Text style={[s.pickerItemText, selected && { color: GREEN, fontWeight: '700' }]}>{item}</Text>
                    {selected && <Text style={{ color: GREEN }}>✓</Text>}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Booking Widget ────────────────────────────────────────────────────────────

function BookingWidget({ walker, dogs }: { walker: User; dogs: Dog[] }) {
  const wp = walker.walker_profile!
  const services = getAvailableServices(wp.services)
  const [activeService, setActiveService] = useState<'walking' | 'boarding'>(services[0])
  const [key, setKey] = useState(0)

  function switchService(svc: 'walking' | 'boarding') {
    setActiveService(svc); setKey(k => k + 1)
  }

  return (
    <View style={s.bookingWidget}>
      {/* Service tabs */}
      {services.length > 1 && (
        <View style={s.serviceTabs}>
          {services.map(svc => (
            <TouchableOpacity
              key={svc}
              style={[s.serviceTab, activeService === svc && s.serviceTabActive]}
              onPress={() => switchService(svc)}
            >
              <Text style={[s.serviceTabText, activeService === svc && s.serviceTabTextActive]}>
                {svc === 'walking' ? '🦮 Šetanje' : '🏠 Čuvanje'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View key={key} style={{ padding: 16 }}>
        {activeService === 'walking'
          ? <WalkingBooking walker={walker} dogs={dogs} />
          : <BoardingBooking walker={walker} dogs={dogs} />
        }
      </View>
    </View>
  )
}

// ─── Glavni ekran ──────────────────────────────────────────────────────────────

export default function WalkerDetailScreen() {
  const route = useRoute<Route>()
  const navigation = useNavigation()
  const queryClient = useQueryClient()
  const { walkerId } = route.params
  const { user } = useAuth()

  const { data: walker, isLoading } = useQuery({
    queryKey: ['walker', walkerId],
    queryFn: () => getWalker(walkerId),
  })

  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: getDogs,
    enabled: user?.role === 'owner',
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', walkerId],
    queryFn: () => getWalkerReviews(walkerId),
  })

  const favMutation = useMutation({
    mutationFn: () => toggleFavorite(walkerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walker', walkerId] })
      queryClient.invalidateQueries({ queryKey: ['walkers'] })
    },
  })

  if (isLoading || !walker) {
    return <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  }

  const wp = walker.walker_profile
  const photo = imgUrl(walker.profile_image)

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Header */}
      <View style={s.header}>
        {photo
          ? <Image source={{ uri: photo }} style={s.avatar} />
          : <View style={[s.avatar, s.avatarPlaceholder]}><Text style={{ fontSize: 44 }}>👤</Text></View>
        }
        <Text style={s.name}>{walker.first_name} {walker.last_name}</Text>

        {/* Rating */}
        <View style={s.starsRow}>
          {[1,2,3,4,5].map(n => (
            <Text key={n} style={{ fontSize: 16, color: n <= Math.round(walker.average_rating ?? 0) ? GOLD : '#e5e7eb' }}>★</Text>
          ))}
          <Text style={s.ratingText}>
            {walker.average_rating ? `${walker.average_rating.toFixed(1)} (${walker.review_count} recenzija)` : 'Još nema recenzija'}
          </Text>
        </View>

        <Text style={s.address}>📍 {walker.address}</Text>

        {user && (
          <TouchableOpacity
            onPress={() => favMutation.mutate()}
            style={{
              marginTop: 10,
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: walker.is_favorited ? '#fef2f2' : '#f3f4f6',
              borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
              borderWidth: 1.5,
              borderColor: walker.is_favorited ? '#fca5a5' : '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: 14 }}>{walker.is_favorited ? '❤️' : '🖤'}</Text>
            <Text style={{
              fontSize: 13, fontWeight: '700',
              color: walker.is_favorited ? '#ef4444' : '#374151',
            }}>
              {walker.is_favorited ? 'Omiljeni' : 'Dodaj u omiljene'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cene */}
      {wp && (
        <View style={s.pricesRow}>
          {wp.hourly_rate ? (
            <View style={s.priceCard}>
              <Text style={s.priceLabel}>🦮 Šetanje</Text>
              <Text style={s.priceValue}>{Number(wp.hourly_rate).toLocaleString()} RSD/h</Text>
            </View>
          ) : null}
          {wp.daily_rate ? (
            <View style={s.priceCard}>
              <Text style={s.priceLabel}>🏠 Čuvanje</Text>
              <Text style={s.priceValue}>{Number(wp.daily_rate).toLocaleString()} RSD/dan</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Bio */}
      {wp?.bio ? (
        <View style={s.bioBox}>
          <Text style={s.bioText}>{wp.bio}</Text>
        </View>
      ) : null}

      {/* Lokacija */}
      {(walker.address || (walker.lat && walker.lng)) && (
        <View style={s.locationBox}>
          <Text style={s.locationTitle}>📍 Lokacija</Text>
          {walker.address ? (
            <Text style={s.locationAddress}>{walker.address}</Text>
          ) : null}
          {walker.lat && walker.lng ? (
            <TouchableOpacity
              style={s.mapsBtn}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${walker.lat},${walker.lng}`
                Linking.openURL(url)
              }}
            >
              <Text style={s.mapsBtnText}>🗺  Otvori u mapi</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Zakaži termin (samo za vlasnike) */}
      {user?.role === 'owner' && wp && (
        <View>
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderTitle}>📅 Zakaži termin</Text>
          </View>
          <BookingWidget walker={walker} dogs={dogs} />
        </View>
      )}

      {/* Pošalji poruku */}
      {user && user.id !== walker.id && (
        <View style={s.msgSection}>
          <TouchableOpacity
            style={s.msgBtn}
            onPress={() => navigation.getParent<any>()?.navigate('PorukeTab', { userId: walker.id })}
          >
            <Text style={s.msgBtnText}>💬  Pošalji poruku</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recenzije */}
      <View style={s.reviewsSection}>
        <Text style={s.reviewsTitle}>Recenzije ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <Text style={s.emptyText}>Još nema recenzija</Text>
        ) : reviews.map(r => (
          <View key={r.id} style={s.reviewCard}>
            <View style={s.reviewTop}>
              <Text style={s.reviewName}>{r.owner_name}</Text>
              <View style={{ flexDirection: 'row' }}>
                {[1,2,3,4,5].map(n => (
                  <Text key={n} style={{ fontSize: 12, color: n <= r.rating ? GOLD : '#e5e7eb' }}>★</Text>
                ))}
              </View>
            </View>
            {r.comment ? <Text style={s.reviewComment}>{r.comment}</Text> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

// ─── Stilovi ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 24, paddingHorizontal: 16, marginBottom: 2 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  ratingText: { fontSize: 13, color: '#6b7280', marginLeft: 4 },
  address: { fontSize: 14, color: '#9ca3af' },
  // Cene
  pricesRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', marginBottom: 2 },
  priceCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, alignItems: 'center' },
  priceLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  priceValue: { fontSize: 18, fontWeight: '800', color: '#111' },
  // Bio
  bioBox: { backgroundColor: '#fff', padding: 16, marginBottom: 2 },
  bioText: { fontSize: 14, color: '#555', lineHeight: 22 },
  // Booking widget
  bookingWidget: { backgroundColor: '#fff', marginBottom: 2 },
  serviceTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  serviceTab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  serviceTabActive: { borderBottomColor: GREEN },
  serviceTabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  serviceTabTextActive: { color: GREEN },
  // Shared booking
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff',
  },
  timeBtnText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  selectedTime: { backgroundColor: '#f0fdf9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  selectedTimeText: { color: GREEN, fontWeight: '700', fontSize: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff' },
  pillActive: { borderColor: GREEN, backgroundColor: '#f0fdf9' },
  pillText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  pillTextActive: { color: GREEN },
  priceBadge: { backgroundColor: '#fffbf0', borderWidth: 2, borderColor: GOLD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  priceBadgeText: { fontSize: 14, fontWeight: '800' },
  dogRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5,
    borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 8, backgroundColor: '#fff',
  },
  dogRowActive: { borderColor: GREEN, backgroundColor: '#f0fdf9' },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#d1d5db', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  dogName: { fontSize: 14, fontWeight: '600', color: '#111' },
  dogBreed: { fontSize: 12, color: '#9ca3af' },
  addNote: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  textarea: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    minHeight: 80, textAlignVertical: 'top',
  },
  summaryBox: { backgroundColor: '#f0fdf9', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: GREEN, gap: 4 },
  summaryRow: { fontSize: 14, color: '#374151' },
  errorText: { fontSize: 13, color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: 8, padding: 10 },
  warningBox: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 12 },
  warningText: { fontSize: 13, color: '#92400e' },
  greenBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  greenBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', padding: 24, gap: 10 },
  successEmoji: { fontSize: 48 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  successSub: { fontSize: 14, color: '#6b7280' },
  // Boarding specific
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  typeBtnActive: { borderColor: GREEN, backgroundColor: '#f0fdf9' },
  typeBtnText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  typeBtnTextActive: { color: GREEN },
  daysBadge: { backgroundColor: '#f0fdf9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#bbf7d0' },
  daysBadgeText: { fontSize: 13, fontWeight: '800', color: '#059669' },
  timePickerLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 6 },
  timePicker: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  timePickerText: { fontSize: 15, fontWeight: '700', color: '#111', textAlign: 'center' },
  // Time picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  pickerItemText: { fontSize: 16, color: '#374151' },
  // Availability
  dayBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  dayBadgeText: { fontSize: 11, fontWeight: '700', color: '#d1d5db' },
  dayTime: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
  // Reviews
  reviewsSection: { backgroundColor: '#fff', padding: 16, marginTop: 2 },
  reviewsTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 14 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  reviewCard: { borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12, marginTop: 8 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#333' },
  reviewComment: { fontSize: 14, color: '#555' },
  // Lokacija
  locationBox: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16, marginTop: 2 },
  locationTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 8 },
  locationAddress: { fontSize: 14, color: '#555', marginBottom: 12 },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#00BF8F', borderRadius: 12,
    paddingVertical: 12,
  },
  mapsBtnText: { fontSize: 14, fontWeight: '700', color: '#00BF8F' },
  // Section header
  sectionHeader: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 2 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  // Pošalji poruku
  msgSection: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginTop: 2 },
  msgBtn: {
    borderWidth: 2, borderColor: GREEN, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  msgBtnText: { fontSize: 15, fontWeight: '700', color: GREEN },
})
