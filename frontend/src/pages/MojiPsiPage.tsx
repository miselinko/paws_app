import { BACKEND_URL } from '../config'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyDogs, createDog, updateDog, deleteDog } from '../api/dogs'
import Reveal from '../components/Reveal'
import type { Dog } from '../types'

const initialForm = {
  name: '', breed: '', age: '', weight: '', size: 'medium',
  gender: 'male', neutered: false, temperament: '', notes: '',
}

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

const SIZE_SR: Record<string, { label: string; short: string; bg: string; color: string }> = {
  small:  { label: 'Mali (do 10kg)',    short: 'Mali',    bg: '#f0fdf9', color: '#059669' },
  medium: { label: 'Srednji (10–25kg)', short: 'Srednji', bg: '#fffbeb', color: '#b45309' },
  large:  { label: 'Veliki (25kg+)',    short: 'Veliki',  bg: '#eff6ff', color: '#1d4ed8' },
}

const GRAD_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-cyan-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
]

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
const inpFocus = { borderColor: '#00BF8F', boxShadow: '0 0 0 3px rgba(0,191,143,0.10)' }
const inpBlur  = { borderColor: '#e5e7eb', boxShadow: '' }

function DogCard({
  dog, editing, onEdit, onDelete,
}: {
  dog: Dog
  editing: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const sz = SIZE_SR[dog.size]
  const gradColor = GRAD_COLORS[dog.id % GRAD_COLORS.length]

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 group"
      style={{
        boxShadow: editing
          ? '0 0 0 2px #00BF8F, 0 8px 24px rgba(0,191,143,0.15)'
          : '0 2px 12px rgba(71,71,71,0.09)',
      }}
      onMouseEnter={e => { if (!editing) e.currentTarget.style.boxShadow = '0 8px 24px rgba(71,71,71,0.16)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = editing ? '0 0 0 2px #00BF8F, 0 8px 24px rgba(0,191,143,0.15)' : '0 2px 12px rgba(71,71,71,0.09)' }}
    >
      {/* Photo / gradient banner */}
      <div className="relative h-36 overflow-hidden">
        {dog.image ? (
          <img
            src={`${BACKEND_URL}${dog.image}`}
            alt={dog.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradColor} flex items-center justify-center`}>
            <span className="text-6xl opacity-80">🐕</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Size badge */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-bold"
          style={{ backgroundColor: sz.bg, color: sz.color }}>
          {sz.short}
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
            style={editing
              ? { backgroundColor: '#00BF8F', color: 'white' }
              : { backgroundColor: 'rgba(255,255,255,0.9)', color: '#374151' }}
            title={editing ? 'Zatvori' : 'Izmeni'}
          >
            {editing ? '✕' : '✏️'}
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center text-sm hover:bg-red-50 transition-all"
            title="Obriši"
          >
            🗑
          </button>
        </div>

        {/* Name on photo */}
        <div className="absolute bottom-2.5 left-3">
          <p className="text-white font-black text-lg leading-tight drop-shadow-sm">{dog.name}</p>
          <p className="text-white/80 text-xs font-medium">{dog.breed}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Starost', value: `${dog.age} god.` },
          { label: 'Težina', value: dog.weight ? `${dog.weight} kg` : '—' },
          { label: 'Pol', value: dog.gender === 'male' ? '♂ Muški' : '♀ Ženski' },
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 py-3 text-center">
            <div className="text-xs text-gray-400 mb-0.5">{label}</div>
            <div className="text-sm font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        {dog.neutered && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: '#f0fdf9', color: '#059669', border: '1px solid #bbf7d0' }}>
            ✓ Kastriran
          </span>
        )}
        {dog.temperament && dog.temperament.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3).map(t => (
          <span key={t} className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>
            {t}
          </span>
        ))}
        {dog.temperament && dog.temperament.split(',').filter(Boolean).length > 3 && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
            +{dog.temperament.split(',').filter(Boolean).length - 3}
          </span>
        )}
      </div>

      {dog.notes && (
        <div className="mx-4 mb-4 text-xs rounded-xl px-3 py-2"
          style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
          📝 {dog.notes}
        </div>
      )}
    </div>
  )
}

export default function MojiPsiPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm]     = useState(false)
  const [editingDog, setEditingDog] = useState<Dog | null>(null)
  const [form, setForm]             = useState(initialForm)
  const [image, setImage]           = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [breedOpen, setBreedOpen]   = useState(false)
  const [tempTags, setTempTags]     = useState<string[]>([])

  const { data: dogs, isLoading } = useQuery<Dog[]>({ queryKey: ['myDogs'], queryFn: getMyDogs })

  function openCreate() {
    setEditingDog(null)
    setForm(initialForm)
    setTempTags([])
    setImage(null)
    setImagePreview(null)
    setShowForm(true)
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
      temperament: dog.temperament ?? '',
      notes: dog.notes ?? '',
    })
    setTempTags(dog.temperament ? dog.temperament.split(',').map(t => t.trim()).filter(Boolean) : [])
    setImage(null)
    setImagePreview(dog.image ? `${BACKEND_URL}${dog.image}` : null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setShowForm(false)
    setEditingDog(null)
    setForm(initialForm)
    setTempTags([])
    setImage(null)
    setImagePreview(null)
  }

  function buildFormData() {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
    fd.set('temperament', tempTags.join(', '))
    if (image) fd.append('image', image)
    return fd
  }

  const createM = useMutation({
    mutationFn: () => createDog(buildFormData()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myDogs'] }); closeForm() },
  })

  const updateM = useMutation({
    mutationFn: () => updateDog(editingDog!.id, buildFormData()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myDogs'] }); closeForm() },
  })

  const deleteM = useMutation({
    mutationFn: deleteDog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myDogs'] }),
  })

  const isPending = createM.isPending || updateM.isPending

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Moji psi</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {dogs ? `${dogs.length} ${dogs.length === 1 ? 'pas' : 'pasa'} na profilu` : ''}
            </p>
          </div>
          <button
            onClick={showForm ? closeForm : openCreate}
            className="text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
            style={showForm
              ? { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
              : { backgroundColor: '#1f2937', color: 'white' }}
          >
            {showForm ? '✕ Otkaži' : '+ Dodaj psa'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Form */}
        {showForm && (
          <div
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', animation: 'slideDown 0.25s ease' }}
          >
            <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:none } }`}</style>

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{ background: editingDog ? 'linear-gradient(135deg,#f0fdf9,#ecfdf5)' : '#f9fafb' }}>
              <div>
                <h2 className="font-black text-gray-900">
                  {editingDog ? `Izmena — ${editingDog.name}` : 'Dodaj novog psa'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingDog ? 'Izmeni podatke i sačuvaj' : 'Popuni podatke o svom ljubimcu'}
                </p>
              </div>
              {editingDog && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                  ✏️ Izmena
                </span>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Name, age, weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([['name', 'Ime psa', 'Maks', 'text'], ['age', 'Starost (god.)', '3', 'number'], ['weight', 'Težina (kg)', '15', 'number']] as const).map(([key, label, ph, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                    <input type={type} value={String(form[key as keyof typeof form])}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      placeholder={ph} className={inp}
                      onFocus={e => Object.assign(e.target.style, inpFocus)}
                      onBlur={e => Object.assign(e.target.style, inpBlur)} />
                  </div>
                ))}
              </div>

              {/* Breed */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Rasa</label>
                <input
                  type="text" value={form.breed} autoComplete="off" className={inp}
                  onChange={e => { setForm({ ...form, breed: e.target.value }); setBreedOpen(true) }}
                  onFocus={e => { setBreedOpen(true); Object.assign(e.target.style, inpFocus) }}
                  onBlur={e => { setTimeout(() => setBreedOpen(false), 150); Object.assign(e.target.style, inpBlur) }}
                  placeholder="Pretraži rasu..."
                />
                {breedOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {PASMINE.filter(p => p.toLowerCase().includes(form.breed.toLowerCase())).map(p => (
                      <button key={p} type="button"
                        onMouseDown={() => { setForm({ ...form, breed: p }); setBreedOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                        {p}
                      </button>
                    ))}
                    {PASMINE.filter(p => p.toLowerCase().includes(form.breed.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400">Nema rezultata</div>
                    )}
                  </div>
                )}
              </div>

              {/* Size & gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Veličina</label>
                  <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className={inp}>
                    <option value="small">Mali (do 10kg)</option>
                    <option value="medium">Srednji (10–25kg)</option>
                    <option value="large">Veliki (25kg+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pol</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inp}>
                    <option value="male">Muški</option>
                    <option value="female">Ženski</option>
                  </select>
                </div>
              </div>

              {/* Neutered toggle */}
              <label className="flex items-center gap-3 cursor-pointer rounded-xl p-3.5 border transition-all"
                style={form.neutered
                  ? { backgroundColor: '#f0fdf9', borderColor: '#00BF8F' }
                  : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                <input type="checkbox" checked={form.neutered}
                  onChange={e => setForm({ ...form, neutered: e.target.checked })}
                  className="w-4 h-4 rounded" style={{ accentColor: '#00BF8F' }} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Kastriran / sterilizovan</div>
                  <div className="text-xs text-gray-400">Pas je prošao kroz kastraciju ili sterilizaciju</div>
                </div>
              </label>

              {/* Temperament */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Karakter <span className="font-normal normal-case text-gray-400">(izaberi sve što odgovara)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TEMPERAMENT_OPCIJE.map(t => {
                    const active = tempTags.includes(t)
                    return (
                      <button key={t} type="button"
                        onClick={() => setTempTags(active ? tempTags.filter(x => x !== t) : [...tempTags, t])}
                        className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                        style={active
                          ? { backgroundColor: '#00BF8F', color: 'white', borderColor: '#00BF8F' }
                          : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Napomene</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                  rows={2} placeholder="Alergije, lekovi, strahovi, posebne navike..."
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpBlur)} />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Fotografija <span className="font-normal normal-case text-gray-400">(opciono)</span>
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center py-8 px-4 text-center"
                  style={{ borderColor: imagePreview ? '#00BF8F' : '#d1d5db', backgroundColor: imagePreview ? '#f0fdf9' : '#fafafa' }}
                  onMouseEnter={e => { if (!imagePreview) e.currentTarget.style.borderColor = '#00BF8F'; e.currentTarget.style.backgroundColor = '#f0fdf9' }}
                  onMouseLeave={e => { if (!imagePreview) { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.backgroundColor = '#fafafa' } }}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="" className="w-28 h-28 rounded-2xl object-cover mb-3 shadow-sm" />
                      <p className="text-sm font-semibold" style={{ color: '#00BF8F' }}>
                        {image ? 'Nova slika izabrana ✓' : 'Trenutna fotografija'}
                      </p>
                      {image && <p className="text-xs text-gray-400 mt-0.5">{image.name}</p>}
                      <p className="text-xs text-gray-400 mt-2 underline">Klikni za zamenu</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mb-3">📸</div>
                      <p className="text-sm font-semibold text-gray-700">Klikni da dodaš fotografiju</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 5MB</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return
                  setImage(f); setImagePreview(URL.createObjectURL(f))
                }} />
              </div>

              <button
                onClick={() => editingDog ? updateM.mutate() : createM.mutate()}
                disabled={isPending}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-98 disabled:opacity-40"
                style={{ backgroundColor: '#00BF8F' }}>
                {isPending ? 'Čuvanje...' : editingDog ? '✓ Sačuvaj izmene' : '+ Dodaj psa'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse"
                style={{ boxShadow: '0 2px 12px rgba(71,71,71,0.07)' }}>
                <div className="h-36 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && dogs?.length === 0 && !showForm && (
          <div className="text-center py-28">
            <div className="text-6xl mb-4">🐕</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Još nema dodatih pasa</h3>
            <p className="text-gray-400 text-sm mb-6">Dodaj profil svog psa da bi rezervisao šetača</p>
            <button onClick={openCreate}
              className="font-bold text-white px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-all"
              style={{ backgroundColor: '#00BF8F' }}>
              + Dodaj prvog psa
            </button>
          </div>
        )}

        {/* Dog grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          {dogs?.map((dog, idx) => (
            <Reveal key={dog.id} delay={Math.min(idx % 2, 1) * 80}>
              <DogCard
                dog={dog}
                editing={editingDog?.id === dog.id}
                onEdit={() => editingDog?.id === dog.id ? closeForm() : openEdit(dog)}
                onDelete={() => { if (confirm(`Obriši ${dog.name}?`)) deleteM.mutate(dog.id) }}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
