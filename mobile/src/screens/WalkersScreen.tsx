import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Pressable, StyleSheet,
  Image, ActivityIndicator, Modal, TextInput, ScrollView,
  Alert, Animated,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Location from 'expo-location'
import { getWalkers, toggleFavorite } from '../api/users'
import { imgUrl } from '../api/config'
import { User } from '../types'
import { WalkersStackParamList } from '../navigation/WalkersNavigator'
import { useAuth } from '../context/AuthContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

type Nav = NativeStackNavigationProp<WalkersStackParamList, 'Walkers'>

const GREEN = '#00BF8F'
const GOLD  = '#FAAB43'

const SERVICES = [
  { val: '', label: 'Svi', icon: '🐾' },
  { val: 'walking', label: 'Šetanje', icon: '🦮' },
  { val: 'boarding', label: 'Čuvanje', icon: '🏠' },
]

const SIZES = [
  { val: '', label: 'Svi psi' },
  { val: 'small', label: 'Mali (do 10kg)' },
  { val: 'medium', label: 'Srednji (10–25kg)' },
  { val: 'large', label: 'Veliki (25kg+)' },
]

const SORTS = [
  { val: 'rating', label: '⭐ Ocena' },
  { val: 'price_asc', label: '↑ Cena: niža prvo' },
  { val: 'price_desc', label: '↓ Cena: viša prvo' },
]

const AVATAR_COLORS = ['#00BF8F', '#6d28d9', '#2563eb', '#dc2626', '#d97706', '#0891b2']

function sortWalkers(walkers: User[], sort: string): User[] {
  return [...walkers].sort((a, b) => {
    // Featured uvek idu prvi
    const featuredDiff = (b.walker_profile?.is_featured ? 1 : 0) - (a.walker_profile?.is_featured ? 1 : 0)
    if (featuredDiff !== 0) return featuredDiff
    const priceOf = (u: User) => u.walker_profile?.hourly_rate ?? 9999
    if (sort === 'rating') return (b.average_rating ?? 0) - (a.average_rating ?? 0)
    if (sort === 'price_asc') return priceOf(a) - priceOf(b)
    if (sort === 'price_desc') return priceOf(b) - priceOf(a)
    return 0
  })
}

function initials(u: User) {
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()
}

// ─── Stagger item wrapper ─────────────────────────────────────────────────────

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

// ─── Walker kartica ──────────────────────────────────────────────────────────

function WalkerCard({ walker, onPress, onFavorite, isLoggedIn }: { walker: User; onPress: () => void; onFavorite?: () => void; isLoggedIn: boolean }) {
  const wp = walker.walker_profile
  const photo = imgUrl(walker.profile_image)
  const scale = useRef(new Animated.Value(1)).current
  const color = AVATAR_COLORS[walker.id % AVATAR_COLORS.length]

  const svcLabel = wp?.services === 'walking' ? 'Šetanje'
    : wp?.services === 'boarding' ? 'Čuvanje' : 'Šetanje & Čuvanje'
  const svcColor = wp?.services === 'walking' ? '#059669'
    : wp?.services === 'boarding' ? '#b45309' : GREEN

  function pressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 150, friction: 7 }).start()
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start()
  }

  const isFeatured = !!wp?.is_featured

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[styles.card, isFeatured && styles.cardFeatured]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        {isFeatured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>⭐ Istaknuto</Text>
          </View>
        )}
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: color, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.avatarInitials}>{initials(walker)}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {walker.first_name} {walker.last_name}
          </Text>

          {walker.address ? (
            <Text style={styles.cardAddress} numberOfLines={1}>📍 {walker.address}</Text>
          ) : null}

          <View style={styles.cardRow}>
            {walker.average_rating ? (
              <Text style={styles.cardRating}>⭐ {walker.average_rating.toFixed(1)}</Text>
            ) : (
              <Text style={styles.cardNew}>Novo</Text>
            )}
            {walker.review_count > 0 && (
              <Text style={styles.cardReviews}>({walker.review_count})</Text>
            )}
            {wp?.services !== 'boarding' && wp?.hourly_rate ? (
              <>
                <Text style={styles.cardDot}>·</Text>
                <Text style={styles.cardPrice}>
                  {Number(wp.hourly_rate).toLocaleString()}
                  <Text style={styles.cardPriceUnit}> RSD/h</Text>
                </Text>
              </>
            ) : null}
            {wp?.services !== 'walking' && wp?.daily_rate ? (
              <>
                <Text style={styles.cardDot}>·</Text>
                <Text style={[styles.cardPrice, { color: GOLD }]}>
                  {Number(wp.daily_rate).toLocaleString()}
                  <Text style={styles.cardPriceUnit}> RSD/dan</Text>
                </Text>
              </>
            ) : null}
          </View>

          <View style={[styles.svcPill, { backgroundColor: svcColor + '16' }]}>
            <Text style={[styles.svcPillText, { color: svcColor }]}>{svcLabel}</Text>
          </View>
        </View>

        <Text style={styles.arrow}>›</Text>

        {/* Heart — absolute top-right so it doesn't push info */}
        {isLoggedIn && (
          <TouchableOpacity
            onPress={() => { onFavorite?.() }}
            style={[styles.heartBtn, walker.is_favorited && styles.heartBtnActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.heartText}>{walker.is_favorited ? '❤️' : '🖤'}</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    </Animated.View>
  )
}

// ─── Glavni ekran ─────────────────────────────────────────────────────────────

export default function WalkersScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const headerAnim = useRef(new Animated.Value(0)).current

  const [service, setService] = useState('')
  const [size, setSize] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [sort, setSort] = useState('rating')
  const [search, setSearch] = useState('')
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [location, setLocation] = useState<{ lat: string; lng: string } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)

  const favMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['walkers'] }),
  })

  const filters = {
    ...(service ? { usluga: service } : {}),
    ...(size ? { velicina: size } : {}),
    ...(maxRate ? { cena_max: maxRate } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(location ? { lat: location.lat, lng: location.lng, radius: '25' } : {}),
  }

  const { data: walkers = [], isLoading } = useQuery({
    queryKey: ['walkers', filters],
    queryFn: () => getWalkers(filters),
  })

  const filtered = showFavOnly ? walkers.filter((w: any) => w.is_favorited) : walkers
  const sorted = sortWalkers(filtered, sort)
  const activeFilterCount = [size, maxRate, sort !== 'rating' ? sort : ''].filter(Boolean).length

  const isOwner = user?.role === 'owner'
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: !isOwner })
  }, [isOwner, navigation])

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start()
  }, [])

  async function handleLocation() {
    if (location) { setLocation(null); return }
    setLocationLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Dozvola odbijena', 'Omogući pristup lokaciji.'); return }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setLocation({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() })
    } catch { Alert.alert('Greška', 'Nije moguće dobiti lokaciju.') }
    finally { setLocationLoading(false) }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Dobro jutro'
    if (h < 18) return 'Dobar dan'
    return 'Dobro veče'
  }

  return (
    <View style={styles.container}>
      {/* ── Hero header (samo za vlasnika) ── */}
      {isOwner && (
        <Animated.View style={[styles.hero, {
          paddingTop: insets.top + 14,
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        }]}>
          <Text style={styles.heroGreeting}>{greeting()}{user?.first_name ? `, ${user.first_name}` : ''} 👋</Text>
          <Text style={styles.heroTitle}>Pronađi šetača za svog psa</Text>
        </Animated.View>
      )}

      {/* ── Search bar ── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Pretraži šetače po imenu..."
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Service chips + lokacija + filter ── */}
      <View style={styles.filtersBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {SERVICES.map(s => (
            <TouchableOpacity
              key={s.val}
              style={[styles.chip, service === s.val && styles.chipActive]}
              onPress={() => setService(s.val)}
            >
              <Text style={styles.chipIcon}>{s.icon}</Text>
              <Text style={[styles.chipText, service === s.val && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Blizu mene */}
          <TouchableOpacity
            style={[styles.chip, location && styles.chipActive]}
            onPress={handleLocation}
            disabled={locationLoading}
          >
            {locationLoading
              ? <ActivityIndicator size="small" color={location ? '#fff' : '#6b7280'} />
              : <>
                  <Text style={styles.chipIcon}>📍</Text>
                  <Text style={[styles.chipText, location && styles.chipTextActive]}>
                    {location ? 'Blizu ✕' : 'Blizu'}
                  </Text>
                </>
            }
          </TouchableOpacity>

          {/* Omiljeni */}
          {user && (
            <TouchableOpacity
              style={[styles.chip, showFavOnly && styles.chipFav]}
              onPress={() => setShowFavOnly(v => !v)}
            >
              <Text style={styles.chipIcon}>{showFavOnly ? '❤️' : '🤍'}</Text>
              <Text style={[styles.chipText, showFavOnly && { color: '#fff' }]}>Omiljeni</Text>
            </TouchableOpacity>
          )}

          <View style={{ width: 58 }} />
        </ScrollView>

        {/* Apsolutno pozicionirano dugme filtera — ne ometa scrollovanje */}
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
        >
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: '#fff' }]}>
            ≡{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Result count ── */}
      {!isLoading && (
        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>
            {sorted.length === 0 ? 'Nema rezultata' : `${sorted.length} šetač${sorted.length === 1 ? '' : 'a'} pronađeno`}
          </Text>
        </View>
      )}

      {/* ── Lista ── */}
      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.card, { opacity: 0.55 }]}>
              <View style={[styles.avatar, { backgroundColor: '#e5e7eb' }]} />
              <View style={[styles.cardInfo, { gap: 8 }]}>
                <View style={{ width: '60%', height: 14, borderRadius: 6, backgroundColor: '#e5e7eb' }} />
                <View style={{ width: '80%', height: 10, borderRadius: 5, backgroundColor: '#f3f4f6' }} />
                <View style={{ width: '45%', height: 10, borderRadius: 5, backgroundColor: '#f3f4f6' }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={w => w.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <WalkerCard
                walker={item}
                onPress={() => navigation.navigate('WalkerDetail', { walkerId: item.id })}
                onFavorite={() => favMutation.mutate(item.id)}
                isLoggedIn={!!user}
              />
            </StaggerItem>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🐕</Text>
              <Text style={styles.emptyTitle}>Nema šetača</Text>
              <Text style={styles.emptyText}>Pokušaj sa drugačijim filterima</Text>
            </View>
          }
        />
      )}

      {/* ── Filter bottom sheet ── */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filteri</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.filterLabel}>SORTIRAJ PO</Text>
            {SORTS.map(s => (
              <TouchableOpacity
                key={s.val}
                style={[styles.filterRow, sort === s.val && styles.filterRowActive]}
                onPress={() => setSort(s.val)}
              >
                <View style={[styles.radio, sort === s.val && styles.radioActive]}>
                  {sort === s.val && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.filterRowText, sort === s.val && styles.filterRowTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterLabel, { marginTop: 28 }]}>VELIČINA PSA</Text>
            {SIZES.map(s => (
              <TouchableOpacity
                key={s.val}
                style={[styles.filterRow, size === s.val && styles.filterRowActive]}
                onPress={() => setSize(s.val)}
              >
                <View style={[styles.radio, size === s.val && styles.radioActive]}>
                  {size === s.val && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.filterRowText, size === s.val && styles.filterRowTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterLabel, { marginTop: 28 }]}>
              MAX CENA ({service === 'boarding' ? 'RSD/dan' : 'RSD/h'})
            </Text>
            <TextInput
              style={styles.priceInput}
              placeholder="npr. 2000"
              placeholderTextColor="#9ca3af"
              value={maxRate}
              onChangeText={setMaxRate}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterVisible(false)}>
              <Text style={styles.applyBtnText}>Primeni filtere</Text>
            </TouchableOpacity>

            {activeFilterCount > 0 && (
              <TouchableOpacity style={styles.clearBtn}
                onPress={() => { setSize(''); setMaxRate(''); setSort('rating') }}>
                <Text style={styles.clearBtnText}>Ukloni sve filtere</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

// ─── Stilovi ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },

  // Hero
  hero: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  heroGreeting: { fontSize: 14, fontWeight: '600', color: '#9ca3af', marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.5 },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111', paddingVertical: 6 },
  searchClear: { fontSize: 14, color: '#9ca3af', fontWeight: '700', padding: 4 },

  // Filters bar
  filtersBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  chipsRow: { paddingLeft: 12, paddingRight: 16, paddingVertical: 10, gap: 6, flexDirection: 'row' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 22,
    paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipFav: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipIcon: { fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  filterBtn: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#374151', borderColor: '#374151' },
  filterBtnText: { fontSize: 16, color: '#374151', fontWeight: '700' },

  resultRow: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  resultCount: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.3 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#374151', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  list: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 28, gap: 12 },

  // Kartica
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardFeatured: {
    backgroundColor: '#d6efe6',
    borderWidth: 1.5, borderColor: '#00BF8F',
  },
  featuredBadge: {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: '#00BF8F', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  featuredBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  avatarWrap: { marginRight: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarInitials: { color: '#fff', fontSize: 24, fontWeight: '900' },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 17, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  cardAddress: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardRating: { fontSize: 13, color: GOLD, fontWeight: '700' },
  cardReviews: { fontSize: 12, color: '#9ca3af' },
  cardNew: { fontSize: 12, color: '#d1d5db', fontWeight: '600' },
  cardDot: { fontSize: 13, color: '#d1d5db' },
  cardPrice: { fontSize: 14, color: GREEN, fontWeight: '800' },
  cardPriceUnit: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  svcPill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' },
  svcPillText: { fontSize: 11, fontWeight: '700' },
  heartBtn: {
    position: 'absolute', bottom: 10, right: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
    zIndex: 5,
  },
  heartBtnActive: { backgroundColor: 'rgba(239,68,68,0.12)' },
  heartText: { fontSize: 15 },
  arrow: { fontSize: 24, color: '#d1d5db', marginLeft: 6 },

  // Bottom sheet
  sheet: { flex: 1, backgroundColor: '#fff' },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#e5e7eb',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 13, color: '#374151', fontWeight: '700' },
  sheetContent: { padding: 20, paddingBottom: 52 },
  filterLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 10 },
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, gap: 14,
  },
  filterRowActive: { backgroundColor: '#f0fdf9' },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: GREEN },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: GREEN },
  filterRowText: { fontSize: 15, color: '#374151', fontWeight: '500', flex: 1 },
  filterRowTextActive: { color: '#065f46', fontWeight: '700' },
  priceInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#111',
    backgroundColor: '#fafafa',
  },
  applyBtn: {
    marginTop: 32, backgroundColor: GREEN, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  clearBtn: {
    marginTop: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  clearBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 14 },
})
