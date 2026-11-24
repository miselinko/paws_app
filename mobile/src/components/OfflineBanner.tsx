import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import NetInfo from '@react-native-community/netinfo'
import { onServerWaking } from '../api/serverStatus'

/**
 * Traka na vrhu: „nema interneta" (NetInfo, bez periodičnog pingovanja — štedi bateriju)
 * ili „server se pokreće" dok se Render backend budi.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [waking, setWaking] = useState(false)

  useEffect(() => NetInfo.addEventListener(state => {
    setIsOffline(state.isConnected === false || state.isInternetReachable === false)
  }), [])
  useEffect(() => onServerWaking(setWaking), [])

  if (isOffline) {
    return (
      <View style={styles.banner}>
        <Ionicons name="cloud-offline-outline" size={16} color="#78350f" style={{ marginRight: 6 }} />
        <Text style={styles.text}>Nema internet konekcije</Text>
      </View>
    )
  }
  if (waking) {
    return (
      <View style={[styles.banner, styles.waking]}>
        <Ionicons name="hourglass-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
        <Text style={[styles.text, { color: '#fff' }]}>Server se pokreće, sačekaj nekoliko sekundi…</Text>
      </View>
    )
  }
  return null
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
  waking: { backgroundColor: '#1f2937' },
  text: { fontSize: 13, fontWeight: '700', color: '#78350f' },
})
