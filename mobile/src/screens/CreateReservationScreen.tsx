import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
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

function fmtDate(d: Date) {
  return d.toLocaleDateString('sr-Latn', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' })
}

const DURATIONS = [
  { label: '30 min', mins: 30 },
  { label: '1 h', mins: 60 },
  { label: '1.5 h', mins: 90 },
  { label: '2 h', mins: 120 },
  { label: '3 h', mins: 180 },
]

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
  const [notes, setNotes] = useState('')

  // Date/time picker state — zaokružen start na sledećih 30 min
  const now = new Date()
  const roundedStart = new Date(now.getTime() + (30 - now.getMinutes() % 30) * 60000)
  const [startDateTime, setStartDateTime] = useState<Date>(roundedStart)
  const [endDateTime, setEndDateTime] = useState<Date>(new Date(roundedStart.getTime() + 60 * 60000))

  const [showPicker, setShowPicker] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null)

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

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowPicker(null)
    if (event.type === 'dismissed' || !date) return

    if (showPicker === 'startDate') {
      const merged = new Date(date)
      merged.setHours(startDateTime.getHours(), startDateTime.getMinutes())
      setStartDateTime(merged)
      if (merged >= endDateTime) {
        setEndDateTime(new Date(merged.getTime() + 60 * 60000))
      }
    } else if (showPicker === 'startTime') {
      const merged = new Date(startDateTime)
      merged.setHours(date.getHours(), date.getMinutes())
      setStartDateTime(merged)
      if (merged >= endDateTime) {
        setEndDateTime(new Date(merged.getTime() + 60 * 60000))
      }
    } else if (showPicker === 'endDate') {
      const merged = new Date(date)
      merged.setHours(endDateTime.getHours(), endDateTime.getMinutes())
      setEndDateTime(merged)
    } else if (showPicker === 'endTime') {
      const merged = new Date(endDateTime)
      merged.setHours(date.getHours(), date.getMinutes())
      setEndDateTime(merged)
    }
  }

  function handleDurationSelect(mins: number) {
    setDuration(mins)
    setEndDateTime(new Date(startDateTime.getTime() + mins * 60000))
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
    if (startDateTime >= endDateTime) {
      Alert.alert('Greška', 'Vreme početka mora biti pre kraja.')
      return
    }
    if (startDateTime < new Date()) {
      Alert.alert('Greška', 'Početak ne može biti u prošlosti.')
      return
    }
    mutation.mutate({
      walker: walkerId,
      dog_ids: selectedDogs,
      service_type: serviceType,
      duration: serviceType === 'walking' && duration ? duration : undefined,
      start_time: formatLocal(startDateTime),
      end_time: formatLocal(endDateTime),
      notes,
    })
  }

  if (dogsLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00BF8F" /></View>
  }

  const pickerMode = showPicker?.includes('Date') ? 'date' : 'time'
  const pickerValue = showPicker?.startsWith('start') ? startDateTime : endDateTime

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
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.mins}
                style={[styles.optBtn, duration === d.mins && styles.optBtnActive]}
                onPress={() => handleDurationSelect(d.mins)}
              >
                <Text style={[styles.optBtnText, duration === d.mins && styles.optBtnTextActive]}>{d.label}</Text>
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

      {/* Datum i vreme — native pickeri */}
      <View style={styles.section}>
        <Text style={styles.label}>Početak</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={[styles.pickerBtn, { flex: 2 }]} onPress={() => setShowPicker('startDate')}>
            <Text style={styles.pickerBtnText}>📅 {fmtDate(startDateTime)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pickerBtn, { flex: 1 }]} onPress={() => setShowPicker('startTime')}>
            <Text style={styles.pickerBtnText}>🕐 {fmtTime(startDateTime)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Kraj</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={[styles.pickerBtn, { flex: 2 }]} onPress={() => setShowPicker('endDate')}>
            <Text style={styles.pickerBtnText}>📅 {fmtDate(endDateTime)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pickerBtn, { flex: 1 }]} onPress={() => setShowPicker('endTime')}>
            <Text style={styles.pickerBtnText}>🕐 {fmtTime(endDateTime)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Native DateTimePicker */}
      {showPicker && (
        Platform.OS === 'ios' ? (
          <View style={styles.iosPickerWrap}>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Text style={styles.iosPickerDone}>Gotovo</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerValue!}
              mode={pickerMode as 'date' | 'time'}
              display="spinner"
              minimumDate={new Date()}
              onChange={onPickerChange}
            />
          </View>
        ) : (
          <DateTimePicker
            value={pickerValue!}
            mode={pickerMode as 'date' | 'time'}
            display="default"
            minimumDate={new Date()}
            onChange={onPickerChange}
          />
        )
      )}

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
  pickerBtn: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#fafafa',
  },
  pickerBtnText: { fontSize: 15, color: '#333', fontWeight: '500' },
  iosPickerWrap: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row', justifyContent: 'flex-end', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  iosPickerDone: { color: '#00BF8F', fontWeight: '700', fontSize: 16 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#fafafa',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#00BF8F', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
