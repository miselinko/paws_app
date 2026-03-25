import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator, TextInput, Linking, Platform,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { getReservations, cancelReservation, respondReservation, completeReservation } from '../api/reservations'
import { createReview } from '../api/reviews'
import { useAuth } from '../context/AuthContext'
import { ReservationsStackParamList } from '../navigation/ReservationsNavigator'

type Route = RouteProp<ReservationsStackParamList, 'ReservationDetail'>

const GREEN = '#00BF8F'
const GOLD  = '#FAAB43'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  pending:   { label: 'Na čekanju',  bg: '#fffbeb', color: '#b45309', icon: '⏳' },
  confirmed: { label: 'Potvrđeno',   bg: '#f0fdf9', color: '#065f46', icon: '✅' },
  rejected:  { label: 'Odbijeno',    bg: '#fef2f2', color: '#991b1b', icon: '❌' },
  completed: { label: 'Završeno',    bg: '#f9fafb', color: '#374151', icon: '🏁' },
  cancelled: { label: 'Otkazano',    bg: '#f9fafb', color: '#9ca3af', icon: '🚫' },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

export default function ReservationDetailScreen() {
  const route = useRoute<Route>()
  const navigation = useNavigation()
  const { reservationId } = route.params
  const { user } = useAuth()
  const qc = useQueryClient()

  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: getReservations,
  })

  const reservation = reservations.find(r => r.id === reservationId)

  const cancel = useMutation({
    mutationFn: () => cancelReservation(reservationId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservations'] }); navigation.goBack() },
    onError: () => Alert.alert('Greška', 'Nije moguće otkazati rezervaciju.'),
  })

  const respond = useMutation({
    mutationFn: (status: 'confirmed' | 'rejected') => respondReservation(reservationId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
    onError: () => Alert.alert('Greška', 'Pokušaj ponovo.'),
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

  const isOwner  = user?.role === 'owner'
  const isWalker = user?.role === 'walker'
  const cfg    = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.cancelled
  const start  = new Date(reservation.start_time)
  const end    = new Date(reservation.end_time)
  const other  = isOwner ? reservation.walker_info : reservation.owner_info
  const now    = new Date()
  const canComplete = isWalker && reservation.status === 'confirmed' && now >= start

  const dateStr = start.toLocaleDateString('sr-Latn', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })}`

  function confirmCancel() {
    Alert.alert('Otkaži rezervaciju', 'Da li si siguran?', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Da, otkaži', style: 'destructive', onPress: () => cancel.mutate() },
    ])
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
      </View>

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
        <Row
          label="Usluga"
          value={reservation.service_type === 'walking' ? '🦮 Šetanje' : '🏠 Čuvanje'}
        />
        {reservation.duration ? <Row label="Trajanje" value={`${reservation.duration} min`} /> : null}
        <Row label="Datum" value={dateStr} />
        <Row label="Vreme" value={timeStr} />
        {reservation.notes ? <Row label="Napomene" value={reservation.notes} /> : null}
      </Section>

      {/* Psi */}
      <Section title="PSI">
        {reservation.dogs.map(dog => (
          <View key={dog.id} style={styles.dogCard}>
            <View style={styles.dogHeader}>
              <Text style={styles.dogName}>🐕 {dog.name}</Text>
              <Text style={styles.dogBreed}>{dog.breed}</Text>
            </View>
            <View style={styles.dogMeta}>
              {dog.age ? <Text style={styles.dogTag}>{dog.age} god.</Text> : null}
              <Text style={styles.dogTag}>{DOG_SIZE[dog.size] ?? dog.size}</Text>
              {dog.weight ? <Text style={styles.dogTag}>{dog.weight} kg</Text> : null}
              <Text style={styles.dogTag}>{dog.gender === 'male' ? '♂ Mužjak' : '♀ Ženka'}</Text>
              {dog.neutered ? <Text style={[styles.dogTag, { backgroundColor: '#f0fdf9', color: '#065f46' }]}>Kastriran</Text> : null}
            </View>
            {dog.temperament ? <Text style={styles.dogNotes}>💬 {dog.temperament}</Text> : null}
            {dog.notes ? <Text style={styles.dogNotes}>📝 {dog.notes}</Text> : null}
          </View>
        ))}
      </Section>

      {/* Recenzija — samo za vlasnika na završenim bez recenzije */}
      {isOwner && reservation.status === 'completed' && !reservation.has_review && (
        <Section title="OSTAVI RECENZIJU">
          <Text style={styles.reviewSub}>Oceni šetača {reservation.walker_info.first_name}</Text>

          {/* Zvezdice */}
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

        {isWalker && reservation.status === 'confirmed' && (
          canComplete ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn, complete.isPending && { opacity: 0.5 }]}
              onPress={() => complete.mutate()}
              disabled={complete.isPending}
            >
              <Text style={styles.actionBtnText}>
                {complete.isPending ? 'Završavam...' : '🏁  Označi kao završeno'}
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
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  dogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  dogName: { fontSize: 15, fontWeight: '800', color: '#111' },
  dogBreed: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  dogMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  dogTag: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    backgroundColor: '#f3f4f6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  dogNotes: { fontSize: 12, color: '#6b7280', marginTop: 3 },

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
  completeBtn: { backgroundColor: GREEN },
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
