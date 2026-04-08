import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'

const GREEN = '#00BF8F'

export default function HomeScreen() {
  const { user, logout } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.logoBg}>
          <Ionicons name="paw" size={36} color="#fff" />
        </View>
        <Text style={styles.title}>PawsApp</Text>
        <Text style={styles.subtitle}>
          Dobrodošao{user?.first_name ? `, ${user.first_name}` : ''}!
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutText}>Odjavi se</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 32,
  },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoBg: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
