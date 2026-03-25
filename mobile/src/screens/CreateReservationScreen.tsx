import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { getDogs } from '../api/dogs'
import { createReservation } from '../api/reservations'
import { WalkersStackParamList } from '../navigation/WalkersNavigator'

type Route = RouteProp<WalkersStackParamList, 'CreateReservation'>

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function formatLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

const DURATIONS = [20, 30, 60]

export default function CreateReservationScreen() {
  const route = useRoute<Route>()
  const navigation = useNavigation()
  const qc = useQueryClient()
  const { walkerId, walkerName } = route.params

  const { data: dogs = [], isLoading: dogsLoading } = useQuery({
    queryKey: ['dogs'],
    queryFn: getDogs,
  })

  const [serviceType, setServiceType] = useState<'walking' | 'boarding' | null>(null)
  const [selectedDogs, setSelectedDogs] = useState<number[]>([])
  const [duration, setDuration] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      Alert.alert('Uspešno', 'Rezervacija je poslata šetaču.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    },
    onError: () => {
      Alert.alert('Greška', 'Proveri unesene podatke i pokušaj ponovo.')
    },
  })

  function toggleDog(id: number) {
    setSelectedDogs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  function handleSubmit() {
    if (!serviceType) {
      Alert.alert('Greška', 'Izaberi tip usluge (Šetanje ili Čuvanje).')
      return
    }
    if (selectedDogs.length === 0) {
      Alert.alert('Greška', 'Izaberi bar jednog psa.')
      return
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      Alert.alert('Greška', 'Unesite datum i vreme početka i kraja.')
      return
    }
    const start = `${startDate}T${startTime}:00`
    const end = `${endDate}T${endTime}:00`
    if (new Date(start) >= new Date(end)) {
      Alert.alert('Greška', 'Vreme početka mora biti pre kraja.')
      return
    }
    mutation.mutate({
      walker: walkerId,
      dog_ids: selectedDogs,
      service_type: serviceType,
      duration: serviceType === 'walking' && duration ? duration : undefined,
      start_time: start,
      end_time: end,
      notes,
    })
  }

  if (dogsLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00BF8F" /></View>
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.walkerLabel}>Šetač: <Text style={styles.walkerName}>{walkerName}</Text></Text>

      {/* Tip usluge */}
      <View style={styles.section}>
        <Text style={styles.label}>Tip usluge</Text>
        <View style={styles.row}>
          {(['walking', 'boarding'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.optBtn, serviceType === type && styles.optBtnActive]}
              onPress={() => { setServiceType(type); if (type === 'boarding') setDuration(null) }}
            >
              <Text style={[styles.optBtnText, serviceType === type && styles.optBtnTextActive]}>
                {type === 'walking' ? '🦮 Šetanje' : '🏠 Čuvanje'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Trajanje (samo za šetanje) */}
      {serviceType === 'walking' && (
        <View style={styles.section}>
          <Text style={styles.label}>Trajanje</Text>
          <View style={styles.row}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.optBtn, duration === d && styles.optBtnActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.optBtnText, duration === d && styles.optBtnTextActive]}>{d} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Psi */}
      <View style={styles.section}>
        <Text style={styles.label}>Izaberi psa</Text>
        {dogs.length === 0 ? (
          <Text style={styles.emptyText}>Nemaš dodanih pasa. Dodaj ih u tabu "Moji psi".</Text>
        ) : (
          dogs.map((dog) => (
            <TouchableOpacity
              key={dog.id}
              style={[styles.dogRow, selectedDogs.includes(dog.id) && styles.dogRowActive]}
              onPress={() => toggleDog(dog.id)}
            >
              <Text style={styles.dogName}>🐶 {dog.name}</Text>
              <Text style={styles.dogBreed}>{dog.breed}</Text>
              {selectedDogs.includes(dog.id) && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Datum i vreme */}
      <View style={styles.section}>
        <Text style={styles.label}>Početak (datum i vreme)</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="2025-12-01"
            value={startDate}
            onChangeText={setStartDate}
            maxLength={10}
          />
          <TextInput
            style={[styles.input, styles.timeInput]}
            placeholder="09:00"
            value={startTime}
            onChangeText={setStartTime}
            maxLength={5}
          />
        </View>
        <Text style={styles.label}>Kraj (datum i vreme)</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="2025-12-01"
            value={endDate}
            onChangeText={setEndDate}
            maxLength={10}
          />
          <TextInput
            style={[styles.input, styles.timeInput]}
            placeholder="10:00"
            value={endTime}
            onChangeText={setEndTime}
            maxLength={5}
          />
        </View>
      </View>

      {/* Napomene */}
      <View style={styles.section}>
        <Text style={styles.label}>Napomene (opciono)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Posebne instrukcije..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Pošalji zahtev</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  walkerLabel: { fontSize: 15, color: '#666', marginBottom: 16 },
  walkerName: { fontWeight: '700', color: '#1a1a1a' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  optBtn: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  optBtnActive: { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' },
  optBtnText: { color: '#666', fontWeight: '500' },
  optBtnTextActive: { color: '#00BF8F' },
  dogRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10,
  },
  dogRowActive: { backgroundColor: '#f0f7ff', borderRadius: 8, paddingHorizontal: 8 },
  dogName: { fontSize: 15, fontWeight: '600', flex: 1 },
  dogBreed: { fontSize: 13, color: '#888' },
  check: { color: '#00BF8F', fontWeight: '700', fontSize: 16 },
  emptyText: { color: '#999', fontSize: 14 },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#fafafa',
  },
  dateInput: { flex: 2 },
  timeInput: { flex: 1 },
  textarea: { height: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#00BF8F', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
