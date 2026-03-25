import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { RootStackParamList } from '../navigation/RootNavigator'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Nav = NativeStackNavigationProp<RootStackParamList>

const GREEN = '#00BF8F'

export default function LoginScreen() {
  const { login } = useAuth()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pwVisible, setPwVisible] = useState(false)

  async function handleLogin() {
    const e = email.trim()
    if (!e || !password) { setError('Unesite email i lozinku.'); return }
    if (!e.includes('@')) { setError('Unesite validan email.'); return }
    setError('')
    setLoading(true)
    try {
      await login(e, password)
    } catch {
      setError('Pogrešna email adresa ili lozinka.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32 }]} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImg} />
        </View>

        <Text style={styles.title}>Prijavi se</Text>
        <Text style={styles.sub}>
          Nemaš nalog?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            Registruj se besplatno
          </Text>
        </Text>

        {/* Bullets */}
        <View style={styles.bullets}>
          {['Provereni šetači', 'Kalendar rezervacija', 'Direktan chat', 'Ocene i recenzije'].map(item => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot}><Text style={styles.bulletCheck}>✓</Text></View>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Fields */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>EMAIL ADRESA</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ime@email.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>LOZINKA</Text>
          <View style={styles.pwWrap}>
            <TextInput
              style={[styles.input, styles.pwInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!pwVisible}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.pwToggle} onPress={() => setPwVisible(v => !v)}>
              <Text style={styles.pwToggleText}>{pwVisible ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Prijavi se →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerLinkText}>Nemaš nalog? Registruj se besplatno</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 40 },

  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  logoImg: { width: 90, height: 90, borderRadius: 22 },

  title: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  link: { color: GREEN, fontWeight: '700' },

  bullets: { marginBottom: 24, gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  bulletCheck: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bulletText: { fontSize: 13, color: '#374151' },

  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#dc2626' },

  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#111',
  },
  pwWrap: { position: 'relative' },
  pwInput: { paddingRight: 48 },
  pwToggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  pwToggleText: { fontSize: 18 },

  btn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  registerLink: { marginTop: 20, alignItems: 'center' },
  registerLinkText: { fontSize: 13, color: '#9ca3af' },
})
