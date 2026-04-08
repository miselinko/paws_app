import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Pressable, StyleSheet,
  Image, ActivityIndicator, Modal, TextInput, ScrollView,
  Alert, Animated, Dimensions,
} from 'react-native'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigation, useScrollToTop } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { getWalkersPaginated, toggleFavorite } from '../api/users'
import { imgUrl } from '../api/config'
import { User } from '../types'
import { WalkersStackParamList } from '../navigation/WalkersNavigator'
import { useAuth } from '../context/AuthContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

type Nav = NativeStackNavigationProp<WalkersStackParamList, 'Walkers'>

const GREEN = '#00BF8F'
const GOLD  = '#FAAB43'
const SCREEN_W = Dimensions.get('window').width
const CARD_GAP = 12
const CARD_PADDING = 14
const CARD_W = (SCREEN_W - CARD_PADDING * 2 - CARD_GAP) / 2

const SERVICES: { val: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { val: '', label: 'Svi', icon: 'paw' },
  { val: 'walking', label: 'Šetanje', icon: 'footsteps-outline' },
  { val: 'boarding', label: 'Čuvanje', icon: 'home-outline' },
]

const MIN_RATINGS = [
  { val: '', label: 'Sve ocene' },
  { val: '3', label: '3+ zvezdice' },
  { val: '4', label: '4+ zvezdice' },
  { val: '4.5', label: '4.5+ zvezdice' },
]

const SORTS = [
  { val: 'rating', label: 'Najbolje ocenjeni' },
  { val: 'price_asc', label: 'Cena: niža prvo' },
  { val: 'price_desc', label: 'Cena: viša prvo' },
]

const AVATAR_COLORS = ['#00BF8F', '#6d28d9', '#2563eb', '#dc2626', '#d97706', '#0891b2']
const DAYS_SR = ['P', 'U', 'S', 'Č', 'P', 'S', 'N']

function initials(u: User) {
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()
}

// ─── Walker kartica (vertikalna kao na vebu) ─────────────────────────────────

function WalkerCard({ walker, onPress, onFavorite, isOwner }: {
  walker: User; onPress: () => void; onFavorite?: () => void; isOwner: boolean
}) {
  const wp = walker.walker_profile
  const photo = imgUrl(walker.profile_image)
  const scale = useRef(new Animated.Value(1)).current
  const color = AVATAR_COLORS[walker.id % AVATAR_COLORS.length]
  const isFeatured = !!wp?.is_featured

  const svcLabel = wp?.services === 'walking' ? 'Šetanje'
    : wp?.services === 'boarding' ? 'Čuvanje' : 'Šetanje & Čuvanje'
  const svcColor = wp?.services === 'walking' ? '#059669'
    : wp?.services === 'boarding' ? '#b45309' : GREEN

  const availability = wp?.availability ?? {}
  const hasAvailability = Object.keys(availability).length > 0

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 150, friction: 7 }).start()
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start()
  }

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale }] }]}>
      <Pressable
        style={[styles.card, isFeatured && styles.cardFeatured]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        {/* Image area */}
        <View style={styles.cardImageWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, { backgroundColor: color, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.cardInitials}>{initials(walker)}</Text>
            </View>
          )}

          {/* Featured badge */}
          {isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Preporučen</Text>
            </View>
          )}

          {/* Heart — only for owners */}
          {isOwner && (
            <TouchableOpacity
              onPress={() => onFavorite?.()}
              style={[styles.heartBtn, walker.is_favorited && styles.heartBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={walker.is_favorited ? 'heart' : 'heart-outline'} size={14} color={walker.is_favorited ? '#ef4444' : '#9ca3af'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Name + rating */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName} numberOfLines={1}>{walker.first_name} {walker.last_name}</Text>
            {walker.average_rating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name="star" size={11} color={GOLD} />
                <Text style={styles.cardRating}>{walker.average_rating.toFixed(1)}</Text>
              </View>
            ) : (
              <Text style={styles.cardNew}>Novo</Text>
            )}
          </View>

          {/* Location */}
          {walker.address ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 }}>
              <Ionicons name="location-outline" size={10} color="#9ca3af" />
              <Text style={styles.cardAddress} numberOfLines={1}>{walker.address}</Text>
            </View>
          ) : null}

          {/* Bio excerpt */}
          {wp?.bio ? (
            <Text style={styles.cardBio} numberOfLines={2}>{wp.bio}</Text>
          ) : null}

          {/* Availability dots */}
          {hasAvailability && (
            <View style={styles.availRow}>
              {DAYS_SR.map((d, i) => {
                const ds = availability[String(i)]
                const active = ds?.active ?? false
                return (
                  <View key={i} style={styles.availCol}>
                    <Text style={[styles.availDay, active && { color: '#059669' }]}>{d}</Text>
                    <View style={[styles.availDot, active && { backgroundColor: GREEN }]} />
                  </View>
                )
              })}
            </View>
          )}

          {/* Services + Price */}
          <View style={styles.cardBottom}>
            <View style={[styles.svcPill, { backgroundColor: svcColor + '16' }]}>
              <Text style={[styles.svcPillText, { color: svcColor }]}>
                {wp?.services === 'both' ? 'Sve' : svcLabel}
              </Text>
            </View>
            <View>
              {wp?.services !== 'boarding' && wp?.hourly_rate ? (
                <Text style={styles.cardPrice}>
                  {Number(wp.hourly_rate).toLocaleString()}
                  <Text style={styles.cardPriceUnit}> /h</Text>
                </Text>
              ) : null}
              {wp?.services !== 'walking' && wp?.daily_rate ? (
                <Text style={[styles.cardPrice, { color: GOLD }]}>
                  {Number(wp.daily_rate).toLocaleString()}
                  <Text style={styles.cardPriceUnit}> /dan</Text>
                </Text>
              ) : null}
            </View>
          </View>
        </View>
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
  const listRef = useRef<FlatList>(null)
  useScrollToTop(listRef)

  const [service, setService] = useState('')
  const [minRating, setMinRating] = useState('')
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

  const queryParams: Record<string, string> = {
    ...(service ? { usluga: service } : {}),
    ...(maxRate ? { cena_max: maxRate } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(sort && sort !== 'rating' ? { ordering: sort } : {}),
    ...(minRating ? { min_rating: minRating } : {}),
    ...(location ? { lat: location.lat, lng: location.lng, radius: '25' } : {}),
  }

  const {
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['walkers', queryParams],
    queryFn: ({ pageParam = 1 }) => getWalkersPaginated({ ...queryParams, page: String(pageParam) }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      try {
        const url = new URL(lastPage.next)
        return Number(url.searchParams.get('page')) || undefined
      } catch {
        const match = lastPage.next.match(/[?&]page=(\d+)/)
        return match ? Number(match[1]) : undefined
      }
    },
    initialPageParam: 1,
  })

  const allWalkers = useMemo(() => data?.pages.flatMap(p => p.results ?? p) ?? [], [data])
  const totalCount = data?.pages[0]?.count ?? allWalkers.length

  const filtered = showFavOnly ? allWalkers.filter((w: any) => w.is_favorited) : allWalkers
  const activeFilterCount = [minRating, maxRate, sort !== 'rating' ? sort : ''].filter(Boolean).length

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

  // Pair walkers into rows of 2 for grid
  const rows: User[][] = []
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2))
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
          <Text style={styles.heroGreeting}>{greeting()}{user?.first_name ? `, ${user.first_name}` : ''}</Text>
          <Text style={styles.heroTitle}>Pronađi šetača za svog psa</Text>
        </Animated.View>
      )}

      {/* ── Search bar ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Pretraži po imenu ili lokaciji..."
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="#9ca3af" />
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
              <Ionicons name={s.icon} size={14} color={service === s.val ? '#fff' : '#6b7280'} />
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
                  <Ionicons name="location-outline" size={14} color={location ? '#fff' : '#6b7280'} />
                  <Text style={[styles.chipText, location && styles.chipTextActive]}>
                    {location ? 'Blizu' : 'Blizu mene'}
                  </Text>
                  {location && <Ionicons name="close" size={12} color="#fff" />}
                </>
            }
          </TouchableOpacity>

          {/* Omiljeni - samo vlasnici */}
          {isOwner && (
            <TouchableOpacity
              style={[styles.chip, showFavOnly && styles.chipFav]}
              onPress={() => setShowFavOnly(v => !v)}
            >
              <Ionicons name={showFavOnly ? 'heart' : 'heart-outline'} size={14} color={showFavOnly ? '#fff' : '#6b7280'} />
              <Text style={[styles.chipText, showFavOnly && { color: '#fff' }]}>Omiljeni</Text>
            </TouchableOpacity>
          )}

          <View style={{ width: 58 }} />
        </ScrollView>

        {/* Filter dugme */}
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#374151'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Result count ── */}
      {!isLoading && (
        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>
            {filtered.length === 0 ? 'Nema rezultata' : `${totalCount} šetač${totalCount === 1 ? '' : 'a'}`}
          </Text>
        </View>
      )}

      {/* ── Lista (grid 2 kolone) ── */}
      {isLoading ? (
        <View style={styles.gridWrap}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.card, styles.cardOuter, { opacity: 0.55 }]}>
              <View style={[styles.cardImageWrap, { backgroundColor: '#e5e7eb' }]} />
              <View style={[styles.cardContent, { gap: 8 }]}>
                <View style={{ width: '70%', height: 12, borderRadius: 6, backgroundColor: '#e5e7eb' }} />
                <View style={{ width: '50%', height: 10, borderRadius: 5, backgroundColor: '#f3f4f6' }} />
                <View style={{ width: '40%', height: 10, borderRadius: 5, backgroundColor: '#f3f4f6' }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row, i) => i.toString()}
          contentContainerStyle={[styles.gridList, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item: row }) => (
            <View style={styles.gridRow}>
              {row.map((walker: User) => (
                <WalkerCard
                  key={walker.id}
                  walker={walker}
                  onPress={() => navigation.navigate('WalkerDetail', { walkerId: walker.id })}
                  onFavorite={() => favMutation.mutate(walker.id)}
                  isOwner={isOwner}
                />
              ))}
              {row.length === 1 && <View style={styles.cardOuter} />}
            </View>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={GREEN} />
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Učitavanje...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#e6f9f3', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
                <Ionicons name="search-outline" size={28} color={GREEN} />
              </View>
              <Text style={styles.emptyTitle}>Nema rezultata</Text>
              <Text style={styles.emptyText}>Pokušaj sa drugačijim filterima ili pretragom.</Text>
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
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filteri</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color="#374151" />
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

            <Text style={[styles.filterLabel, { marginTop: 28 }]}>MINIMALNA OCENA</Text>
            {MIN_RATINGS.map(s => (
              <TouchableOpacity
                key={s.val}
                style={[styles.filterRow, minRating === s.val && styles.filterRowActive]}
                onPress={() => setMinRating(s.val)}
              >
                <View style={[styles.radio, minRating === s.val && styles.radioActive]}>
                  {minRating === s.val && <View style={styles.radioDot} />}
                </View>
                {s.val ? <Ionicons name="star" size={14} color={GOLD} style={{ marginRight: -6 }} /> : null}
                <Text style={[styles.filterRowText, minRating === s.val && styles.filterRowTextActive]}>
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
                onPress={() => { setMinRating(''); setMaxRate(''); setSort('rating') }}>
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
  searchInput: { flex: 1, fontSize: 14, color: '#111', paddingVertical: 6 },

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
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  resultRow: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  resultCount: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.3 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#374151', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  // Grid
  gridList: { paddingHorizontal: CARD_PADDING, paddingTop: 8, paddingBottom: 28 },
  gridRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: CARD_PADDING, gap: CARD_GAP, paddingTop: 8 },

  // Card (vertical)
  cardOuter: { width: CARD_W },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  cardFeatured: {
    borderColor: GREEN,
    borderWidth: 1.5,
  },
  cardImageWrap: {
    height: 120, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  cardImage: { width: '100%', height: '100%' },
  cardInitials: { color: '#fff', fontSize: 28, fontWeight: '900', opacity: 0.9 },
  featuredBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: GOLD, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  featuredBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center',
    zIndex: 5,
  },
  heartBtnActive: { backgroundColor: 'rgba(239,68,68,0.12)' },

  // Card content
  cardContent: { padding: 10, flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardName: { fontSize: 13, fontWeight: '800', color: '#111', flex: 1, marginRight: 4 },
  cardRating: { fontSize: 11, color: GOLD, fontWeight: '700' },
  cardNew: { fontSize: 10, color: '#d1d5db', fontWeight: '600' },
  cardAddress: { fontSize: 10, color: '#9ca3af', fontWeight: '500', flex: 1 },
  cardBio: { fontSize: 10, color: '#6b7280', lineHeight: 14, marginBottom: 6 },

  // Availability
  availRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  availCol: { alignItems: 'center', gap: 1 },
  availDay: { fontSize: 8, fontWeight: '700', color: '#d1d5db' },
  availDot: { width: 16, height: 4, borderRadius: 2, backgroundColor: '#f3f4f6' },

  // Bottom
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f5f5f5', marginTop: 'auto',
  },
  svcPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  svcPillText: { fontSize: 9, fontWeight: '700' },
  cardPrice: { fontSize: 12, color: GREEN, fontWeight: '800' },
  cardPriceUnit: { fontSize: 9, fontWeight: '600', color: '#9ca3af' },

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
    marginTop: 32, backgroundColor: GREEN, borderRadius: 25,
    paddingVertical: 16, alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  clearBtn: {
    marginTop: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  clearBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 14 },
})
