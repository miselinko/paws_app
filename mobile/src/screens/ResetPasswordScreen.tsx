import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/RootNavigator'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { resetPassword } from '../api/users'

type Nav = NativeStackNavigationProp<RootStackParamList>
type Route = RouteProp<RootStackParamList, 'ResetPassword'>

const GREEN = '#00BF8F'

export default function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const insets = useSafeAreaInsets()
  const token = route.params?.token || ''

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (password !== password2) { setError('Lozinke se ne poklapaju.'); return }
    if (password.length < 8) { setError('Lozinka mora imati najmanje 8 karaktera.'); return }
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigation.navigate('Login'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Nevažeći ili istekao link.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <Ionicons name="warning-outline" size={48} color="#f59e0b" style={{ marginBottom: 16 }} />
        <Text style={styles.sub}>Nevažeći link za resetovanje.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.backBtnText}>Zatraži novi link</Text>
        </TouchableOpacity>
      </View>
    )
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

        {done ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle" size={48} color="#00BF8F" style={{ marginBottom: 16 }} />
            <Text style={styles.title}>Lozinka promenjena!</Text>
            <Text style={styles.sub}>Preusmeravamo te na prijavu...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Nova lozinka</Text>
            <Text style={styles.sub}>Unesite novu lozinku za vaš Paws nalog.</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>NOVA LOZINKA</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Najmanje 8 karaktera"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>PONOVI LOZINKU</Text>
              <TextInput
                style={styles.input}
                value={password2}
                onChangeText={setPassword2}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry
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
                : <Text style={styles.btnText}>Sačuvaj lozinku →</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerAll: { justifyContent: 'center', alignItems: 'center', padding: 28 },
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
  backBtnText: { fontSize: 14, color: GREEN, fontWeight: '700', marginTop: 16 },
})
