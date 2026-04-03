import React from 'react'
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { getDogProfile } from '../api/dogs'
import { imgUrl } from '../api/config'
import { ReservationsStackParamList } from '../navigation/ReservationsNavigator'

type Route = RouteProp<ReservationsStackParamList, 'DogProfile'>

const GREEN = '#00BF8F'

const SIZE_LABELS: Record<string, string> = {
  small: 'Mali (do 10kg)',
  medium: 'Srednji (10-25kg)',
  large: 'Veliki (25kg+)',
}

const SIZE_COLORS: Record<string, { bg: string; color: string }> = {
  small:  { bg: '#f0fdf9', color: '#059669' },
  medium: { bg: '#fffbeb', color: '#92400e' },
  large:  { bg: '#eff6ff', color: '#1d4ed8' },
}

export default function DogProfileScreen() {
  const { params } = useRoute<Route>()
  const navigation = useNavigation()

  const { data: dog, isLoading, error } = useQuery({
    queryKey: ['dogProfile', params.dogId],
    queryFn: () => getDogProfile(params.dogId),
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    )
  }

  if (error || !dog) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>🔒</Text>
        <Text style={styles.errorTitle}>Nema pristupa</Text>
        <Text style={styles.errorSub}>Nemate dozvolu da vidite profil ovog psa.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const sc = SIZE_COLORS[dog.size] || SIZE_COLORS.medium
  const photo = imgUrl(dog.image)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Photo */}
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>🐕</Text>
        </View>
      )}

      {/* Name + breed */}
      <View style={styles.nameSection}>
        <Text style={styles.name}>{dog.name}</Text>
        <Text style={styles.breed}>{dog.breed}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{dog.age}</Text>
          <Text style={styles.statLabel}>god.</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{dog.gender === 'male' ? '♂' : '♀'}</Text>
          <Text style={styles.statLabel}>{dog.gender === 'male' ? 'Muški' : 'Ženski'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{dog.neutered ? '✓' : '✗'}</Text>
          <Text style={styles.statLabel}>{dog.neutered ? 'Kastr.' : 'Nije'}</Text>
        </View>
      </View>

      {/* Size */}
      <View style={[styles.sizeBadge, { backgroundColor: sc.bg }]}>
        <Text style={[styles.sizeText, { color: sc.color }]}>{SIZE_LABELS[dog.size] || dog.size}</Text>
      </View>

      {/* Temperament */}
      {dog.temperament ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEMPERAMENT</Text>
          <View style={styles.tagsRow}>
            {dog.temperament.split(',').map((t: string, i: number) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{t.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Notes */}
      {dog.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NAPOMENE</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{dog.notes}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  photo: { width: '100%', height: 260, backgroundColor: '#e5e7eb' },
  placeholder: { width: '100%', height: 200, backgroundColor: '#f0fdf9', justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 72 },

  nameSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  name: { fontSize: 26, fontWeight: '900', color: '#111' },
  breed: { fontSize: 14, color: '#9ca3af', marginTop: 2 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 12 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#111' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  sizeBadge: { alignSelf: 'flex-start', marginLeft: 20, marginTop: 16, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  sizeText: { fontSize: 12, fontWeight: '700' },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1, marginBottom: 8 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },

  notesBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 14, padding: 14 },
  notesText: { fontSize: 13, color: '#92400e', lineHeight: 20 },

  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#374151', marginBottom: 6 },
  errorSub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: '#1f2937', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
