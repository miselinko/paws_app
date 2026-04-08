import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Use fetch to check connectivity since @react-native-community/netinfo is not installed
    const check = async () => {
      try {
        // Simple connectivity check — ping with a tiny request
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        await fetch('https://www.google.com/generate_204', {
          method: 'HEAD', signal: controller.signal
        })
        clearTimeout(timeout)
        setIsOffline(false)
      } catch {
        setIsOffline(true)
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  if (!isOffline) return null

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color="#78350f" style={{ marginRight: 6 }} />
      <Text style={styles.text}>Nema internet konekcije</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fbbf24',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  text: { fontSize: 13, fontWeight: '700', color: '#78350f' },
})
