import { BACKEND_URL } from '../config'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyDogs, createDog, deleteDog } from '../api/dogs'
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
  'Američki Bul Terijer', 'Stafordširski Bul Terijer', 'Akita', 'Samojeد',
  'Bernski Planinski Pas', 'Njufaundlend', 'Irski Seter', 'Vizla', 'Maltezer',
  'Bišon Frize', 'Kavapoo', 'Džek Rasel Terijer', 'Minijaturni Šnaucer',
  'Pirinesjki Planinski Pas', 'Malamut', 'Dogo Argentino', 'Kan Korso',
  'Belgijski Malinoa', 'Bulmastif', 'Mešanac', 'Ostalo',
]

const TEMPERAMENT_OPCIJE = [
  'Miran', 'Energičan', 'Društven', 'Igriva', 'Nežan', 'Poslušan',
  'Dobar sa decom', 'Dobar sa psima', 'Stidljiv', 'Dominantan',
  'Teritorijalan', 'Zaštitarski', 'Radoznao', 'Samostalan',
]

const VELICINA: Record<string, { label: string; bg: string; color: string }> = {
  small:  { label: 'Mali (do 10kg)',   bg: '#f0fdf9', color: '#059669' },
  medium: { label: 'Srednji (10-25kg)', bg: '#fffbeb', color: '#92400e' },
  large:  { label: 'Veliki (25kg+)',    bg: '#eff6ff', color: '#1d4ed8' },
}

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
const inpFocus = { borderColor: '#00BF8F', boxShadow: '0 0 0 3px rgba(0,191,143,0.10)' }
const inpBlur = { borderColor: '#e5e7eb', boxShadow: '' }

export default function MojiPsiPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [breedOpen, setBreedOpen] = useState(false)
  const [tempTags, setTempTags] = useState<string[]>([])

  const { data: dogs, isLoading } = useQuery<Dog[]>({ queryKey: ['myDogs'], queryFn: getMyDogs })

  const createM = useMutation({
    mutationFn: (data: typeof form) => {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)))
      fd.set('temperament', tempTags.join(', '))
      if (image) fd.append('image', image)
      return createDog(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDogs'] })
      setForm(initialForm); setImage(null); setImagePreview(null); setShowForm(false)
      setBreedOpen(false); setTempTags([])
    },
  })

  const deleteM = useMutation({
    mutationFn: deleteDog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myDogs'] }),
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Moji psi</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {dogs ? `${dogs.length} ${dogs.length === 1 ? 'pas' : 'pasa'} na profilu` : ''}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
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

        {/* Forma za dodavanje */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-black text-gray-900">Novi pas</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([['name', 'Ime psa', 'Maks', 'text'], ['age', 'Starost (godine)', '3', 'number']] as const).map(([key, label, ph, type]) => (
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

              {/* Rasa — padajući meni */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Rasa</label>
                <input
                  type="text"
                  value={form.breed}
                  onChange={e => { setForm({ ...form, breed: e.target.value }); setBreedOpen(true) }}
                  onFocus={e => { setBreedOpen(true); Object.assign(e.target.style, inpFocus) }}
                  onBlur={e => { setTimeout(() => setBreedOpen(false), 150); Object.assign(e.target.style, inpBlur) }}
                  placeholder="Pretraži rasu..."
                  className={inp}
                  autoComplete="off"
                />
                {breedOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {PASMINE.filter(p => p.toLowerCase().includes(form.breed.toLowerCase())).map(p => (
                      <button
                        key={p}
                        type="button"
                        onMouseDown={() => { setForm({ ...form, breed: p }); setBreedOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                    {PASMINE.filter(p => p.toLowerCase().includes(form.breed.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400">Nema rezultata</div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Veličina</label>
                  <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className={inp}>
                    <option value="small">Mali (do 10kg)</option>
                    <option value="medium">Srednji (10-25kg)</option>
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

              {/* Temperament — višestruki izbor */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Temperament {tempTags.length > 0 && <span className="normal-case font-normal text-gray-400">({tempTags.length} izabrano)</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {TEMPERAMENT_OPCIJE.map(t => {
                    const active = tempTags.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTempTags(active ? tempTags.filter(x => x !== t) : [...tempTags, t])}
                        className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                        style={active
                          ? { backgroundColor: '#00BF8F', color: 'white', borderColor: '#00BF8F' }
                          : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Napomene</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                  rows={2} placeholder="Alergije, lekovi, strahovi..."
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpBlur)} />
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <input type="checkbox" checked={form.neutered}
                  onChange={e => setForm({ ...form, neutered: e.target.checked })}
                  className="w-4 h-4 rounded" style={{ accentColor: '#00BF8F' }} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Kastriran / sterilizovan</div>
                  <div className="text-xs text-gray-400">Označi ako je pas kastriran</div>
                </div>
              </label>

              {/* Fotografija */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Fotografija <span className="font-normal normal-case text-gray-400">(opciono)</span>
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center py-7 px-4 text-center"
                  style={{ borderColor: imagePreview ? '#00BF8F' : '#d1d5db', backgroundColor: imagePreview ? '#f0fdf9' : '#fafafa' }}
                  onMouseEnter={e => { if (!imagePreview) e.currentTarget.style.borderColor = '#00BF8F'; e.currentTarget.style.backgroundColor = '#f0fdf9' }}
                  onMouseLeave={e => { if (!imagePreview) { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.backgroundColor = '#fafafa' } }}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="" className="w-28 h-28 rounded-2xl object-cover mb-3 shadow-sm" />
                      <p className="text-sm font-semibold text-[#00BF8F]">Slika izabrana ✓</p>
                      <p className="text-xs text-gray-400 mt-0.5">{image?.name}</p>
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

              <button onClick={() => createM.mutate(form)} disabled={createM.isPending}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#00BF8F' }}>
                {createM.isPending ? 'Čuvanje...' : 'Sačuvaj psa'}
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden"
                style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.06)' }}>
                <div className="h-16 bg-gray-100 border-b border-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && dogs?.length === 0 && !showForm && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🐕</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Još nema dodatih pasa</h3>
            <p className="text-gray-400 text-sm mb-6">Dodaj profil svog psa da bi rezervisao šetača</p>
            <button onClick={() => setShowForm(true)}
              className="font-semibold text-white px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-all"
              style={{ backgroundColor: '#1f2937' }}>
              + Dodaj prvog psa
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {dogs?.map(dog => (
            <div key={dog.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  {dog.image
                    ? <img src={`${BACKEND_URL}${dog.image}`} alt={dog.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl">🐕</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900">{dog.name}</h3>
                  <p className="text-sm text-gray-400 truncate">{dog.breed}</p>
                </div>
                <button
                  onClick={() => { if (confirm(`Obriši ${dog.name}?`)) deleteM.mutate(dog.id) }}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 text-sm"
                >
                  🗑
                </button>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-gray-50 rounded-xl py-2 border border-gray-100">
                    <div className="text-sm font-black text-gray-900">{dog.age}</div>
                    <div className="text-xs text-gray-400">god</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl py-2 border border-gray-100">
                    <div className="text-sm font-black text-gray-900">{dog.gender === 'male' ? '♂' : '♀'}</div>
                    <div className="text-xs text-gray-400">{dog.gender === 'male' ? 'Muški' : 'Ženski'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl py-2 border border-gray-100">
                    <div className="text-sm font-black text-gray-900">{dog.neutered ? '✓' : '✗'}</div>
                    <div className="text-xs text-gray-400">Kastrat</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium border"
                    style={{ backgroundColor: VELICINA[dog.size]?.bg, color: VELICINA[dog.size]?.color, borderColor: 'transparent' }}>
                    {VELICINA[dog.size]?.label}
                  </span>
                </div>

                {dog.temperament && (
                  <p className="mt-2.5 text-sm text-gray-600">
                    <span className="font-semibold text-gray-700">Temperament: </span>{dog.temperament}
                  </p>
                )}
                {dog.notes && (
                  <div className="mt-2 text-xs rounded-xl px-3 py-2 border"
                    style={{ backgroundColor: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }}>
                    Napomena: {dog.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
