import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, TextInput, Switch, Modal, FlatList, Alert, Animated, Platform,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getProfile, updateMyProfile, updateWalkerProfile,
  uploadProfileImage, deleteProfileImage, deleteAccount,
} from '../api/users'
import { getWalkerReviews } from '../api/reviews'
import { imgUrl } from '../api/config'
import { useAuth } from '../context/AuthContext'
import { User, DaySchedule, Review } from '../types'

const GREEN = '#00BF8F'
const GOLD  = '#FAAB43'
const DAYS  = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
const PHOTON_URL = 'https://photon.komoot.io/api/'
const SERBIA_BBOX = '18.8,42.2,23.0,46.2'

const SCHED_TIMES = Array.from({ length: 30 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: { name?: string; street?: string; housenumber?: string; city?: string; county?: string; state?: string; country?: string }
}
function fmtAddr(p: PhotonFeature['properties']): string {
  const street = p.street ? (p.housenumber ? `${p.street} ${p.housenumber}` : p.street) : p.name ?? ''
  return [street, p.city || p.county].filter(Boolean).join(', ')
}

const defaultAvailability = (): Record<string, DaySchedule> =>
  Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), { active: false, from: '08:00', to: '20:00' }]))

const SVC_OPTIONS = [
  { val: 'walking' as const, icon: '🦮', label: 'Šetanje' },
  { val: 'boarding' as const, icon: '🏠', label: 'Čuvanje' },
  { val: 'both' as const, icon: '🐾', label: 'Sve' },
]

// ─── Address autocomplete ────────────────────────────────────────────────────

function AdresaInput({ value, onChange }: {
  value: string
  onChange: (addr: string, lat?: number, lng?: number) => void
}) {
  const [results, setResults] = useState<PhotonFeature[]>([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abort = useRef<AbortController | null>(null)

  function search(q: string) {
    onChange(q)
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 3) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      if (abort.current) abort.current.abort()
      abort.current = new AbortController()
      setLoading(true)
      try {
        const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=8&lang=sr&bbox=${SERBIA_BBOX}`
        const res = await fetch(url, { signal: abort.current.signal })
        const data: { features: PhotonFeature[] } = await res.json()
        const all = data.features || []
        const sr = all.filter(f => f.properties.country === 'Serbia')
        setResults((sr.length > 0 ? sr : all).slice(0, 5))
      } catch { /* ignore */ } finally { setLoading(false) }
    }, 450)
  }

  function select(f: PhotonFeature) {
    const [lng, lat] = f.geometry.coordinates
    onChange(fmtAddr(f.properties), lat, lng)
    setResults([])
  }

  return (
    <View>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={search}
          placeholder="npr. Bulevar Oslobođenja 12, Novi Sad"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={GREEN} style={{ position: 'absolute', right: 12, top: 14 }} />}
      </View>
      {results.length > 0 && (
        <View style={s.addrDropdown}>
          {results.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[s.addrItem, i < results.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }]}
              onPress={() => select(f)}
            >
              <Text style={s.addrItemMain}>📍 {fmtAddr(f.properties)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ title, sub, onEdit, children }: {
  title: string; sub?: string; onEdit?: () => void; children: React.ReactNode
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View>
          <Text style={s.cardTitle}>{title}</Text>
          {sub ? <Text style={s.cardSub}>{sub}</Text> : null}
        </View>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={s.editBtn}>
            <Text style={s.editBtnText}>✏️ Izmeni</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  )
}

// ─── Glavni ekran ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { logout } = useAuth()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [saved, setSaved] = useState(false)
  const [editingBasic, setEditingBasic] = useState(false)
  const [editingWalker, setEditingWalker] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [timePicker, setTimePicker] = useState<{ dayIdx: number; field: 'from' | 'to' } | null>(null)

  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', address: '', lat: null as number | null, lng: null as number | null })
  const [walkerForm, setWalkerForm] = useState({
    hourly_rate: '' as string | number,
    daily_rate: '' as string | number,
    services: 'both' as 'walking' | 'boarding' | 'both',
    bio: '',
    active: true,
    availability: defaultAvailability() as Record<string, DaySchedule>,
  })

  const { data: profile, isLoading } = useQuery<User>({ queryKey: ['profile'], queryFn: getProfile })

  const { data: myReviews = [] } = useQuery<Review[]>({
    queryKey: ['my-reviews', profile?.id],
    queryFn: () => getWalkerReviews(profile!.id),
    enabled: !!profile && profile.role === 'walker',
  })

  useEffect(() => {
    if (!profile) return
    setForm({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone ?? '', address: profile.address ?? '', lat: profile.lat, lng: profile.lng })
    if (profile.walker_profile) {
      const wp = profile.walker_profile
      const a = wp.availability
      setWalkerForm({
        hourly_rate: wp.hourly_rate === 0 ? '' : (wp.hourly_rate ?? ''),
        daily_rate: wp.daily_rate ?? '',
        services: wp.services,
        bio: wp.bio ?? '',
        active: wp.active,
        availability: (a && Object.keys(a).length > 0) ? a : defaultAvailability(),
      })
    }
  }, [profile])

  function flash(closeBasic?: boolean, closeWalker?: boolean) {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    if (closeBasic) setEditingBasic(false)
    if (closeWalker) setEditingWalker(false)
  }

  const updateM = useMutation({
    mutationFn: () => updateMyProfile(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash(true) },
    onError: () => Alert.alert('Greška', 'Nije moguće sačuvati izmene.'),
  })

  const updateWalkerM = useMutation({
    mutationFn: () => updateWalkerProfile({
      ...walkerForm,
      hourly_rate: Number(walkerForm.hourly_rate) || 0,
      daily_rate: walkerForm.daily_rate !== '' ? Number(walkerForm.daily_rate) : null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash(false, true) },
    onError: () => Alert.alert('Greška', 'Nije moguće sačuvati izmene.'),
  })

  const toggleActiveM = useMutation({
    mutationFn: (active: boolean) => updateWalkerProfile({ active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })

  const imageM = useMutation({
    mutationFn: ({ uri, fileName, mimeType }: { uri: string; fileName?: string | null; mimeType?: string | null }) =>
      uploadProfileImage(uri, fileName, mimeType),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash() },
    onError: () => Alert.alert('Greška', 'Nije moguće uploadovati sliku.'),
  })

  const deleteImageM = useMutation({
    mutationFn: deleteProfileImage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })

  const deleteAccountM = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => logout(),
  })

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Dozvola odbijena', 'Omogući pristup galeriji u podešavanjima telefona.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: Platform.OS === 'ios',
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const { uri, fileName, mimeType } = result.assets[0]
      imageM.mutate({ uri, fileName, mimeType })
    }
  }

  function updateDaySchedule(idx: number, patch: Partial<DaySchedule>) {
    setWalkerForm(f => ({ ...f, availability: { ...f.availability, [String(idx)]: { ...f.availability[String(idx)], ...patch } } }))
  }

  function applyPreset(from: string, to: string) {
    const newAvail: Record<string, DaySchedule> = {}
    for (let i = 0; i < 7; i++) newAvail[String(i)] = { active: true, from, to }
    setWalkerForm(f => ({ ...f, availability: newAvail }))
  }

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    }
  }, [isLoading])

  if (isLoading || !profile) {
    return <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  }

  const photo = imgUrl(profile.profile_image)
  const wp = profile.walker_profile

  const roleBadge = profile.role === 'owner'
    ? { label: '🏠 Vlasnik psa', bg: '#dbeafe', color: '#1e40af' }
    : wp?.services === 'boarding'
    ? { label: '🏠 Čuvar', bg: '#fef3c7', color: '#92400e' }
    : wp?.services === 'walking'
    ? { label: '🦮 Šetač', bg: '#d1fae5', color: '#065f46' }
    : { label: '🐾 Šetač & Čuvar', bg: '#d1fae5', color: '#065f46' }

  // Get availability for time picker
  const tpDay = timePicker ? walkerForm.availability[String(timePicker.dayIdx)] : null

  return (
    <Animated.ScrollView style={[s.container, { opacity: fadeAnim }]} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      {/* ── Hero ── */}
      <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
        {/* Avatar */}
        <View style={s.avatarWrap}>
          {photo
            ? <Image source={{ uri: photo }} style={s.avatar} />
            : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitials}>{profile.first_name[0]}{profile.last_name[0]}</Text>
              </View>
            )
          }
          {/* Edit photo button */}
          <TouchableOpacity style={s.avatarEditBtn} onPress={pickImage} disabled={imageM.isPending}>
            {imageM.isPending
              ? <ActivityIndicator size="small" color="#555" />
              : <Text style={{ fontSize: 15 }}>📷</Text>}
          </TouchableOpacity>
          {/* Delete photo button */}
          {profile.profile_image && (
            <TouchableOpacity
              style={[s.avatarEditBtn, s.avatarDeleteBtn]}
              onPress={() => Alert.alert('Ukloni sliku?', '', [
                { text: 'Otkaži', style: 'cancel' },
                { text: 'Ukloni', style: 'destructive', onPress: () => deleteImageM.mutate() },
              ])}
              disabled={deleteImageM.isPending}
            >
              {deleteImageM.isPending
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Text style={{ fontSize: 13 }}>🗑</Text>}
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.heroName}>{profile.first_name} {profile.last_name}</Text>
        <Text style={s.heroEmail}>{profile.email}</Text>
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: roleBadge.bg }]}>
            <Text style={[s.badgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
          </View>
          {wp && (
            <View style={[s.badge, wp.active ? { backgroundColor: '#d1fae5' } : { backgroundColor: '#f3f4f6' }]}>
              <Text style={[s.badgeText, { color: wp.active ? '#065f46' : '#6b7280' }]}>
                {wp.active ? '● Aktivan' : '○ Neaktivan'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Flash ── */}
      {saved && (
        <View style={s.flashBox}>
          <Text style={s.flashText}>✓ Izmene sačuvane</Text>
        </View>
      )}

      {/* ── Osnovni podaci ── */}
      <SectionCard
        title="Osnovni podaci"
        onEdit={!editingBasic ? () => setEditingBasic(true) : undefined}
      >
        {!editingBasic ? (
          <View style={s.cardBody}>
            {[
              { label: 'Ime', value: profile.first_name },
              { label: 'Prezime', value: profile.last_name },
              { label: 'Telefon', value: profile.phone || null },
              { label: 'Adresa', value: profile.address || null },
            ].map(({ label, value }) => (
              <View key={label} style={s.infoRow}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value ?? <Text style={s.infoEmpty}>Nije unet</Text>}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.cardBody}>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>IME</Text>
                <TextInput style={s.input} value={form.first_name} onChangeText={v => setForm({ ...form, first_name: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>PREZIME</Text>
                <TextInput style={s.input} value={form.last_name} onChangeText={v => setForm({ ...form, last_name: v })} />
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>TELEFON</Text>
              <TextInput style={s.input} value={form.phone} onChangeText={v => setForm({ ...form, phone: v })}
                placeholder="+381 63 123 4567" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>ADRESA</Text>
              <AdresaInput
                value={form.address}
                onChange={(addr, lat, lng) => setForm(f => ({ ...f, address: addr, lat: lat ?? f.lat, lng: lng ?? f.lng }))}
              />
              {form.lat && form.lng && <Text style={s.coordsOk}>✓ Lokacija potvrđena</Text>}
            </View>
            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => {
                setEditingBasic(false)
                setForm({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone ?? '', address: profile.address ?? '', lat: profile.lat, lng: profile.lng })
              }}>
                <Text style={s.cancelBtnText}>Otkaži</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, updateM.isPending && { opacity: 0.5 }]}
                onPress={() => updateM.mutate()} disabled={updateM.isPending}>
                <Text style={s.saveBtnText}>{updateM.isPending ? 'Čuvanje...' : 'Sačuvaj'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SectionCard>

      {/* ── Walker profil ── */}
      {profile.role === 'walker' && wp && (
        <SectionCard
          title="🦮 Profil šetača"
          sub="Vidljivo vlasnicima pasa"
          onEdit={!editingWalker ? () => setEditingWalker(true) : undefined}
        >
          {!editingWalker ? (
            <View style={s.cardBody}>
              {/* Active toggle */}
              <View style={[s.activeRow, wp.active ? s.activeRowOn : s.activeRowOff]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.activeTitle, { color: wp.active ? '#059669' : '#6b7280' }]}>
                    {wp.active ? '● Profil je aktivan' : '○ Profil je deaktiviran'}
                  </Text>
                  <Text style={s.activeSub}>
                    {wp.active ? 'Vidljiv si vlasnicima pasa' : 'Nisi vidljiv u pretrazi'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.toggleActiveBtn, wp.active ? s.toggleActiveBtnOff : s.toggleActiveBtnOn]}
                  onPress={() => toggleActiveM.mutate(!wp.active)}
                  disabled={toggleActiveM.isPending}
                >
                  <Text style={[s.toggleActiveBtnText, !wp.active && { color: GREEN }]}>
                    {toggleActiveM.isPending ? '...' : wp.active ? 'Deaktiviraj' : 'Aktiviraj'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cene */}
              <View style={s.row2}>
                {(wp.services === 'walking' || wp.services === 'both') && Number(wp.hourly_rate) > 0 && (
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Cena po satu</Text>
                    <Text style={[s.priceVal, { color: GREEN }]}>{Number(wp.hourly_rate).toLocaleString()} <Text style={s.priceUnit}>RSD</Text></Text>
                  </View>
                )}
                {(wp.services === 'boarding' || wp.services === 'both') && Number(wp.daily_rate) > 0 && (
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Cena po danu</Text>
                    <Text style={[s.priceVal, { color: GOLD }]}>{Number(wp.daily_rate).toLocaleString()} <Text style={s.priceUnit}>RSD</Text></Text>
                  </View>
                )}
              </View>

              {/* Usluge */}
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Usluge</Text>
                <Text style={s.infoValue}>
                  {wp.services === 'walking' ? '🦮 Šetanje' : wp.services === 'boarding' ? '🏠 Čuvanje' : '🐾 Sve usluge'}
                </Text>
              </View>

              {/* Bio */}
              {wp.bio ? (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>O meni</Text>
                  <Text style={[s.infoValue, { lineHeight: 20 }]}>{wp.bio}</Text>
                </View>
              ) : null}

              {/* Dostupnost grid */}
              {walkerForm.availability && (
                <View>
                  <Text style={[s.infoLabel, { marginBottom: 8 }]}>Dostupnost</Text>
                  <View style={s.availGrid}>
                    {DAYS.map((day, idx) => {
                      const sch = walkerForm.availability[String(idx)]
                      const active = sch?.active ?? false
                      return (
                        <View key={idx} style={{ alignItems: 'center', gap: 3 }}>
                          <View style={[s.dayBadge, active ? s.dayBadgeActive : s.dayBadgeInactive]}>
                            <Text style={[s.dayBadgeText, { color: active ? '#fff' : '#d1d5db' }]}>{day}</Text>
                          </View>
                          {active
                            ? <Text style={s.dayTime}>{sch.from.slice(0, 5)}{'\n'}-{sch.to.slice(0, 5)}</Text>
                            : <Text style={[s.dayTime, { color: '#e5e7eb' }]}>—</Text>}
                        </View>
                      )
                    })}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={s.cardBody}>
              {/* Active switch */}
              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>Aktivan profil</Text>
                  <Text style={s.switchSub}>Kada je isključeno, nisi vidljiv vlasnicima</Text>
                </View>
                <Switch
                  value={walkerForm.active}
                  onValueChange={v => setWalkerForm({ ...walkerForm, active: v })}
                  trackColor={{ true: GREEN, false: '#d1d5db' }}
                />
              </View>

              {/* Usluge */}
              <View style={s.fieldWrap}>
                <Text style={s.label}>USLUGE</Text>
                <View style={s.svcRow}>
                  {SVC_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt.val}
                      style={[s.svcBtn, walkerForm.services === opt.val && s.svcBtnActive]}
                      onPress={() => setWalkerForm({ ...walkerForm, services: opt.val })}>
                      <Text style={{ fontSize: 20 }}>{opt.icon}</Text>
                      <Text style={[s.svcBtnText, walkerForm.services === opt.val && { color: '#059669' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cene */}
              {(walkerForm.services === 'walking' || walkerForm.services === 'both') && (
                <View style={s.fieldWrap}>
                  <Text style={s.label}>CENA PO SATU / ŠETANJE (RSD)</Text>
                  <TextInput style={s.input} value={String(walkerForm.hourly_rate)}
                    onChangeText={v => setWalkerForm({ ...walkerForm, hourly_rate: v })}
                    placeholder="npr. 1500" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                </View>
              )}
              {(walkerForm.services === 'boarding' || walkerForm.services === 'both') && (
                <View style={s.fieldWrap}>
                  <Text style={s.label}>CENA PO DANU / ČUVANJE (RSD)</Text>
                  <TextInput style={s.input} value={String(walkerForm.daily_rate)}
                    onChangeText={v => setWalkerForm({ ...walkerForm, daily_rate: v })}
                    placeholder="npr. 2000" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                </View>
              )}

              {/* Bio */}
              <View style={s.fieldWrap}>
                <Text style={s.label}>O MENI</Text>
                <TextInput style={[s.input, s.textarea]} value={walkerForm.bio}
                  onChangeText={v => setWalkerForm({ ...walkerForm, bio: v })}
                  placeholder="Kratko se predstavi, iskustvo sa psima..." placeholderTextColor="#9ca3af"
                  multiline numberOfLines={4} />
              </View>

              {/* Raspored */}
              <View style={s.fieldWrap}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={s.label}>RASPORED</Text>
                  <TouchableOpacity onPress={() => setWalkerForm(f => ({ ...f, availability: defaultAvailability() }))}>
                    <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>Resetuj</Text>
                  </TouchableOpacity>
                </View>

                {/* Presets */}
                <View style={s.presetsRow}>
                  <Text style={s.presetLabel}>Primeni na sve:</Text>
                  {[{ l: '08–20h', f: '08:00', t: '20:00' }, { l: '09–17h', f: '09:00', t: '17:00' }, { l: '07–22h', f: '07:00', t: '21:30' }].map(p => (
                    <TouchableOpacity key={p.l} style={s.presetBtn} onPress={() => applyPreset(p.f, p.t)}>
                      <Text style={s.presetBtnText}>{p.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Day rows */}
                {DAYS.map((day, idx) => {
                  const key = String(idx)
                  const sch = walkerForm.availability[key] ?? { active: true, from: '08:00', to: '20:00' }
                  return (
                    <View key={key} style={[s.dayRow, sch.active ? s.dayRowActive : s.dayRowInactive]}>
                      <Text style={[s.dayRowName, { color: sch.active ? '#059669' : '#9ca3af' }]}>{day}</Text>
                      <Switch
                        value={sch.active}
                        onValueChange={v => updateDaySchedule(idx, { active: v })}
                        trackColor={{ true: GREEN, false: '#d1d5db' }}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                      {sch.active ? (
                        <>
                          <TouchableOpacity style={s.timeBtn} onPress={() => setTimePicker({ dayIdx: idx, field: 'from' })}>
                            <Text style={s.timeBtnText}>{sch.from}</Text>
                          </TouchableOpacity>
                          <Text style={{ color: '#9ca3af', fontSize: 12 }}>—</Text>
                          <TouchableOpacity style={s.timeBtn} onPress={() => setTimePicker({ dayIdx: idx, field: 'to' })}>
                            <Text style={s.timeBtnText}>{sch.to}</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={s.dayUnavail}>Nije dostupan</Text>
                      )}
                    </View>
                  )
                })}
              </View>

              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingWalker(false)}>
                  <Text style={s.cancelBtnText}>Otkaži</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, updateWalkerM.isPending && { opacity: 0.5 }]}
                  onPress={() => updateWalkerM.mutate()} disabled={updateWalkerM.isPending}>
                  <Text style={s.saveBtnText}>{updateWalkerM.isPending ? 'Čuvanje...' : 'Sačuvaj'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SectionCard>
      )}

      {/* ── Recenzije šetača ── */}
      {profile.role === 'walker' && (
        <SectionCard
          title={`⭐ Recenzije (${myReviews.length})`}
          sub={myReviews.length > 0 ? `Prosek: ${(myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1)} / 5` : undefined}
        >
          <View style={s.cardBody}>
            {myReviews.length === 0 ? (
              <Text style={s.emptyReviews}>Još nema recenzija.</Text>
            ) : (
              myReviews.map(r => (
                <View key={r.id} style={s.reviewItem}>
                  <View style={s.reviewHeader}>
                    <View style={s.reviewAvatar}>
                      <Text style={s.reviewAvatarText}>{r.owner_name?.split(' ').map((n: string) => n[0]).join('') || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reviewerName}>{r.owner_name}</Text>
                      <Text style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    </View>
                    <Text style={s.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                  </View>
                  {r.comment ? <Text style={s.reviewComment}>{r.comment}</Text> : null}
                </View>
              ))
            )}
          </View>
        </SectionCard>
      )}

      {/* ── Upravljanje nalogom ── */}
      <SectionCard title="Upravljanje nalogom">
        <View style={s.cardBody}>
          {/* Odjavi se */}
          <TouchableOpacity style={s.logoutBtn} onPress={() => Alert.alert('Odjavi se?', '', [
            { text: 'Otkaži', style: 'cancel' },
            { text: 'Odjavi se', onPress: logout },
          ])}>
            <Text style={s.logoutBtnText}>Odjavi se</Text>
          </TouchableOpacity>

          {/* Obriši nalog */}
          {!deleteConfirm ? (
            <TouchableOpacity style={s.deleteBtn} onPress={() => setDeleteConfirm(true)}>
              <Text style={s.deleteBtnText}>🗑 Obriši nalog</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.deleteConfirm}>
              <Text style={s.deleteConfirmTitle}>Sigurno želiš da obrišeš nalog?</Text>
              <Text style={s.deleteConfirmSub}>Ova akcija je trajna. Svi podaci, rezervacije i poruke će biti obrisani.</Text>
              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setDeleteConfirm(false)}>
                  <Text style={s.cancelBtnText}>Otkaži</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dangerBtn, deleteAccountM.isPending && { opacity: 0.5 }]}
                  onPress={() => deleteAccountM.mutate()} disabled={deleteAccountM.isPending}>
                  <Text style={s.dangerBtnText}>{deleteAccountM.isPending ? 'Brišem...' : 'Da, obriši'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SectionCard>

      {/* ── Time Picker Modal ── */}
      <Modal visible={timePicker !== null} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setTimePicker(null)}>
        <View style={s.modal}>
          <View style={s.sheetHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {timePicker?.field === 'from' ? 'Početak' : 'Kraj'} — {timePicker !== null ? DAYS[timePicker.dayIdx] : ''}
            </Text>
            <TouchableOpacity onPress={() => setTimePicker(null)} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={SCHED_TIMES}
            keyExtractor={t => t}
            renderItem={({ item }) => {
              const current = tpDay?.[timePicker?.field ?? 'from']
              const isSelected = item === current
              return (
                <TouchableOpacity
                  style={[s.timePickerItem, isSelected && s.timePickerItemActive]}
                  onPress={() => {
                    if (timePicker) { updateDaySchedule(timePicker.dayIdx, { [timePicker.field]: item }); setTimePicker(null) }
                  }}
                >
                  <Text style={[s.timePickerItemText, isSelected && { color: GREEN, fontWeight: '700' }]}>
                    {isSelected ? '✓  ' : '    '}{item}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />
        </View>
      </Modal>
    </Animated.ScrollView>
  )
}

// ─── Stilovi ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero
  hero: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 48, paddingBottom: 20, paddingHorizontal: 16, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: { backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#fff', fontSize: 28, fontWeight: '800' },
  avatarEditBtn: {
    position: 'absolute', bottom: -2, right: -2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarDeleteBtn: { right: undefined, left: -2 },
  heroName: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 4 },
  heroEmail: { fontSize: 13, color: '#9ca3af', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Flash
  flashBox: { backgroundColor: '#f0fdf9', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, marginBottom: 8 },
  flashText: { color: '#059669', fontWeight: '700', fontSize: 13 },

  // Card
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  cardSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cardBody: { padding: 16, gap: 14 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f0fdf9' },
  editBtnText: { fontSize: 13, fontWeight: '700', color: GREEN },

  // Info view
  infoRow: { gap: 3 },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  infoEmpty: { color: '#9ca3af', fontStyle: 'italic', fontWeight: '400' },
  priceVal: { fontSize: 20, fontWeight: '900' },
  priceUnit: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },

  // Active toggle
  activeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 2, gap: 12 },
  activeRowOn: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf9' },
  activeRowOff: { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  activeTitle: { fontSize: 13, fontWeight: '700' },
  activeSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  toggleActiveBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 2 },
  toggleActiveBtnOff: { borderColor: '#e5e7eb', backgroundColor: '#fff' },
  toggleActiveBtnOn: { borderColor: GREEN, backgroundColor: '#fff' },
  toggleActiveBtnText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },

  // Dostupnost grid
  availGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  dayBadge: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dayBadgeActive: { backgroundColor: GREEN },
  dayBadgeInactive: { backgroundColor: '#f3f4f6' },
  dayBadgeText: { fontSize: 10, fontWeight: '800' },
  dayTime: { fontSize: 8, color: '#9ca3af', textAlign: 'center', lineHeight: 11 },

  // Edit form
  row2: { flexDirection: 'row', gap: 12 },
  fieldWrap: {},
  label: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111',
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  coordsOk: { fontSize: 11, color: '#059669', marginTop: 4 },

  // Walker edit
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', padding: 14, borderRadius: 12, gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  switchSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  svcRow: { flexDirection: 'row', gap: 8 },
  svcBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 3, backgroundColor: '#fff' },
  svcBtnActive: { borderColor: GREEN, backgroundColor: '#f0fdf9' },
  svcBtnText: { fontSize: 12, fontWeight: '700', color: '#1f2937' },

  // Schedule editor
  presetsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: '#f9fafb', padding: 10, borderRadius: 10, marginBottom: 10 },
  presetLabel: { fontSize: 11, color: '#6b7280' },
  presetBtn: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff' },
  presetBtnText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 6 },
  dayRowActive: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf9' },
  dayRowInactive: { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  dayRowName: { fontSize: 12, fontWeight: '800', width: 26 },
  timeBtn: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#fff' },
  timeBtnText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  dayUnavail: { fontSize: 12, color: '#9ca3af', flex: 1 },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 14 },
  saveBtn: { flex: 1, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutBtn: { backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  deleteBtn: { borderWidth: 2, borderColor: '#fecaca', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  deleteConfirm: { borderWidth: 2, borderColor: '#fca5a5', borderRadius: 14, backgroundColor: '#fef2f2', padding: 14, gap: 10 },
  deleteConfirmTitle: { fontSize: 14, fontWeight: '800', color: '#991b1b' },
  deleteConfirmSub: { fontSize: 12, color: '#ef4444' },
  dangerBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Address autocomplete
  addrDropdown: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', marginTop: 4, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  addrItem: { paddingHorizontal: 14, paddingVertical: 12 },
  addrItemMain: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },

  // Time picker modal
  modal: { flex: 1, backgroundColor: '#fff' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  modalClose: { fontSize: 15, color: '#00BF8F', fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 13, color: '#374151', fontWeight: '700' },
  timePickerItem: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  timePickerItemActive: { backgroundColor: '#f0fdf9' },
  timePickerItemText: { fontSize: 16, color: '#374151' },

  // Reviews
  emptyReviews: { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  reviewItem: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12, gap: 6 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: '#111' },
  reviewDate: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  reviewStars: { fontSize: 13, color: GOLD },
  reviewComment: { fontSize: 13, color: '#374151', lineHeight: 19, marginLeft: 46 },
})
