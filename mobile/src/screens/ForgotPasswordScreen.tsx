import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/RootNavigator'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { forgotPassword } from '../api/users'

type Nav = NativeStackNavigationProp<RootStackParamList>

const GREEN = '#00BF8F'

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    const e = email.trim()
    if (!e) { setError('Unesite email adresu.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setError('Unesite validan email.'); return }
    setError('')
    setLoading(true)
    try {
      await forgotPassword(e)
      setSent(true)
    } catch {
      setError('Došlo je do greške. Pokušaj ponovo.')
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
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImg} />
        </View>

        {sent ? (
          <View style={styles.center}>
            <Text style={styles.bigIcon}>📧</Text>
            <Text style={styles.title}>Proveri email</Text>
            <Text style={styles.sub}>
              Ako ovaj email postoji u sistemu, poslaćemo ti link za resetovanje lozinke.
            </Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backBtnText}>← Nazad na prijavu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Zaboravljena lozinka?</Text>
            <Text style={styles.sub}>
              Unesite email i poslaćemo vam link za resetovanje.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

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
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Pošalji link →</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
              <Text style={styles.backLinkText}>← Nazad na prijavu</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  logoImg: { width: 90, height: 90, borderRadius: 22 },
  center: { alignItems: 'center' },
  bigIcon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#dc2626' },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#111',
  },
  btn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  backLink: { marginTop: 24, alignItems: 'center' },
  backLinkText: { fontSize: 13, color: GREEN, fontWeight: '700' },
  backBtn: { marginTop: 16 },
  backBtnText: { fontSize: 14, color: GREEN, fontWeight: '700' },
})
