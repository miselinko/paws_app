import { imgUrl } from '../config'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyDogs, createDog, updateDog, deleteDog, deleteDogImage } from '../api/dogs'
import Reveal from '../components/Reveal'
import type { Dog } from '../types'

const initialForm = {
  name: '', breed: '', age: '', size: 'medium',
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

const DOG_COLORS = ['#00BF8F', '#FAAB43', '#6366f1', '#ec4899', '#0ea5e9']

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
const inpFocus = { borderColor: '#00BF8F', boxShadow: '0 0 0 3px rgba(0,191,143,0.10)' }
const inpBlur  = { borderColor: '#e5e7eb', boxShadow: '' }

function DogCard({
  dog, editing, onEdit, onDelete, onDeleteImage,
}: {
  dog: Dog
  editing: boolean
  onEdit: () => void
  onDelete: () => void
  onDeleteImage: () => void
}) {
  const sz = SIZE_SR[dog.size]
  const bgColor = DOG_COLORS[dog.id % DOG_COLORS.length]

  return (
    <div
      className="bg-white rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-0.5 group border border-gray-100"
      style={{
        boxShadow: editing
          ? '0 0 0 2px #00BF8F, 0 4px 16px rgba(0,191,143,0.12)'
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { if (!editing) e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = editing ? '0 0 0 2px #00BF8F, 0 4px 16px rgba(0,191,143,0.12)' : '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Photo */}
      <div className="relative h-36 overflow-hidden bg-gray-100">
        {dog.image ? (
          <img
            src={imgUrl(dog.image)}
            alt={dog.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
            <span className="text-white text-4xl font-black opacity-90">{dog.name[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Size badge */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-bold"
          style={{ backgroundColor: sz.bg, color: sz.color }}>
          {sz.short}
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {dog.image && (
            <button
              onClick={onDeleteImage}
              className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center text-sm hover:bg-red-50 transition-all"
              title="Ukloni sliku"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </button>
          )}
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
            style={editing
              ? { backgroundColor: '#00BF8F', color: 'white' }
              : { backgroundColor: 'rgba(255,255,255,0.9)', color: '#374151' }}
            title={editing ? 'Zatvori' : 'Izmeni'}
          >
            {editing ? '✕' : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>}
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center text-sm hover:bg-red-50 transition-all"
            title="Obriši"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
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
          {dog.notes}
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; type: 'dog' | 'image' } | null>(null)

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
      size: dog.size,
      gender: dog.gender,
      neutered: dog.neutered,
      temperament: dog.temperament ?? '',
      notes: dog.notes ?? '',
    })
    setTempTags(dog.temperament ? dog.temperament.split(',').map(t => t.trim()).filter(Boolean) : [])
    setImage(null)
    setImagePreview(dog.image ? imgUrl(dog.image) ?? null : null)
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

  const deleteImageM = useMutation({
    mutationFn: deleteDogImage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myDogs'] }),
  })

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Ime je obavezno'
    else if (form.name.trim().length > 50) errors.name = 'Ime ne sme imati više od 50 karaktera'
    if (!form.breed.trim()) errors.breed = 'Rasa je obavezna'
    else if (form.breed.trim().length > 50) errors.breed = 'Rasa ne sme imati više od 50 karaktera'
    if (!form.age) errors.age = 'Starost je obavezna'
    else if (Number(form.age) < 0 || Number(form.age) > 30) errors.age = 'Starost mora biti između 0 i 30'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleSubmit() {
    if (!validateForm()) return
    if (editingDog) updateM.mutate()
    else createM.mutate()
  }

  const isPending = createM.isPending || updateM.isPending

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="py-6 sm:py-8 px-4" style={{ backgroundColor: '#f8faf9' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Moji psi</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {dogs ? `${dogs.length} ${dogs.length === 1 ? 'pas' : 'pasa'} na profilu` : ''}
            </p>
          </div>
          <button
            onClick={showForm ? closeForm : openCreate}
            className="text-sm font-bold px-4 py-2.5 rounded-lg transition-all"
            style={showForm
              ? { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
              : { backgroundColor: '#1f2937', color: 'white' }}
          >
            {showForm ? '× Otkaži' : '+ Dodaj psa'}
          </button>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Form */}
        {showForm && (
          <div
            className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', animation: 'slideDown 0.25s ease' }}
          >
            <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:none } }`}</style>

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{ background: editingDog ? 'linear-gradient(135deg,#f0fdf9,#ecfdf5)' : '#f9fafb' }}>
              <div>
                <h2 className="font-black text-gray-900">
                  {editingDog ? `Izmena - ${editingDog.name}` : 'Dodaj novog psa'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingDog ? 'Izmeni podatke i sačuvaj' : 'Popuni podatke o svom ljubimcu'}
                </p>
              </div>
              {editingDog && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                  Izmena
                </span>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Name, age */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ime psa</label>
                  <input type="text" value={form.name} maxLength={50}
                    onChange={e => { setForm({ ...form, name: e.target.value }); setFormErrors(err => { const { name, ...rest } = err; return rest }) }}
                    placeholder="Maks" className={inp}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => Object.assign(e.target.style, inpBlur)} />
                  {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Starost (god.)</label>
                  <input type="number" value={form.age} min={0} max={30} step={1}
                    onChange={e => { setForm({ ...form, age: e.target.value }); setFormErrors(err => { const { age, ...rest } = err; return rest }) }}
                    placeholder="3" className={inp}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => Object.assign(e.target.style, inpBlur)} />
                  {formErrors.age && <p className="text-xs text-red-500 mt-1">{formErrors.age}</p>}
                </div>
              </div>

              {/* Breed */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Rasa</label>
                <input
                  type="text" value={form.breed} autoComplete="off" maxLength={50} className={inp}
                  onChange={e => { setForm({ ...form, breed: e.target.value }); setBreedOpen(true); setFormErrors(err => { const { breed, ...rest } = err; return rest }) }}
                  onFocus={e => { setBreedOpen(true); Object.assign(e.target.style, inpFocus) }}
                  onBlur={e => { setTimeout(() => setBreedOpen(false), 150); Object.assign(e.target.style, inpBlur) }}
                  placeholder="Pretraži rasu..."
                />
                {formErrors.breed && <p className="text-xs text-red-500 mt-1">{formErrors.breed}</p>}
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
                  className="border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center py-8 px-4 text-center"
                  style={{ borderColor: imagePreview ? '#00BF8F' : '#d1d5db', backgroundColor: imagePreview ? '#f0fdf9' : '#fafafa' }}
                  onMouseEnter={e => { if (!imagePreview) e.currentTarget.style.borderColor = '#00BF8F'; e.currentTarget.style.backgroundColor = '#f0fdf9' }}
                  onMouseLeave={e => { if (!imagePreview) { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.backgroundColor = '#fafafa' } }}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="" className="w-28 h-28 rounded-xl object-cover mb-3 shadow-sm" />
                      <p className="text-sm font-semibold" style={{ color: '#00BF8F' }}>
                        {image ? 'Nova slika izabrana ✓' : 'Trenutna fotografija'}
                      </p>
                      {image && <p className="text-xs text-gray-400 mt-0.5">{image.name}</p>}
                      <p className="text-xs text-gray-400 mt-2 underline">Klikni za zamenu</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-3 text-gray-400">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Klikni da dodaš fotografiju</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG - max 5MB</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return
                  setImage(f); setImagePreview(URL.createObjectURL(f))
                }} />
              </div>

              <button
                onClick={handleSubmit}
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
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F' }}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="8" cy="6" rx="2" ry="2.5"/><ellipse cx="16" cy="6" rx="2" ry="2.5"/><ellipse cx="4.5" cy="12" rx="2" ry="2.5"/><ellipse cx="19.5" cy="12" rx="2" ry="2.5"/><path d="M12 22c-3.5 0-6-2.2-6-5 0-2.5 2-4.5 3.5-6 .7-.7 1.5-1 2.5-1s1.8.3 2.5 1c1.5 1.5 3.5 3.5 3.5 6 0 2.8-2.5 5-6 5z"/></svg>
            </div>
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
                onDelete={() => setDeleteConfirm({ id: dog.id, name: dog.name, type: 'dog' })}
                onDeleteImage={() => setDeleteConfirm({ id: dog.id, name: dog.name, type: 'image' })}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {deleteConfirm.type === 'dog' ? 'Obriši psa?' : 'Ukloni sliku?'}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {deleteConfirm.type === 'dog'
                ? `Da li si siguran/na da želiš da obrišeš ${deleteConfirm.name}? Ova akcija se ne može poništiti.`
                : `Da li si siguran/na da želiš da ukloniš sliku za ${deleteConfirm.name}?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
                Otkaži
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'dog') deleteM.mutate(deleteConfirm.id)
                  else deleteImageM.mutate(deleteConfirm.id)
                  setDeleteConfirm(null)
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#ef4444' }}>
                {deleteConfirm.type === 'dog' ? 'Obriši' : 'Ukloni'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
