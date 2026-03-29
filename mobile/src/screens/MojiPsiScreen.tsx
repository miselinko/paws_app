import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  TextInput, Modal, ActivityIndicator, Alert, Switch, FlatList, Animated, Platform,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { getMyDogs, createDog, updateDog, deleteDog, deleteDogImage } from '../api/dogs'
import { imgUrl } from '../api/config'
import { Dog } from '../types'

// ─── Konstante ────────────────────────────────────────────────────────────────

const PASMINE = [
  'Labrador Retriver', 'Zlatni Retriver', 'Nemački Ovčar', 'Buldog', 'Pudla',
  'Bigl', 'Rotvajer', 'Jorkširski Terijer', 'Bokser', 'Dalmatinac',
  'Sibirski Haski', 'Shi Tzu', 'Doberman', 'Francuski Buldog', 'Mops',
  'Čivava', 'Australijski Ovčar', 'Border Koli', 'Koker Španijel', 'Špic',
  'Američki Bul Terijer', 'Stafordširski Bul Terijer', 'Akita', 'Samojed',
  'Bernski Planinski Pas', 'Njufaundlend', 'Irski Seter', 'Vizla', 'Maltezer',
  'Bišon Frize', 'Kavapoo', 'Džek Rasel Terijer', 'Minijaturni Šnaucer',
  'Pirinesjki Planinski Pas', 'Malamut', 'Dogo Argentino', 'Kan Korso',
  'Belgijski Malinoa', 'Bulmastif', 'Mešanac', 'Ostalo',
]

const TEMPERAMENT_OPCIJE = [
  'Miran', 'Energičan', 'Društven', 'Igriv', 'Nežan', 'Poslušan',
  'Dobar sa decom', 'Dobar sa psima', 'Stidljiv', 'Dominantan',
  'Teritorijalan', 'Zaštitarski', 'Radoznao', 'Samostalan',
]

const SIZES = [
  { val: 'small', label: 'Mali (do 10kg)' },
  { val: 'medium', label: 'Srednji (10–25kg)' },
  { val: 'large', label: 'Veliki (25kg+)' },
]

const SIZE_COLORS: Record<string, { bg: string; color: string; short: string }> = {
  small:  { bg: '#f0fdf9', color: '#059669', short: 'Mali' },
  medium: { bg: '#fffbeb', color: '#b45309', short: 'Srednji' },
  large:  { bg: '#eff6ff', color: '#1d4ed8', short: 'Veliki' },
}

const CARD_COLORS = ['#6d28d9', '#2563eb', '#059669', '#dc2626', '#d97706']

interface FormState {
  name: string
  breed: string
  age: string
  weight: string
  size: string
  gender: string
  neutered: boolean
  notes: string
}

const initialForm: FormState = {
  name: '', breed: '', age: '', weight: '',
  size: '', gender: '', neutered: false, notes: '',
}

// ─── Dog Card ─────────────────────────────────────────────────────────────────

function DogCard({ dog, onEdit, onDelete, onDeleteImage }: {
  dog: Dog
  onEdit: () => void
  onDelete: () => void
  onDeleteImage: () => void
}) {
  const sz = SIZE_COLORS[dog.size]
  const cardColor = CARD_COLORS[dog.id % CARD_COLORS.length]
  const photo = imgUrl(dog.image)
  const tags = dog.temperament ? dog.temperament.split(',').map(t => t.trim()).filter(Boolean) : []
  const scale = useRef(new Animated.Value(1)).current
  const entryAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(entryAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7, delay: 50 }).start()
  }, [])

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], opacity: entryAnim }}>
    <View style={styles.card}>
      {/* Photo / color banner */}
      <View style={[styles.cardBanner, { backgroundColor: cardColor }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardBannerImage} />
        ) : (
          <Text style={{ fontSize: 40 }}>🐕</Text>
        )}
        {/* Size badge */}
        <View style={[styles.sizeBadge, { backgroundColor: sz.bg }]}>
          <Text style={[styles.sizeBadgeText, { color: sz.color }]}>{sz.short}</Text>
        </View>
        {/* Action buttons */}
        <View style={styles.cardActions}>
          {dog.image && (
            <TouchableOpacity style={styles.cardActionBtn} onPress={onDeleteImage}>
              <Text style={{ fontSize: 14 }}>🖼</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cardActionBtn} onPress={onEdit}>
            <Text style={{ fontSize: 14 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionBtn} onPress={onDelete}>
            <Text style={{ fontSize: 14 }}>🗑</Text>
          </TouchableOpacity>
        </View>
        {/* Name on photo */}
        <View style={styles.cardNameOverlay}>
          <Text style={styles.cardName}>{dog.name}</Text>
          <Text style={styles.cardBreed}>{dog.breed}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.cardStats}>
        <View style={[styles.cardStat, { borderRightWidth: 1, borderRightColor: '#f0f0f0' }]}>
          <Text style={styles.cardStatLabel}>Starost</Text>
          <Text style={styles.cardStatValue}>{dog.age} god.</Text>
        </View>
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Pol</Text>
          <Text style={styles.cardStatValue}>{dog.gender === 'male' ? '♂ Muški' : '♀ Ženski'}</Text>
        </View>
      </View>

      {/* Tags */}
      {(dog.neutered || tags.length > 0) && (
        <View style={styles.cardTags}>
          {dog.neutered && (
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: '#059669' }]}>✓ Kastriran</Text>
            </View>
          )}
          {tags.slice(0, 3).map(t => (
            <View key={t} style={[styles.tag, { backgroundColor: '#f9fafb' }]}>
              <Text style={[styles.tagText, { color: '#6b7280' }]}>{t}</Text>
            </View>
          ))}
          {tags.length > 3 && (
            <View style={[styles.tag, { backgroundColor: '#f9fafb' }]}>
              <Text style={[styles.tagText, { color: '#9ca3af' }]}>+{tags.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {dog.notes ? (
        <View style={styles.cardNotes}>
          <Text style={styles.cardNotesText}>📝 {dog.notes}</Text>
        </View>
      ) : null}
    </View>
    </Animated.View>
  )
}

// ─── Glavni ekran ─────────────────────────────────────────────────────────────

export default function MojiPsiScreen() {
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [formVisible, setFormVisible] = useState(false)

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start()
  }, [])
  const [editingDog, setEditingDog] = useState<Dog | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [tempTags, setTempTags] = useState<string[]>([])
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageAsset, setImageAsset] = useState<{ fileName?: string | null; mimeType?: string | null } | null>(null)
  const [breedSearch, setBreedSearch] = useState('')
  const [breedModalVisible, setBreedModalVisible] = useState(false)
  const [sizeModalVisible, setSizeModalVisible] = useState(false)

  const { data: dogs = [], isLoading } = useQuery<Dog[]>({
    queryKey: ['myDogs'],
    queryFn: getMyDogs,
  })

  function openCreate() {
    setEditingDog(null)
    setForm(initialForm)
    setTempTags([])
    setImageUri(null)
    setImageAsset(null)
    setFormVisible(true)
  }

  function openEdit(dog: Dog) {
    setEditingDog(dog)
    setForm({
      name: dog.name,
      breed: dog.breed,
      age: String(dog.age),
      weight: String(dog.weight ?? ''),
      size: dog.size,
      gender: dog.gender,
      neutered: dog.neutered,
      notes: dog.notes ?? '',
    })
    setTempTags(dog.temperament ? dog.temperament.split(',').map(t => t.trim()).filter(Boolean) : [])
    setImageUri(dog.image ? imgUrl(dog.image) ?? null : null)
    setFormVisible(true)
  }

  function closeForm() {
    setFormVisible(false)
    setEditingDog(null)
    setForm(initialForm)
    setTempTags([])
    setImageUri(null)
    setImageAsset(null)
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Dozvola odbijena', 'Omogući pristup galeriji u podešavanjima telefona.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: Platform.OS === 'ios',
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const { uri, fileName, mimeType } = result.assets[0]
      setImageUri(uri)
      setImageAsset({ fileName, mimeType })
    }
  }

  function buildFormData(): FormData {
    const fd = new FormData() as any
    fd.append('name', form.name)
    fd.append('breed', form.breed)
    fd.append('age', form.age)
    if (form.weight) fd.append('weight', form.weight)
    fd.append('size', form.size)
    fd.append('gender', form.gender)
    fd.append('neutered', String(form.neutered))
    fd.append('temperament', tempTags.join(', '))
    fd.append('notes', form.notes)
    // Only attach image if it's a new local file (not a remote URL)
    if (imageUri && !imageUri.startsWith('http')) {
      const name = imageAsset?.fileName || `dog_${Date.now()}.jpg`
      const type = imageAsset?.mimeType || 'image/jpeg'
      fd.append('image', { uri: imageUri, name, type } as any)
    }
    return fd
  }

  function validateDogForm(): string | null {
    if (!form.name.trim() || form.name.trim().length > 50) return 'Ime je obavezno (maks. 50 karaktera).'
    if (!form.breed.trim() || form.breed.trim().length > 50) return 'Rasa je obavezna (maks. 50 karaktera).'
    const age = Number(form.age)
    if (!form.age || isNaN(age) || age < 0 || age > 30) return 'Starost mora biti 0–30 godina.'
    if (form.weight) {
      const w = Number(form.weight)
      if (isNaN(w) || w < 0.1 || w > 150) return 'Težina mora biti 0.1–150 kg.'
    }
    return null
  }

  const createM = useMutation({
    mutationFn: () => {
      const err = validateDogForm()
      if (err) return Promise.reject(new Error(err))
      return createDog(buildFormData())
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myDogs'] }); closeForm() },
    onError: (e: Error) => Alert.alert('Greška', e.message || 'Nije moguće dodati psa.'),
  })

  const updateM = useMutation({
    mutationFn: () => {
      const err = validateDogForm()
      if (err) return Promise.reject(new Error(err))
      return updateDog(editingDog!.id, buildFormData())
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myDogs'] }); closeForm() },
    onError: (e: Error) => Alert.alert('Greška', e.message || 'Nije moguće sačuvati izmene.'),
  })

  const deleteM = useMutation({
    mutationFn: deleteDog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myDogs'] }),
  })

  const deleteImageM = useMutation({
    mutationFn: deleteDogImage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myDogs'] }),
  })

  const isPending = createM.isPending || updateM.isPending
  const filteredBreeds = PASMINE.filter(p => p.toLowerCase().includes(breedSearch.toLowerCase()))

  function handleSubmit() {
    if (!form.name.trim()) { Alert.alert('Greška', 'Unesite ime psa.'); return }
    if (!form.breed.trim()) { Alert.alert('Greška', 'Izaberi rasu.'); return }
    if (!form.age.trim()) { Alert.alert('Greška', 'Unesite starost psa.'); return }
    if (!form.size) { Alert.alert('Greška', 'Izaberi veličinu psa.'); return }
    if (!form.gender) { Alert.alert('Greška', 'Izaberi pol psa.'); return }
    if (editingDog) updateM.mutate()
    else createM.mutate()
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Moji psi</Text>
          {!isLoading && (
            <Text style={styles.headerSub}>
              {dogs.length} {dogs.length === 1 ? 'pas' : dogs.length < 5 ? 'psa' : 'pasa'} na profilu
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={formVisible ? styles.cancelBtn : styles.addBtn}
          onPress={formVisible ? closeForm : openCreate}
        >
          <Text style={formVisible ? styles.cancelBtnText : styles.addBtnText}>
            {formVisible ? '✕ Otkaži' : '+ Dodaj psa'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 8 }]}>
        {/* Form */}
        {formVisible && (
          <View style={styles.form}>
            <View style={[styles.formHeader, editingDog && { backgroundColor: '#f0fdf9' }]}>
              <Text style={styles.formTitle}>
                {editingDog ? `Izmena — ${editingDog.name}` : 'Dodaj novog psa'}
              </Text>
              <Text style={styles.formSub}>
                {editingDog ? 'Izmeni podatke i sačuvaj' : 'Popuni podatke o svom ljubimcu'}
              </Text>
            </View>

            <View style={styles.formBody}>
              {/* Ime + Starost */}
              <View style={styles.row2}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>IME PSA</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={v => setForm({ ...form, name: v })}
                    placeholder="Maks"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>STAROST (GOD.)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.age}
                    onChangeText={v => setForm({ ...form, age: v })}
                    placeholder="3"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Rasa */}
              <View>
                <Text style={styles.label}>RASA</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => { setBreedSearch(form.breed); setBreedModalVisible(true) }}
                >
                  <Text style={form.breed ? styles.inputText : styles.inputPlaceholder}>
                    {form.breed || 'Pretraži rasu...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Veličina + Pol */}
              <View style={styles.row2}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>VELIČINA</Text>
                  <TouchableOpacity style={styles.input} onPress={() => setSizeModalVisible(true)}>
                    <Text style={form.size ? styles.inputText : styles.inputPlaceholder}>
                      {SIZES.find(s => s.val === form.size)?.label ?? 'Izaberi...'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>POL</Text>
                  <View style={styles.toggleRow}>
                    {(['male', 'female'] as const).map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.toggleBtn, form.gender === g && styles.toggleBtnActive]}
                        onPress={() => setForm({ ...form, gender: g })}
                      >
                        <Text style={[styles.toggleBtnText, form.gender === g && styles.toggleBtnTextActive]}>
                          {g === 'male' ? '♂ Muški' : '♀ Ženski'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Kastriran */}
              <View style={[styles.switchRow, form.neutered && { backgroundColor: '#f0fdf9', borderColor: '#00BF8F' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Kastriran / sterilizovan</Text>
                  <Text style={styles.switchSub}>Pas je prošao kroz kastraciju ili sterilizaciju</Text>
                </View>
                <Switch
                  value={form.neutered}
                  onValueChange={v => setForm({ ...form, neutered: v })}
                  trackColor={{ true: '#00BF8F', false: '#e5e7eb' }}
                />
              </View>

              {/* Karakter */}
              <View>
                <Text style={styles.label}>KARAKTER</Text>
                <View style={styles.tagsWrap}>
                  {TEMPERAMENT_OPCIJE.map(t => {
                    const active = tempTags.includes(t)
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.tagBtn, active && styles.tagBtnActive]}
                        onPress={() => setTempTags(active ? tempTags.filter(x => x !== t) : [...tempTags, t])}
                      >
                        <Text style={[styles.tagBtnText, active && styles.tagBtnTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Napomene */}
              <View>
                <Text style={styles.label}>NAPOMENE</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={form.notes}
                  onChangeText={v => setForm({ ...form, notes: v })}
                  placeholder="Alergije, lekovi, strahovi, posebne navike..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Fotografija */}
              <View>
                <Text style={styles.label}>FOTOGRAFIJA (OPCIONO)</Text>
                <TouchableOpacity style={styles.photoArea} onPress={pickImage}>
                  {imageUri ? (
                    <View style={{ alignItems: 'center' }}>
                      <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                      <Text style={[styles.photoHint, { color: '#00BF8F', marginTop: 8 }]}>
                        Klikni za zamenu
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={{ fontSize: 32 }}>📸</Text>
                      <Text style={styles.photoHint}>Klikni da dodaš fotografiju</Text>
                      <Text style={[styles.photoHint, { color: '#aaa', fontSize: 12, marginTop: 2 }]}>
                        JPG, PNG — max 5MB
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, isPending && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingDog ? '✓ Sačuvaj izmene' : '+ Dodaj psa'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#00BF8F" />
          </View>
        )}

        {/* Empty */}
        {!isLoading && dogs.length === 0 && !formVisible && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>🐕</Text>
            <Text style={styles.emptyTitle}>Još nema dodatih pasa</Text>
            <Text style={styles.emptySub}>Dodaj profil svog psa da bi rezervisao šetača</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={openCreate}>
              <Text style={styles.submitBtnText}>+ Dodaj prvog psa</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dog list */}
        {dogs.map(dog => (
          <DogCard
            key={dog.id}
            dog={dog}
            onEdit={() => openEdit(dog)}
            onDelete={() => Alert.alert(
              `Obriši ${dog.name}?`,
              'Ova akcija se ne može poništiti.',
              [
                { text: 'Otkaži', style: 'cancel' },
                { text: 'Obriši', style: 'destructive', onPress: () => deleteM.mutate(dog.id) },
              ]
            )}
            onDeleteImage={() => Alert.alert(
              `Ukloni sliku za ${dog.name}?`,
              '',
              [
                { text: 'Otkaži', style: 'cancel' },
                { text: 'Ukloni', style: 'destructive', onPress: () => deleteImageM.mutate(dog.id) },
              ]
            )}
          />
        ))}
      </ScrollView>

      {/* Breed picker modal */}
      <Modal visible={breedModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBreedModalVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Izaberi rasu</Text>
            <TouchableOpacity onPress={() => setBreedModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              value={breedSearch}
              onChangeText={setBreedSearch}
              placeholder="Pretraži..."
              autoFocus
            />
          </View>
          <FlatList
            data={filteredBreeds}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.breedItem}
                onPress={() => { setForm({ ...form, breed: item }); setBreedModalVisible(false) }}
              >
                <Text style={[styles.breedItemText, form.breed === item && { color: '#00BF8F', fontWeight: '700' }]}>
                  {form.breed === item ? '✓ ' : ''}{item}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Nema rezultata</Text>}
          />
        </View>
      </Modal>

      {/* Size picker modal */}
      <Modal visible={sizeModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSizeModalVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Veličina psa</Text>
            <TouchableOpacity onPress={() => setSizeModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            {SIZES.map(s => (
              <TouchableOpacity
                key={s.val}
                style={[styles.sizeOption, form.size === s.val && { backgroundColor: '#f0fdf9', borderColor: '#00BF8F' }]}
                onPress={() => { setForm({ ...form, size: s.val }); setSizeModalVisible(false) }}
              >
                <Text style={[styles.sizeOptionText, form.size === s.val && { color: '#00BF8F', fontWeight: '700' }]}>
                  {form.size === s.val ? '✓ ' : ''}{s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </Animated.View>
  )
}

// ─── Stilovi ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginTop: 2 },
  addBtn: { backgroundColor: '#00BF8F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cancelBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  center: { padding: 40, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  emptyText: { padding: 16, color: '#9ca3af', textAlign: 'center' },

  // Form
  form: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  formHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#f9fafb' },
  formTitle: { fontSize: 16, fontWeight: '900', color: '#1a1a1a' },
  formSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  formBody: { padding: 16, gap: 16 },
  label: { fontSize: 11, fontWeight: '800', color: '#aaa', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
    fontSize: 15, color: '#1a1a1a',
  },
  inputText: { fontSize: 15, color: '#1a1a1a' },
  inputPlaceholder: { fontSize: 15, color: '#9ca3af' },
  textarea: { height: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#00BF8F', borderColor: '#00BF8F' },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  toggleBtnTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', gap: 12,
    backgroundColor: '#f9fafb',
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  switchSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  tagBtnActive: { backgroundColor: '#00BF8F', borderColor: '#00BF8F' },
  tagBtnText: { fontSize: 13, fontWeight: '500', color: '#4b5563' },
  tagBtnTextActive: { color: '#fff' },
  photoArea: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db',
    borderRadius: 16, paddingVertical: 28, alignItems: 'center', backgroundColor: '#fafafa',
  },
  photoPreview: { width: 100, height: 100, borderRadius: 14 },
  photoHint: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  submitBtn: { backgroundColor: '#00BF8F', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Dog card
  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardBanner: { height: 140, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cardBannerImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  sizeBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sizeBadgeText: { fontSize: 11, fontWeight: '800' },
  cardActions: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  cardActionBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  cardNameOverlay: { position: 'absolute', bottom: 10, left: 12 },
  cardName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  cardBreed: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  cardStats: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  cardStat: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  cardStatLabel: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  cardStatValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#f0fdf9', borderWidth: 1, borderColor: '#bbf7d0' },
  tagText: { fontSize: 11, fontWeight: '600' },
  cardNotes: { marginHorizontal: 12, marginBottom: 12, backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  cardNotesText: { fontSize: 12, color: '#92400e' },

  // Modal / bottom sheet
  modal: { flex: 1, backgroundColor: '#fff' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  modalClose: { fontSize: 15, color: '#00BF8F', fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 13, color: '#374151', fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  breedItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  breedItemText: { fontSize: 15, color: '#374151' },
  sizeOption: { paddingHorizontal: 16, paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 10 },
  sizeOptionText: { fontSize: 15, color: '#374151', fontWeight: '500' },
})
