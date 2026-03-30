import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator, TextInput, Linking, Platform,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRoute, RouteProp, useNavigation, CompositeNavigationProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Location from 'expo-location'
import MapView, { Marker } from 'react-native-maps'
import {
  getReservations, cancelReservation, respondReservation,
  completeReservation, startWalk, updateWalkLocation, getWalkLocation,
} from '../api/reservations'
import { createReview } from '../api/reviews'
import { useAuth } from '../context/AuthContext'
import { ReservationsStackParamList } from '../navigation/ReservationsNavigator'

type Route = RouteProp<ReservationsStackParamList, 'ReservationDetail'>
type Nav = NativeStackNavigationProp<ReservationsStackParamList, 'ReservationDetail'>

const GREEN = '#00BF8F'
const GOLD  = '#FAAB43'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  pending:     { label: 'Na čekanju',  bg: '#fffbeb', color: '#b45309', icon: '⏳' },
  confirmed:   { label: 'Potvrđeno',   bg: '#f0fdf9', color: '#065f46', icon: '✅' },
  in_progress: { label: 'U toku',      bg: '#f0fdf9', color: GREEN,     icon: '🐾' },
  rejected:    { label: 'Odbijeno',    bg: '#fef2f2', color: '#991b1b', icon: '❌' },
  completed:   { label: 'Završeno',    bg: '#f9fafb', color: '#374151', icon: '🏁' },
  cancelled:   { label: 'Otkazano',    bg: '#f9fafb', color: '#9ca3af', icon: '🚫' },
}

const DOG_SIZE: Record<string, string> = { small: 'Mali', medium: 'Srednji', large: 'Veliki' }

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={row.wrap}>
      <Text style={row.label}>{label}</Text>
      <Text style={[row.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

const row = StyleSheet.create({
  wrap: { flexDirection: 'row', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  label: { width: 110, fontSize: 13, color: '#9ca3af', fontWeight: '700' },
  value: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },
})

function Section({ title, children, tint }: { title: string; children: React.ReactNode; tint?: string }) {
  return (
    <View style={[styles.section, tint ? { backgroundColor: tint } : null]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function walkDuration(startedAt: string | null): string {
  if (!startedAt) return ''
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
  if (mins < 1) return 'Upravo počelo'
  if (mins < 60) return `Traje ${mins} min`
  return `Traje ${Math.floor(mins / 60)}h ${mins % 60}min`
}

export default function ReservationDetailScreen() {
  const route = useRoute<Route>()
  const navigation = useNavigation<Nav>()
  const { reservationId } = route.params
  const { user } = useAuth()
  const qc = useQueryClient()

  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: getReservations,
    refetchInterval: 5000,
  })

  const reservation = reservations.find(r => r.id === reservationId)
  const isOwner  = user?.role === 'owner'
  const isWalker = user?.role === 'walker'
  const isInProgress = reservation?.status === 'in_progress'

  // ── Owner: poll walker location when in_progress ──────────────────────────
  const { data: walkLocation } = useQuery({
    queryKey: ['walk-location', reservationId],
    queryFn: () => getWalkLocation(reservationId),
    enabled: isInProgress && isOwner,
    refetchInterval: isInProgress && isOwner ? 5000 : false,
  })

  // ── Walker: send GPS every 5s when in_progress ────────────────────────────
  const [gpsError, setGpsError] = useState(false)

  useEffect(() => {
    if (!isInProgress || !isWalker) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
        locationIntervalRef.current = null
      }
      setGpsError(false)
      return () => {
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current)
          locationIntervalRef.current = null
        }
      }
    }

    let failCount = 0

    const sendLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        await updateWalkLocation(reservationId, loc.coords.latitude, loc.coords.longitude)
        failCount = 0
        setGpsError(false)
      } catch (e) {
        failCount++
        if (failCount >= 3) setGpsError(true)
        console.warn('GPS update failed:', e)
      }
    }

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setGpsError(true)
        Alert.alert('Lokacija', 'Dozvola za lokaciju je potrebna za praćenje šetnje.')
        return
      }
      await sendLocation()
      locationIntervalRef.current = setInterval(sendLocation, 5000)
    }

    start()
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
        locationIntervalRef.current = null
      }
    }
  }, [isInProgress, isWalker, reservationId])

  // ── Mutations ─────────────────────────────────────────────────────────────
  const cancel = useMutation({
    mutationFn: () => cancelReservation(reservationId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservations'] }); navigation.goBack() },
    onError: () => Alert.alert('Greška', 'Nije moguće otkazati rezervaciju.'),
  })

  const respond = useMutation({
    mutationFn: (s: 'confirmed' | 'rejected') => respondReservation(reservationId, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
    onError: () => Alert.alert('Greška', 'Pokušaj ponovo.'),
  })

  const startWalkMut = useMutation({
    mutationFn: () => startWalk(reservationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
    onError: (e: any) => Alert.alert('Greška', e?.response?.data?.detail || 'Pokušaj ponovo.'),
  })

  const complete = useMutation({
    mutationFn: () => completeReservation(reservationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
    onError: () => Alert.alert('Greška', 'Pokušaj ponovo.'),
  })

  const submitReview = useMutation({
    mutationFn: () => createReview({ reservation: reservationId, rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      Alert.alert('Hvala!', 'Recenzija je poslata.')
    },
    onError: () => Alert.alert('Greška', 'Nije moguće poslati recenziju.'),
  })

  if (isLoading || !reservation) {
    return <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /></View>
  }

  const cfg   = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.cancelled
  const start = new Date(reservation.start_time)
  const end   = new Date(reservation.end_time)
  const other = isOwner ? reservation.walker_info : reservation.owner_info
  const now   = new Date()

  // 30 minute early start tolerance
  const canStart = isWalker && reservation.status === 'confirmed' && now >= new Date(start.getTime() - 30 * 60 * 1000)

  const dateStr = start.toLocaleDateString('sr-Latn', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })}`

  function confirmCancel() {
    Alert.alert('Otkaži rezervaciju', 'Da li si siguran?', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Da, otkaži', style: 'destructive', onPress: () => cancel.mutate() },
    ])
  }

  function openInMaps(lat: string, lng: string) {
    const url = Platform.OS === 'android'
      ? `geo:${lat},${lng}?q=${lat},${lng}(Šetač)`
      : `maps:0,0?q=${lat},${lng}`
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)
    )
  }

  function handleReviewSubmit() {
    if (reviewRating === 0) { Alert.alert('Greška', 'Izaberi ocenu (1–5 zvezdica).'); return }
    submitReview.mutate()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
        <Text style={styles.statusIcon}>{cfg.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>STATUS REZERVACIJE</Text>
          <Text style={[styles.statusValue, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {reservation.status === 'confirmed' && now < start && (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingBadgeText}>Nadolazeće</Text>
          </View>
        )}
        {reservation.status === 'in_progress' && (
          <View style={[styles.upcomingBadge, { backgroundColor: GREEN + '25' }]}>
            <Text style={[styles.upcomingBadgeText, { color: GREEN }]}>Aktivna 🔴</Text>
          </View>
        )}
      </View>

      {/* ── OWNER: Live walk tracking ────────────────────────────────────── */}
      {isOwner && reservation.status === 'in_progress' && (
        <View style={styles.liveCard}>
          <View style={styles.liveCardHeader}>
            <Text style={styles.liveCardTitle}>🐾 Šetnja je u toku</Text>
            {reservation.walk_started_at ? (
              <Text style={styles.liveCardDuration}>{walkDuration(reservation.walk_started_at)}</Text>
            ) : null}
          </View>

          {walkLocation?.lat && walkLocation?.lng && !isNaN(parseFloat(walkLocation.lat)) && !isNaN(parseFloat(walkLocation.lng)) ? (
            <>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={{
                    latitude: parseFloat(walkLocation.lat),
                    longitude: parseFloat(walkLocation.lng),
                    latitudeDelta: 0.006,
                    longitudeDelta: 0.006,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: parseFloat(walkLocation.lat),
                      longitude: parseFloat(walkLocation.lng),
                    }}
                    title={reservation.walker_info.first_name}
                    description="Trenutna lokacija šetača"
                  />
                </MapView>
              </View>
              <TouchableOpacity
                style={styles.openMapsBtn}
                onPress={() => openInMaps(walkLocation.lat!, walkLocation.lng!)}
              >
                <Text style={styles.openMapsBtnText}>🗺️  Otvori u Maps aplikaciji</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.locatingRow}>
              <ActivityIndicator size="small" color={GREEN} />
              <Text style={styles.locatingText}>Čekanje na lokaciju šetača...</Text>
            </View>
          )}
        </View>
      )}

      {/* ── WALKER: GPS tracking status when in_progress ─────────────────── */}
      {isWalker && reservation.status === 'in_progress' && (
        <View style={[styles.gpsActiveCard, gpsError && { borderColor: '#fca5a5' }]}>
          <Text style={styles.gpsActiveIcon}>{gpsError ? '⚠️' : '📡'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.gpsActiveTitle, gpsError && { color: '#dc2626' }]}>
              {gpsError ? 'Problem sa GPS-om' : 'Lokacija se šalje vlasniku'}
            </Text>
            {gpsError ? (
              <Text style={[styles.gpsActiveSubtitle, { color: '#ef4444' }]}>Proveri dozvole za lokaciju</Text>
            ) : reservation.walk_started_at ? (
              <Text style={styles.gpsActiveSubtitle}>{walkDuration(reservation.walk_started_at)}</Text>
            ) : null}
          </View>
          {gpsError ? null : <ActivityIndicator size="small" color={GREEN} />}
        </View>
      )}

      {/* Kontakt */}
      <Section title={isOwner ? 'ŠETAČ' : 'VLASNIK'}>
        <Row label="Ime" value={`${other.first_name} ${other.last_name}`} />
        {other.phone ? (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${other.phone}`)}>
            <Row label="Telefon" value={other.phone} valueColor={GREEN} />
          </TouchableOpacity>
        ) : null}
        {other.address ? (
          <TouchableOpacity
            style={styles.addressCard}
            onPress={() => {
              let url: string
              if (other.lat && other.lng) {
                url = Platform.OS === 'android'
                  ? `geo:${other.lat},${other.lng}?q=${other.lat},${other.lng}`
                  : `https://maps.apple.com/?ll=${other.lat},${other.lng}`
              } else {
                url = Platform.OS === 'android'
                  ? `geo:0,0?q=${encodeURIComponent(other.address)}`
                  : `https://maps.apple.com/?q=${encodeURIComponent(other.address)}`
              }
              Linking.openURL(url).catch(() => {
                Linking.openURL(`https://www.google.com/maps?q=${encodeURIComponent(other.address)}`)
              })
            }}
          >
            <Text style={styles.addressIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Adresa</Text>
              <Text style={styles.addressValue}>{other.address}</Text>
            </View>
            <Text style={styles.addressOpen}>Otvori →</Text>
          </TouchableOpacity>
        ) : null}
      </Section>

      {/* Detalji usluge */}
      <Section title="DETALJI USLUGE">
        <Row label="Usluga" value={reservation.service_type === 'walking' ? '🦮 Šetanje' : '🏠 Čuvanje'} />
        {reservation.duration ? <Row label="Trajanje" value={`${reservation.duration} min`} /> : null}
        <Row label="Datum" value={dateStr} />
        <Row label="Vreme" value={timeStr} />
        {reservation.notes ? <Row label="Napomene" value={reservation.notes} /> : null}
      </Section>

      {/* Psi */}
      <Section title="PSI">
        {reservation.dogs.map(dog => (
          <TouchableOpacity key={dog.id} style={styles.dogCard}
            onPress={() => navigation.navigate('DogProfile', { dogId: dog.id })}
            activeOpacity={0.7}>
            <View style={styles.dogHeader}>
              <Text style={styles.dogName}>🐕 {dog.name}</Text>
              <Text style={styles.dogArrow}>→</Text>
            </View>
            <Text style={styles.dogBreed}>{dog.breed}</Text>
          </TouchableOpacity>
        ))}
      </Section>

      {/* Recenzija */}
      {isOwner && reservation.status === 'completed' && !reservation.has_review && (
        <Section title="OSTAVI RECENZIJU">
          <Text style={styles.reviewSub}>Oceni šetača {reservation.walker_info.first_name}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setReviewRating(star)} style={styles.starBtn}>
                <Text style={[styles.star, reviewRating >= star && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
            {reviewRating > 0 && <Text style={styles.ratingLabel}>{reviewRating}/5</Text>}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder="Komentar (opciono)..."
            placeholderTextColor="#9ca3af"
            value={reviewComment}
            onChangeText={setReviewComment}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.reviewBtn, submitReview.isPending && { opacity: 0.6 }]}
            onPress={handleReviewSubmit}
            disabled={submitReview.isPending}
          >
            {submitReview.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.reviewBtnText}>Pošalji recenziju</Text>
            }
          </TouchableOpacity>
        </Section>
      )}

      {isOwner && reservation.status === 'completed' && reservation.has_review && (
        <View style={styles.reviewDone}>
          <Text style={styles.reviewDoneText}>✓ Recenzija je poslata</Text>
        </View>
      )}

      {/* Akcije */}
      <View style={styles.actions}>

        {/* Owner cancel */}
        {isOwner && ['pending', 'confirmed'].includes(reservation.status) && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn, cancel.isPending && { opacity: 0.5 }]}
            onPress={confirmCancel}
            disabled={cancel.isPending}
          >
            <Text style={styles.cancelBtnText}>
              {cancel.isPending ? 'Otkazujem...' : '✕  Otkaži rezervaciju'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Walker: respond to pending */}
        {isWalker && reservation.status === 'pending' && (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn, { flex: 1 }, respond.isPending && { opacity: 0.5 }]}
              onPress={() => respond.mutate('confirmed')}
              disabled={respond.isPending}
            >
              <Text style={styles.actionBtnText}>✓  Potvrdi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, { flex: 1 }, respond.isPending && { opacity: 0.5 }]}
              onPress={() => respond.mutate('rejected')}
              disabled={respond.isPending}
            >
              <Text style={styles.actionBtnText}>✕  Odbij</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Walker: confirmed — start walk or waiting */}
        {isWalker && reservation.status === 'confirmed' && (
          canStart ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn, startWalkMut.isPending && { opacity: 0.5 }]}
              onPress={() => startWalkMut.mutate()}
              disabled={startWalkMut.isPending}
            >
              <Text style={styles.actionBtnText}>
                {startWalkMut.isPending ? 'Pokretanje...' : '🐾  Pokreni šetnju'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingBtn}>
              <Text style={styles.waitingBtnText}>
                🕐 Čeka početak ({start.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })})
              </Text>
            </View>
          )
        )}

        {/* Walker: in_progress — end walk */}
        {isWalker && reservation.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.completeBtn, complete.isPending && { opacity: 0.5 }]}
            onPress={() => {
              Alert.alert('Završi šetnju', 'Da li si siguran da si vratio/la psa vlasniku?', [
                { text: 'Ne', style: 'cancel' },
                { text: 'Da, završi', onPress: () => complete.mutate() },
              ])
            }}
            disabled={complete.isPending}
          >
            <Text style={styles.actionBtnText}>
              {complete.isPending ? 'Završavam...' : '🏁  Završi šetnju'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 16, paddingBottom: 52 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, marginBottom: 14,
  },
  statusIcon: { fontSize: 32 },
  statusLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 2 },
  statusValue: { fontSize: 18, fontWeight: '900' },
  upcomingBadge: {
    backgroundColor: GREEN + '20', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  upcomingBadgeText: { fontSize: 11, fontWeight: '800', color: GREEN },

  // Live tracking card (owner)
  liveCard: {
    backgroundColor: '#f0fdf9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: GREEN + '50',
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  liveCardTitle: { fontSize: 15, fontWeight: '800', color: '#065f46' },
  liveCardDuration: { fontSize: 12, fontWeight: '600', color: GREEN },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  map: {
    width: '100%',
    height: 200,
  },
  openMapsBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  openMapsBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  locatingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
  },
  locatingText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  // GPS active card (walker)
  gpsActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: GREEN + '40',
    gap: 12,
  },
  gpsActiveIcon: { fontSize: 22 },
  gpsActiveTitle: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  gpsActiveSubtitle: { fontSize: 12, color: GREEN, marginTop: 2 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', color: '#9ca3af',
    letterSpacing: 0.8, marginBottom: 6,
  },

  dogCard: {
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  dogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dogName: { fontSize: 15, fontWeight: '800', color: '#111' },
  dogArrow: { fontSize: 16, color: '#9ca3af' },
  dogBreed: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginTop: 2 },

  reviewSub: { fontSize: 14, color: '#374151', fontWeight: '600', marginBottom: 12 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  starBtn: { padding: 4 },
  star: { fontSize: 32, color: '#e5e7eb' },
  starActive: { color: GOLD },
  ratingLabel: { fontSize: 14, fontWeight: '800', color: GOLD, marginLeft: 6 },
  reviewInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: '#111', backgroundColor: '#fafafa',
    textAlignVertical: 'top', minHeight: 80, marginBottom: 14,
  },
  reviewBtn: {
    backgroundColor: GREEN, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  reviewBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  reviewDone: {
    backgroundColor: '#f0fdf9', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 12,
  },
  reviewDoneText: { color: '#065f46', fontWeight: '700', fontSize: 14 },

  actions: { gap: 10, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fecaca' },
  cancelBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 15 },
  confirmBtn: { backgroundColor: GREEN },
  rejectBtn: { backgroundColor: '#ef4444' },
  startBtn: { backgroundColor: GREEN },
  completeBtn: { backgroundColor: '#059669' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  waitingBtn: {
    backgroundColor: '#fafafa', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  waitingBtnText: { color: '#9ca3af', fontWeight: '700', fontSize: 14 },

  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginTop: 6, borderRadius: 12,
    borderWidth: 1, borderColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  addressIcon: { fontSize: 18 },
  addressLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', marginBottom: 2 },
  addressValue: { fontSize: 13, color: '#111', fontWeight: '600' },
  addressOpen: { fontSize: 12, fontWeight: '700', color: GREEN, flexShrink: 0 },
})
