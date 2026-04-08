import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/RootNavigator'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { verifyEmail } from '../api/users'

type Nav = NativeStackNavigationProp<RootStackParamList>
type Route = RouteProp<RootStackParamList, 'VerifyEmail'>

const GREEN = '#00BF8F'

export default function VerifyEmailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const insets = useSafeAreaInsets()
  const token = route.params?.token || ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Nevažeći link za verifikaciju.')
      return
    }
    verifyEmail(token)
      .then(res => {
        setMessage(res.detail || 'Email adresa je potvrđena.')
        setStatus('success')
      })
      .catch((err: any) => {
        setMessage(err.response?.data?.detail || 'Nevažeći ili istekao link.')
        setStatus('error')
      })
  }, [token])

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <View style={styles.logoWrap}>
        <Image source={require('../../assets/logo.png')} style={styles.logoImg} />
      </View>

      {status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.sub}>Verifikacija u toku...</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={48} color="#00BF8F" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Email potvrđen!</Text>
          <Text style={styles.sub}>{message}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnText}>Prijavi se →</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color="#f59e0b" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Greška</Text>
          <Text style={styles.sub}>{message}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Nazad na prijavu</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 28 },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  logoImg: { width: 90, height: 90, borderRadius: 22 },
  center: { alignItems: 'center' },
  bigIcon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20, textAlign: 'center' },
  btn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  linkText: { fontSize: 14, color: GREEN, fontWeight: '700' },
})
