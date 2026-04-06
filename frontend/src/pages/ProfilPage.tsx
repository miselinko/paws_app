import { imgUrl } from '../config'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyProfile, updateMyProfile, updateWalkerProfile, uploadProfileImage, deleteAccount, deleteProfileImage } from '../api/users'
import { useAuth } from '../context/AuthContext'
import AdresaInput from '../components/AdresaInput'
import { useNavigate } from 'react-router-dom'

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
const inpFocus = { borderColor: '#00BF8F', boxShadow: '0 0 0 3px rgba(0,191,143,0.10)' }
const inpBlur = { borderColor: '#e5e7eb', boxShadow: '' }

const SVC_LABELS: Record<string, { icon: string; label: string }> = {
  walking: { icon: '🦮', label: 'Šetanje' },
  boarding: { icon: '🏠', label: 'Čuvanje' },
  both: { icon: '🐾', label: 'Sve usluge' },
}
const DAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']

type DaySchedule = { active: boolean; from: string; to: string }

const defaultAvailability = (): Record<string, DaySchedule> =>
  Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), { active: true, from: '08:00', to: '20:00' }]))

export default function ProfilPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingBasic, setEditingBasic] = useState(false)
  const [editingWalker, setEditingWalker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getMyProfile })

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', address: '',
    lat: null as number | null, lng: null as number | null,
  })

  const [walkerForm, setWalkerForm] = useState({
    hourly_rate: '' as string | number,
    daily_rate: '' as string | number,
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
          daily_rate: profile.walker_profile.daily_rate ?? '',
          services: profile.walker_profile.services,
          bio: profile.walker_profile.bio,
          active: profile.walker_profile.active,
          availability: (a && Object.keys(a).length > 0) ? a : defaultAvailability(),
        })
      }
    }
  }, [profile])

  const flash = (closeBasic?: boolean, closeWalker?: boolean) => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    if (closeBasic) setEditingBasic(false)
    if (closeWalker) setEditingWalker(false)
  }

  const updateM = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash(true) },
  })
  const updateWalkerM = useMutation({
    mutationFn: updateWalkerProfile,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash(false, true) },
  })
  const toggleActiveM = useMutation({
    mutationFn: (active: boolean) => updateWalkerProfile({ active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
  const deleteM = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { logout(); navigate('/') },
  })
  const imageM = useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); flash() },
  })
  const deleteImageM = useMutation({
    mutationFn: deleteProfileImage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })

  if (!profile) return (
    <div className="flex justify-center items-center min-h-96">
      <svg className="animate-spin w-8 h-8" style={{ color: '#00BF8F' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  const wp = profile.walker_profile

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Hero header */}
      <section className="px-4 py-8" style={{ backgroundColor: '#f8faf9' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile.profile_image ? (
                <img src={imgUrl(profile.profile_image)} alt={profile.first_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white"
                  style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.14)' }} />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white"
                  style={{ backgroundColor: '#00BF8F', boxShadow: '0 2px 16px rgba(0,0,0,0.14)' }}>
                  {profile.first_name[0]}{profile.last_name[0]}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageM.isPending}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm hover:border-[#00BF8F] transition-all"
                title="Promeni sliku"
              >
                {imageM.isPending
                  ? <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                  : <span style={{ fontSize: '15px' }}>📷</span>
                }
              </button>
              {profile.profile_image && (
                <button
                  onClick={() => deleteImageM.mutate()}
                  disabled={deleteImageM.isPending}
                  className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm hover:border-red-400 transition-all"
                  title="Ukloni sliku"
                >
                  {deleteImageM.isPending
                    ? <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    : <span style={{ fontSize: '13px' }}>🗑</span>
                  }
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) imageM.mutate(f) }} />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-gray-900">{profile.first_name} {profile.last_name}</h1>
              <p className="text-gray-400 text-sm">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={profile.role === 'owner'
                    ? { backgroundColor: '#dbeafe', color: '#1e40af' }
                    : wp?.services === 'boarding'
                    ? { backgroundColor: '#fef3c7', color: '#92400e' }
                    : { backgroundColor: '#d1fae5', color: '#065f46' }}>
                  {profile.role === 'owner'
                ? '🏠 Vlasnik psa'
                : wp?.services === 'walking'
                ? '🦮 Šetač'
                : wp?.services === 'boarding'
                ? '🏠 Čuvar'
                : '🐾 Šetač & Čuvar'}
                </span>
                {user?.role === 'walker' && wp && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={wp.active ? { backgroundColor: '#d1fae5', color: '#065f46' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                    {wp.active ? '● Aktivan' : '○ Neaktivan'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-3 flex items-center gap-2 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Izmene sačuvane
          </div>
        )}

        {/* Basic info card */}
        <div className="bg-white rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animation: 'fadeIn 0.4s ease' }}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-black text-gray-900">Osnovni podaci</h2>
            {!editingBasic && (
              <button
                onClick={() => setEditingBasic(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-gray-100"
                style={{ color: '#00BF8F' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Izmeni
              </button>
            )}
          </div>

          {!editingBasic ? (
            /* View mode */
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Ime</p>
                  <p className="text-sm font-semibold text-gray-800">{profile.first_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Prezime</p>
                  <p className="text-sm font-semibold text-gray-800">{profile.last_name}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Telefon</p>
                <p className="text-sm font-semibold text-gray-800">{profile.phone || <span className="text-gray-400 font-normal italic">Nije unet</span>}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Adresa</p>
                <p className="text-sm font-semibold text-gray-800">{profile.address || <span className="text-gray-400 font-normal italic">Nije uneta</span>}</p>
              </div>
            </div>
          ) : (
            /* Edit mode */
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(['first_name', 'last_name'] as const).map(k => (
                  <div key={k}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{k === 'first_name' ? 'Ime' : 'Prezime'}</label>
                    <input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                      className={inp} onFocus={e => Object.assign(e.target.style, inpFocus)} onBlur={e => Object.assign(e.target.style, inpBlur)} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Broj telefona</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+381 63 123 4567" className={inp}
                  onFocus={e => Object.assign(e.target.style, inpFocus)} onBlur={e => Object.assign(e.target.style, inpBlur)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Adresa</label>
                <AdresaInput
                  value={form.address}
                  placeholder="npr. Bulevar Oslobođenja 12, Novi Sad"
                  onChange={(address, lat, lng) => setForm(f => ({
                    ...f, address,
                    lat: lat !== undefined ? lat : null,
                    lng: lng !== undefined ? lng : null,
                  }))}
                />
                {form.lat && form.lng && (
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Lokacija potvrđena
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditingBasic(false); if (profile) setForm({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone, address: profile.address, lat: profile.lat, lng: profile.lng }) }}
                  className="flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all hover:bg-gray-50"
                  style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                  Otkaži
                </button>
                <button onClick={() => updateM.mutate(form)} disabled={updateM.isPending}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: '#00BF8F' }}>
                  {updateM.isPending ? 'Čuvanje...' : 'Sačuvaj'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Walker profile card */}
        {user?.role === 'walker' && wp && (
          <div className="bg-white rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animation: 'fadeIn 0.5s ease' }}>
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900">🦮 Profil šetača</h2>
                <p className="text-xs text-gray-400 mt-0.5">Vidljivo vlasnicima pasa</p>
              </div>
              {!editingWalker && (
                <button
                  onClick={() => setEditingWalker(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-gray-100"
                  style={{ color: '#00BF8F' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Izmeni
                </button>
              )}
            </div>

            {!editingWalker ? (
              /* Walker view mode */
              <div className="p-5 space-y-4">
                {/* Active toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border-2 transition-all"
                  style={wp.active
                    ? { borderColor: '#bbf7d0', backgroundColor: '#f0fdf9' }
                    : { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: wp.active ? '#059669' : '#6b7280' }}>
                      {wp.active ? '● Profil je aktivan' : '○ Profil je deaktiviran'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: wp.active ? '#6ee7b7' : '#9ca3af' }}>
                      {wp.active ? 'Vidljiv si vlasnicima pasa' : 'Nisi vidljiv u pretrazi'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActiveM.mutate(!wp.active)}
                    disabled={toggleActiveM.isPending}
                    className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all disabled:opacity-50"
                    style={wp.active
                      ? { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: 'white' }
                      : { borderColor: '#00BF8F', color: '#00BF8F', backgroundColor: 'white' }}
                  >
                    {toggleActiveM.isPending ? '...' : wp.active ? 'Deaktiviraj' : 'Aktiviraj'}
                  </button>
                </div>

                {((wp.services === 'walking' || wp.services === 'both') && Number(wp.hourly_rate) > 0) ||
                 ((wp.services === 'boarding' || wp.services === 'both') && Number(wp.daily_rate) > 0) ? (
                  <div className="grid grid-cols-2 gap-4">
                    {(wp.services === 'walking' || wp.services === 'both') && Number(wp.hourly_rate) > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Cena po satu</p>
                        <p className="text-lg font-black" style={{ color: '#00BF8F' }}>{Number(wp.hourly_rate).toLocaleString()} <span className="text-sm font-semibold text-gray-400">RSD</span></p>
                      </div>
                    )}
                    {(wp.services === 'boarding' || wp.services === 'both') && Number(wp.daily_rate) > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Cena po danu</p>
                        <p className="text-lg font-black" style={{ color: '#FAAB43' }}>{Number(wp.daily_rate).toLocaleString()} <span className="text-sm font-semibold text-gray-400">RSD</span></p>
                      </div>
                    )}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Usluga</p>
                    <p className="text-sm font-semibold text-gray-800">{SVC_LABELS[wp.services]?.icon} {SVC_LABELS[wp.services]?.label}</p>
                  </div>
                </div>
                {wp.bio && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">O meni</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{wp.bio}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Dostupnost</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map((day, idx) => {
                      const sch = walkerForm.availability[String(idx)]
                      const active = sch?.active ?? false
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1">
                          <div className="w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold"
                            style={active ? { backgroundColor: '#00BF8F', color: 'white' } : { backgroundColor: '#f3f4f6', color: '#d1d5db' }}>
                            {day}
                          </div>
                          {active ? (
                            <span className="text-[9px] text-gray-400 text-center leading-tight">{sch.from.slice(0,5)}<br/>–{sch.to.slice(0,5)}</span>
                          ) : (
                            <span className="text-[9px] text-gray-300">-</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Walker edit mode */
              <div className="p-5 space-y-5">
                {/* Active toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Aktivan profil</p>
                    <p className="text-xs text-gray-400">Kada je isključeno, nisi vidljiv vlasnicima</p>
                  </div>
                  <div onClick={() => setWalkerForm({ ...walkerForm, active: !walkerForm.active })}
                    className="w-11 h-6 rounded-full cursor-pointer transition-all relative shrink-0"
                    style={{ backgroundColor: walkerForm.active ? '#00BF8F' : '#d1d5db' }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                      style={{ left: walkerForm.active ? '23px' : '4px' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Usluge</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'walking', icon: '🦮', label: 'Šetanje' },
                      { val: 'boarding', icon: '🏠', label: 'Čuvanje' },
                      { val: 'both', icon: '🐾', label: 'Sve' },
                    ].map(u => (
                      <button key={u.val} type="button"
                        onClick={() => setWalkerForm({ ...walkerForm, services: u.val as typeof walkerForm.services })}
                        className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all"
                        style={walkerForm.services === u.val
                          ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9', color: '#059669' }
                          : { borderColor: '#e5e7eb', color: '#4b5563' }}>
                        <span className="text-xl">{u.icon}</span>{u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(walkerForm.services === 'walking' || walkerForm.services === 'both') && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cena po satu / šetanje (RSD)</label>
                    <input type="number" min="0" step="1" value={walkerForm.hourly_rate}
                      onChange={e => setWalkerForm({ ...walkerForm, hourly_rate: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="npr. 1500" className={inp}
                      onFocus={e => Object.assign(e.target.style, inpFocus)} onBlur={e => Object.assign(e.target.style, inpBlur)} />
                  </div>
                )}

                {(walkerForm.services === 'boarding' || walkerForm.services === 'both') && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cena po danu / čuvanje (RSD)</label>
                    <input type="number" min="0" step="1" value={walkerForm.daily_rate}
                      onChange={e => setWalkerForm({ ...walkerForm, daily_rate: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="npr. 2000" className={inp}
                      onFocus={e => Object.assign(e.target.style, inpFocus)} onBlur={e => Object.assign(e.target.style, inpBlur)} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">O meni</label>
                  <textarea value={walkerForm.bio} onChange={e => setWalkerForm({ ...walkerForm, bio: e.target.value })}
                    maxLength={500}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                    rows={4} placeholder="Kratko se predstavi, iskustvo sa psima..."
                    onFocus={e => Object.assign(e.target.style, inpFocus)} onBlur={e => Object.assign(e.target.style, inpBlur)} />
                  <p className="text-xs text-gray-400 text-right mt-1">{walkerForm.bio.length}/500</p>
                </div>

                {/* Availability */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Raspored</label>
                    <button type="button" onClick={() => setWalkerForm(f => ({ ...f, availability: defaultAvailability() }))}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all hover:border-[#00BF8F] hover:text-[#00BF8F]"
                      style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                      Resetuj
                    </button>
                  </div>

                  {/* Quick presets */}
                  {(() => {
                    const TIMES = Array.from({ length: 30 }, (_, i) => {
                      const h = Math.floor(i / 2) + 7
                      const m = i % 2 === 0 ? '00' : '30'
                      return `${String(h).padStart(2, '0')}:${m}`
                    })
                    const applyToAll = (from: string, to: string) => {
                      const newAvail: Record<string, DaySchedule> = {}
                      for (let i = 0; i < 7; i++) newAvail[String(i)] = { active: true, from, to }
                      setWalkerForm(f => ({ ...f, availability: newAvail }))
                    }
                    return (
                      <>
                        <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 rounded-xl flex-wrap">
                          <span className="text-xs text-gray-500 shrink-0">Primeni na sve:</span>
                          {[
                            { label: '08–20h', from: '08:00', to: '20:00' },
                            { label: '09–17h', from: '09:00', to: '17:00' },
                            { label: '07–22h', from: '07:00', to: '22:00' },
                          ].map(p => (
                            <button key={p.label} type="button" onClick={() => applyToAll(p.from, p.to)}
                              className="text-xs font-bold px-2.5 py-1 rounded-lg border transition-all hover:border-[#00BF8F] hover:text-[#00BF8F]"
                              style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                              {p.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          {DAYS.map((day, idx) => {
                            const key = String(idx)
                            const sch = walkerForm.availability[key] ?? { active: true, from: '08:00', to: '20:00' }
                            return (
                              <div key={key} className="flex flex-wrap items-center gap-2 py-2.5 px-3 rounded-xl border transition-all"
                                style={{ borderColor: sch.active ? '#bbf7d0' : '#e5e7eb', backgroundColor: sch.active ? '#f0fdf9' : '#f9fafb' }}>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-black w-7" style={{ color: sch.active ? '#059669' : '#9ca3af' }}>{day}</span>
                                  <div onClick={() => setWalkerForm(f => ({ ...f, availability: { ...f.availability, [key]: { ...sch, active: !sch.active } } }))}
                                    className="w-9 h-5 rounded-full cursor-pointer transition-all relative shrink-0"
                                    style={{ backgroundColor: sch.active ? '#00BF8F' : '#d1d5db' }}>
                                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                                      style={{ left: sch.active ? '18px' : '2px' }} />
                                  </div>
                                </div>
                                {sch.active ? (
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <select value={sch.from}
                                      onChange={e => setWalkerForm(f => ({ ...f, availability: { ...f.availability, [key]: { ...sch, from: e.target.value } } }))}
                                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
                                      style={{ borderColor: '#d1d5db' }}>
                                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <span className="text-xs text-gray-400">-</span>
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
                      </>
                    )
                  })()}
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingWalker(false)}
                    className="flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all hover:bg-gray-50"
                    style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                    Otkaži
                  </button>
                  <button
                    onClick={() => updateWalkerM.mutate({
                      ...walkerForm,
                      hourly_rate: Number(walkerForm.hourly_rate) || 0,
                      daily_rate: walkerForm.daily_rate !== '' ? Number(walkerForm.daily_rate) : null,
                    })}
                    disabled={updateWalkerM.isPending}
                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: '#00BF8F' }}>
                    {updateWalkerM.isPending ? 'Čuvanje...' : 'Sačuvaj'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Account management */}
        <div className="bg-white rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animation: 'fadeIn 0.6s ease' }}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-black text-gray-900">Upravljanje nalogom</h2>
          </div>
          <div className="p-5">
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all hover:bg-red-50"
                style={{ borderColor: '#fecaca', color: '#dc2626' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Obriši nalog
              </button>
            ) : (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4" style={{ animation: 'fadeIn 0.2s ease' }}>
                <p className="text-sm font-bold text-red-700 mb-1">Sigurno želiš da obrišeš nalog?</p>
                <p className="text-xs text-red-500 mb-4">Ova akcija je trajna i ne može se poništiti. Svi tvoji podaci, rezervacije i poruke će biti obrisani.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-xl border text-sm font-bold transition-all hover:bg-white"
                    style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                  >
                    Otkaži
                  </button>
                  <button
                    onClick={() => deleteM.mutate()}
                    disabled={deleteM.isPending}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    {deleteM.isPending ? 'Brišem...' : 'Da, obriši'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
