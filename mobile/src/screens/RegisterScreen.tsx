import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  FlatList, Image, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Location from 'expo-location'
import { register } from '../api/auth'
import { RootStackParamList } from '../navigation/RootNavigator'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Nav = NativeStackNavigationProp<RootStackParamList>

const GREEN = '#00BF8F'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  address: {
    road?: string; house_number?: string
    city?: string; town?: string; village?: string; state?: string
  }
}

function fmtAddress(r: NominatimResult): string {
  const { road, house_number, city, town, village } = r.address
  const street = road ? (house_number ? `${road} ${house_number}` : road) : ''
  const place = city || town || village || ''
  return [street, place].filter(Boolean).join(', ') || r.display_name.split(',').slice(0, 2).join(',').trim()
}

const SVC_OPTIONS = [
  { val: 'walking' as const, icon: '🦮', title: 'Šetanje', desc: 'Vodim pse na šetnju' },
  { val: 'boarding' as const, icon: '🏠', title: 'Čuvanje', desc: 'Čuvam pse kod kuće' },
  { val: 'both' as const, icon: '🐾', title: 'Oboje', desc: 'Šetam i čuvam' },
]

type Services = 'walking' | 'boarding' | 'both'
type Role = 'owner' | 'walker'

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>()
  const insets = useSafeAreaInsets()

  const [role, setRole] = useState<Role>('owner')
  const [services, setServices] = useState<Services>('both')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [pw1Visible, setPw1Visible] = useState(false)
  const [pw2Visible, setPw2Visible] = useState(false)

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [isLocating, setIsLocating] = useState(false)

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=sr`
    const res = await fetch(url, { headers: { 'User-Agent': 'PawsApp/1.0' } })
    const data = await res.json()
    const a = data.address
    if (!a) return data.display_name || ''
    const street = a.road ? `${a.road}${a.house_number ? ` ${a.house_number}` : ''}` : ''
    const city = a.city || a.town || a.village || a.county || ''
    return [street, city].filter(Boolean).join(', ') || data.display_name || ''
  }

  async function handleGpsLocate() {
    setIsLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Dozvola odbijena', 'Omogući pristup lokaciji u podešavanjima.')
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const lat = parseFloat(pos.coords.latitude.toFixed(6))
      const lng = parseFloat(pos.coords.longitude.toFixed(6))
      const addr = await reverseGeocode(lat, lng)
      if (!addr) { Alert.alert('Greška', 'Nije moguće očitati adresu sa lokacije.'); return }
      setAddress(addr)
      setAddressCoords({ lat, lng })
      setAddrResults([])
    } catch {
      Alert.alert('Greška', 'Nije moguće dobiti lokaciju.')
    } finally {
      setIsLocating(false)
    }
  }

  // Address autocomplete
  const [addrResults, setAddrResults] = useState<NominatimResult[]>([])
  const [addrLoading, setAddrLoading] = useState(false)
  const addrDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function searchAddress(q: string) {
    setAddress(q)
    setAddressCoords(null)
    if (addrDebounce.current) clearTimeout(addrDebounce.current)
    if (q.length < 3) { setAddrResults([]); return }
    addrDebounce.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setAddrLoading(true)
      try {
        const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=rs&addressdetails=1`
        const res = await fetch(url, {
          signal: abortRef.current.signal,
          headers: { 'Accept-Language': 'sr', 'User-Agent': 'PawsApp/1.0' },
        })
        const data: NominatimResult[] = await res.json()
        setAddrResults(data.slice(0, 5))
      } catch {
        // ignore abort
      } finally {
        setAddrLoading(false)
      }
    }, 450)
  }

  function selectAddress(r: NominatimResult) {
    setAddress(fmtAddress(r))
    setAddressCoords({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) })
    setAddrResults([])
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (firstName.trim().length < 2) errs.firstName = 'Obavezno (min. 2 karaktera)'
    if (lastName.trim().length < 2) errs.lastName = 'Obavezno (min. 2 karaktera)'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Unesi validan email'
    if (address.trim().length < 5) errs.address = 'Adresa je obavezna'
    if (password.length < 8) errs.password = 'Minimum 8 karaktera'
    if (password !== password2) errs.password2 = 'Lozinke se ne poklapaju'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleRegister() {
    if (!validate()) return
    setApiError('')
    setLoading(true)
    try {
      await register({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        address: address.trim(),
        password,
        password2,
        ...(addressCoords ? { lat: addressCoords.lat, lng: addressCoords.lng } : {}),
        ...(role === 'walker' ? { services } : {}),
      })
      navigation.navigate('Login')
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } }
      const msgs = err.response?.data
      if (msgs?.email?.[0]) setApiError(msgs.email[0])
      else if (msgs) setApiError(Object.values(msgs).flat()[0] || 'Greška pri registraciji.')
      else setApiError('Greška pri registraciji. Pokušaj ponovo.')
    } finally {
      setLoading(false)
    }
  }

  const err = (key: string) => fieldErrors[key]
    ? <Text style={styles.fieldError}>{fieldErrors[key]}</Text>
    : null

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImg} />
        </View>

        <Text style={styles.title}>Kreiraj nalog</Text>
        <Text style={styles.sub}>
          Već imaš nalog?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
            Prijavi se
          </Text>
        </Text>

        {/* ── Ko si? ── */}
        <Text style={styles.label}>KO SI?</Text>
        <View style={styles.roleRow}>
          {([
            { val: 'owner' as Role, icon: '🏠', title: 'Vlasnik psa', desc: 'Tražim šetača' },
            { val: 'walker' as Role, icon: '🦮', title: 'Šetač / Čuvar', desc: 'Nudim usluge' },
          ]).map(opt => (
            <TouchableOpacity
              key={opt.val}
              style={[styles.roleBtn, role === opt.val && styles.roleBtnActive]}
              onPress={() => setRole(opt.val)}
            >
              <Text style={{ fontSize: 24 }}>{opt.icon}</Text>
              <Text style={[styles.roleBtnTitle, role === opt.val && { color: GREEN }]}>{opt.title}</Text>
              <Text style={styles.roleBtnDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Usluge (samo šetač) ── */}
        {role === 'walker' && (
          <View style={styles.svcSection}>
            <Text style={[styles.label, { marginBottom: 8 }]}>KOJE USLUGE NUDIM?</Text>
            <View style={styles.svcRow}>
              {SVC_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.val}
                  style={[styles.svcBtn, services === opt.val && styles.svcBtnActive]}
                  onPress={() => setServices(opt.val)}
                >
                  <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                  <Text style={[styles.svcBtnTitle, services === opt.val && { color: '#059669' }]}>{opt.title}</Text>
                  <Text style={styles.svcBtnDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── API greška ── */}
        {apiError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
        ) : null}

        {/* ── Ime + Prezime ── */}
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>IME</Text>
            <TextInput
              style={[styles.input, fieldErrors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Marko"
              placeholderTextColor="#9ca3af"
            />
            {err('firstName')}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PREZIME</Text>
            <TextInput
              style={[styles.input, fieldErrors.lastName && styles.inputError]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Petrović"
              placeholderTextColor="#9ca3af"
            />
            {err('lastName')}
          </View>
        </View>

        {/* ── Email ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>EMAIL ADRESA</Text>
          <TextInput
            style={[styles.input, fieldErrors.email && styles.inputError]}
            value={email}
            onChangeText={setEmail}
            placeholder="ime@email.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {err('email')}
        </View>

        {/* ── Adresa sa autocomplete ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>ADRESA</Text>
          <View style={styles.addrWrap}>
            <TextInput
              style={[styles.input, fieldErrors.address && styles.inputError, { paddingRight: 48 }]}
              value={address}
              onChangeText={searchAddress}
              placeholder="npr. Bulevar Oslobođenja 12, Novi Sad"
              placeholderTextColor="#9ca3af"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGpsLocate}
              disabled={isLocating || addrLoading}
            >
              {isLocating
                ? <ActivityIndicator size="small" color={GREEN} />
                : addressCoords
                  ? <Text style={{ fontSize: 16, color: GREEN }}>✓</Text>
                  : <Text style={{ fontSize: 16 }}>📍</Text>
              }
            </TouchableOpacity>
          </View>
          {addrResults.length > 0 && (
            <View style={styles.addrDropdown}>
              {addrResults.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.addrItem, i < addrResults.length - 1 && styles.addrItemBorder]}
                  onPress={() => selectAddress(r)}
                >
                  <Text style={styles.addrItemMain}>{fmtAddress(r)}</Text>
                  {r.address.state && (
                    <Text style={styles.addrItemSub}>{r.address.state}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {err('address')}
        </View>

        {/* ── Lozinke ── */}
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>LOZINKA</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, styles.pwInput, fieldErrors.password && styles.inputError]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 karaktera"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!pw1Visible}
              />
              <TouchableOpacity style={styles.pwToggle} onPress={() => setPw1Visible(v => !v)}>
                <Text style={styles.pwToggleText}>{pw1Visible ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {err('password')}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>POTVRDI</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, styles.pwInput, fieldErrors.password2 && styles.inputError]}
                value={password2}
                onChangeText={setPassword2}
                placeholder="Ponovi lozinku"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!pw2Visible}
              />
              <TouchableOpacity style={styles.pwToggle} onPress={() => setPw2Visible(v => !v)}>
                <Text style={styles.pwToggleText}>{pw2Visible ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {err('password2')}
          </View>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Kreiraj nalog besplatno →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>Već imaš nalog? Prijavi se</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  logoImg: { width: 90, height: 90, borderRadius: 22 },

  title: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  link: { color: GREEN, fontWeight: '700' },

  label: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6 },

  // Role
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4, backgroundColor: '#fff',
  },
  roleBtnActive: { borderColor: GREEN, backgroundColor: '#f0fdf9' },
  roleBtnTitle: { fontSize: 13, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  roleBtnDesc: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },

  // Services
  svcSection: { marginBottom: 20 },
  svcRow: { flexDirection: 'row', gap: 8 },
  svcBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 3, backgroundColor: '#fff',
  },
  svcBtnActive: { borderColor: GREEN, backgroundColor: '#f0fdf9' },
  svcBtnTitle: { fontSize: 12, fontWeight: '700', color: '#1f2937' },
  svcBtnDesc: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },

  // Error
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#dc2626' },
  fieldError: { fontSize: 12, color: '#ef4444', marginTop: 4 },

  // Form
  fieldWrap: { marginBottom: 16 },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#111',
  },
  inputError: { borderColor: '#fca5a5' },

  // Address autocomplete
  addrWrap: { position: 'relative' },
  gpsBtn: {
    position: 'absolute', right: 10, top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', width: 36,
  },
  addrDropdown: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    backgroundColor: '#fff', marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  addrItem: { paddingHorizontal: 14, paddingVertical: 12 },
  addrItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  addrItemMain: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  addrItemSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // Password
  pwWrap: { position: 'relative' },
  pwInput: { paddingRight: 44 },
  pwToggle: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  pwToggleText: { fontSize: 17 },

  btn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  loginLink: { marginTop: 20, alignItems: 'center' },
  loginLinkText: { fontSize: 13, color: '#9ca3af' },
})
