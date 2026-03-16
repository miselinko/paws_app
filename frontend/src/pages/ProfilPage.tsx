import { BACKEND_URL } from '../config'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyProfile, updateMyProfile, updateWalkerProfile, uploadProfileImage } from '../api/users'
import { useAuth } from '../context/AuthContext'
import AdresaInput from '../components/AdresaInput'

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
const inpFocus = { borderColor: '#00BF8F', boxShadow: '0 0 0 3px rgba(0,191,143,0.10)' }
const inpBlur = { borderColor: '#e5e7eb', boxShadow: '' }

export default function ProfilPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getMyProfile })

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', address: '',
    lat: null as number | null, lng: null as number | null,
  })
  type DaySchedule = { active: boolean; from: string; to: string }
  const defaultAvailability = (): Record<string, DaySchedule> =>
    Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), { active: true, from: '08:00', to: '20:00' }]))

  const [walkerForm, setWalkerForm] = useState({
    hourly_rate: '' as string | number,
    services: 'both' as 'walking' | 'boarding' | 'both',
    bio: '',
    active: true,
    availability: defaultAvailability() as Record<string, DaySchedule>,
  })

  useEffect(() => {
    if (profile) {
      setForm({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone, address: profile.address, lat: profile.lat, lng: profile.lng })
      if (profile.walker_profile) {
        const a = profile.walker_profile.availability
        setWalkerForm({
          hourly_rate: profile.walker_profile.hourly_rate === 0 ? '' : profile.walker_profile.hourly_rate,
          services: profile.walker_profile.services,
          bio: profile.walker_profile.bio,
          active: profile.walker_profile.active,
          availability: (a && Object.keys(a).length > 0) ? a : defaultAvailability(),
        })
      }
    }
  }, [profile])

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const updateM = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash() },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: unknown } }
      console.error('Error saving profile:', err?.response?.data)
    },
  })
  const updateWalkerM = useMutation({ mutationFn: updateWalkerProfile, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash() } })
  const imageM = useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash() },
  })

  if (!profile) return (
    <div className="flex justify-center items-center min-h-96">
      <svg className="animate-spin w-8 h-8" style={{ color: '#00BF8F' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-5">
            {/* Avatar upload zone */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="relative">
                {profile.profile_image ? (
                  <img src={`${BACKEND_URL}${profile.profile_image}`} alt={profile.first_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }} />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white"
                    style={{ backgroundColor: '#00BF8F', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                )}
                {/* Camera badge */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-sm cursor-pointer shadow-sm"
                  style={{ fontSize: '14px' }}>
                  📷
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageM.isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:border-[#00BF8F] hover:text-[#00BF8F]"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
              >
                {imageM.isPending ? 'Učitavam...' : 'Promeni sliku'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) imageM.mutate(f) }} />
            </div>

            <div>
              <h1 className="text-xl font-black text-gray-900">{profile.first_name} {profile.last_name}</h1>
              <p className="text-gray-400 text-sm">{profile.email}</p>
              <span className="inline-block mt-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                style={profile.role === 'owner'
                  ? { backgroundColor: '#dbeafe', color: '#1e40af' }
                  : { backgroundColor: '#d1fae5', color: '#065f46' }}>
                {profile.role === 'owner' ? '🏠 Vlasnik psa' : '🦮 Šetač / Čuvar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-3 flex items-center gap-2 text-sm font-medium">
            ✓ Izmene sačuvane
          </div>
        )}

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
            <h2 className="font-black text-gray-900">Osnovni podaci</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(['first_name', 'last_name'] as const).map(k => (
                <div key={k}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{k === 'first_name' ? 'Ime' : 'Prezime'}</label>
                  <input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    className={inp}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => Object.assign(e.target.style, inpBlur)} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Broj telefona</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+381 63 123 4567" className={inp}
                onFocus={e => Object.assign(e.target.style, inpFocus)}
                onBlur={e => Object.assign(e.target.style, inpBlur)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Adresa</label>
              <AdresaInput
                value={form.address}
                placeholder="npr. Bulevar Oslobođenja 12, Novi Sad"
                onChange={(address, lat, lng) => setForm(f => ({
                  ...f,
                  address,
                  lat: lat !== undefined ? lat : null,
                  lng: lng !== undefined ? lng : null,
                }))}
              />
              {form.lat && form.lng && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Lokacija potvrđena: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}
                </p>
              )}
            </div>

            <button onClick={() => updateM.mutate(form)} disabled={updateM.isPending}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#1f2937' }}>
              {updateM.isPending ? 'Čuvanje...' : 'Sačuvaj izmene'}
            </button>
          </div>
        </div>

        {/* Walker profile */}
        {user?.role === 'walker' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.07)' }}>
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900">🦮 Profil šetača</h2>
                <p className="text-xs text-gray-400">Vidljivo vlasnicima pasa</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{walkerForm.active ? 'Aktivan' : 'Neaktivan'}</span>
                <div
                  onClick={() => setWalkerForm({ ...walkerForm, active: !walkerForm.active })}
                  className="w-10 h-6 rounded-full cursor-pointer transition-all relative"
                  style={{ backgroundColor: walkerForm.active ? '#00BF8F' : '#d1d5db' }}
                >
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: walkerForm.active ? '22px' : '4px' }} />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cena po satu (RSD)</label>
                <input type="number" min="0" value={walkerForm.hourly_rate}
                  onChange={e => setWalkerForm({ ...walkerForm, hourly_rate: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="npr. 1500" className={inp}
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpBlur)} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Usluge</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'walking', icon: '🦮', label: 'Šetanje' },
                    { val: 'boarding', icon: '🏠', label: 'Čuvanje' },
                    { val: 'both', icon: '🐾', label: 'Sve usluge' },
                  ].map(u => (
                    <button key={u.val} type="button"
                      onClick={() => setWalkerForm({ ...walkerForm, services: u.val as typeof walkerForm.services })}
                      className="flex items-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all"
                      style={walkerForm.services === u.val
                        ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9', color: '#059669' }
                        : { borderColor: '#e5e7eb', color: '#4b5563' }}>
                      {u.icon} {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">O meni</label>
                <textarea value={walkerForm.bio} onChange={e => setWalkerForm({ ...walkerForm, bio: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                  rows={4} placeholder="Kratko se predstavi, iskustvo sa psima..."
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpBlur)} />
              </div>

              {/* Availability schedule */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Raspored dostupnosti</label>
                {(() => {
                  const DAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
                  const TIMES = Array.from({ length: 32 }, (_, i) => {
                    const h = Math.floor(i / 2) + 6
                    const m = i % 2 === 0 ? '00' : '30'
                    return `${String(h).padStart(2, '0')}:${m}`
                  })
                  return (
                    <div className="space-y-2">
                      {DAYS.map((day, idx) => {
                        const key = String(idx)
                        const sch = walkerForm.availability[key] ?? { active: true, from: '08:00', to: '20:00' }
                        return (
                          <div key={key} className="flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-all"
                            style={{ borderColor: sch.active ? '#bbf7d0' : '#e5e7eb', backgroundColor: sch.active ? '#f0fdf9' : '#f9fafb' }}>
                            {/* Day name */}
                            <span className="text-xs font-black w-7 shrink-0" style={{ color: sch.active ? '#059669' : '#9ca3af' }}>{day}</span>
                            {/* Toggle */}
                            <div
                              onClick={() => setWalkerForm(f => ({ ...f, availability: { ...f.availability, [key]: { ...sch, active: !sch.active } } }))}
                              className="w-9 h-5 rounded-full cursor-pointer transition-all relative shrink-0"
                              style={{ backgroundColor: sch.active ? '#00BF8F' : '#d1d5db' }}
                            >
                              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                                style={{ left: sch.active ? '18px' : '2px' }} />
                            </div>
                            {/* Time range */}
                            {sch.active ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <select value={sch.from}
                                  onChange={e => setWalkerForm(f => ({ ...f, availability: { ...f.availability, [key]: { ...sch, from: e.target.value } } }))}
                                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
                                  style={{ borderColor: '#d1d5db' }}>
                                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span className="text-xs text-gray-400">—</span>
                                <select value={sch.to}
                                  onChange={e => setWalkerForm(f => ({ ...f, availability: { ...f.availability, [key]: { ...sch, to: e.target.value } } }))}
                                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
                                  style={{ borderColor: '#d1d5db' }}>
                                  {TIMES.filter(t => t > sch.from).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 flex-1">Nije dostupan</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              <button
                onClick={() => updateWalkerM.mutate({ ...walkerForm, hourly_rate: Number(walkerForm.hourly_rate) || 0 })}
                disabled={updateWalkerM.isPending}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#00BF8F' }}>
                {updateWalkerM.isPending ? 'Čuvanje...' : 'Sačuvaj profil šetača'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
