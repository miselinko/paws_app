import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigation, useScrollToTop } from '@react-navigation/native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getReservations } from '../api/reservations'
import { useAuth } from '../context/AuthContext'
import { Reservation } from '../types'
import { ReservationsStackParamList } from '../navigation/ReservationsNavigator'

type Nav = NativeStackNavigationProp<ReservationsStackParamList, 'Reservations'>

const GREEN = '#00BF8F'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:   { label: 'Na čekanju', bg: '#fffbeb', color: '#b45309', border: '#f59e0b' },
  confirmed: { label: 'Potvrđeno',  bg: '#f0fdf9', color: '#065f46', border: GREEN },
  rejected:  { label: 'Odbijeno',   bg: '#fef2f2', color: '#991b1b', border: '#f87171' },
  completed: { label: 'Završeno',   bg: '#f9fafb', color: '#374151', border: '#d1d5db' },
  cancelled: { label: 'Otkazano',   bg: '#f9fafb', color: '#9ca3af', border: '#e5e7eb' },
}

const FILTERS = [
  { val: 'sve', label: 'Sve' },
  { val: 'pending', label: 'Čekanje' },
  { val: 'confirmed', label: 'Potvrđeno' },
  { val: 'completed', label: 'Završeno' },
  { val: 'cancelled', label: 'Otkazano' },
]

// ─── Kartica rezervacije ──────────────────────────────────────────────────────

function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      delay: Math.min(index * 35, 200),
      tension: 100,
      friction: 10,
    }).start()
  }, [index, anim])
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    }}>
      {children}
    </Animated.View>
  )
}

function ReservationCard({ reservation, role, onPress }: {
  reservation: Reservation
  role: string
  onPress: () => void
}) {
  const scale = useRef(new Animated.Value(1)).current
  const cfg = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.cancelled
  const other = role === 'owner' ? reservation.walker_info : reservation.owner_info
  const start = new Date(reservation.start_time)
  const dateStr = start.toLocaleDateString('sr-Latn', { day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = start.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 120, friction: 6 }).start()
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 5 }).start()
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: cfg.border }]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.cardName}>{other.first_name} {other.last_name}</Text>
            <Text style={styles.cardSub}>
              {reservation.service_type === 'walking' ? 'Šetanje' : 'Čuvanje'}
              {' · '}
              {reservation.dogs.map(d => d.name).join(', ')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardDate}>{dateStr}</Text>
          <Text style={styles.cardTime}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Glavni ekran ─────────────────────────────────────────────────────────────

export default function ReservationsScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const [filter, setFilter] = useState<string>('sve')
  const fadeAnim = useRef(new Animated.Value(0)).current
  const listRef = useRef<FlatList>(null)
  useScrollToTop(listRef)

  const tabBarHeight = useBottomTabBarHeight()
  const { data: reservations = [], isLoading, refetch } = useQuery({
    queryKey: ['reservations'],
    queryFn: getReservations,
    refetchInterval: 10000,
  })

  const filtered = filter === 'sve'
    ? reservations
    : reservations.filter(r => r.status === filter)

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start()
  }, [])

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /></View>
  }

  const pendingCount = reservations.filter(r => r.status === 'pending').length
  const upcomingCount = reservations.filter(r => r.status === 'confirmed' && new Date(r.start_time) > new Date()).length

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header sa brojevima */}
      {(pendingCount > 0 || upcomingCount > 0) && (
        <View style={styles.summaryBar}>
          {pendingCount > 0 && (
            <View style={[styles.summaryChip, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}>
              <Text style={[styles.summaryChipText, { color: '#b45309' }]}>
                {pendingCount} čeka odgovor
              </Text>
            </View>
          )}
          {upcomingCount > 0 && (
            <View style={[styles.summaryChip, { backgroundColor: '#f0fdf9', borderColor: GREEN }]}>
              <Text style={[styles.summaryChipText, { color: '#065f46' }]}>
                {upcomingCount} nadolaz.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Filter tabovi — jednaka širina, bez skrolovanja */}
      <View style={styles.filterBarWrap}>
        {FILTERS.map(f => {
          const count = f.val === 'sve'
            ? reservations.length
            : reservations.filter(r => r.status === f.val).length
          const active = filter === f.val
          return (
            <TouchableOpacity
              key={f.val}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
              onPress={() => setFilter(f.val)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && { color: '#fff' }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Lista */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={r => r.id.toString()}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 8 }]}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <ReservationCard
              reservation={item}
              role={user?.role ?? 'owner'}
              onPress={() => navigation.navigate('ReservationDetail', { reservationId: item.id })}
            />
          </StaggerItem>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={52} color="#d1d5db" style={{ marginBottom: 14 }} />
            <Text style={styles.emptyTitle}>Nema rezervacija</Text>
            <Text style={styles.emptyText}>
              {filter === 'sve' ? 'Još uvek nemaš rezervacija.' : `Nema rezervacija sa statusom "${FILTERS.find(f => f.val === filter)?.label}".`}
            </Text>
          </View>
        }
      />
    </Animated.View>
  )
}

// ─── Stilovi ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  summaryBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  summaryChipText: { fontSize: 12, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  filterBarWrap: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 11,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  filterBtnActive: { borderBottomColor: GREEN },
  filterText: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  filterTextActive: { color: GREEN, fontWeight: '800' },
  filterCount: {
    minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
  },
  filterCountActive: { backgroundColor: GREEN },
  filterCountText: { fontSize: 8, fontWeight: '800', color: '#6b7280' },

  list: { padding: 14, gap: 12, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTopLeft: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 3 },
  cardSub: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  cardTime: { fontSize: 13, fontWeight: '700', color: '#374151' },
})
