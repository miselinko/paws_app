import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function HomeScreen() {
  const { logout } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐾 Paws</Text>
      <Text style={styles.subtitle}>Dobrodošao!</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
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
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  title: {
    fontSize: 48,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#333',
    marginBottom: 48,
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
