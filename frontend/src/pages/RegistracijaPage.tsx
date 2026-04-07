import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import logoImg from '../assets/logo.png'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import AdresaInput from '../components/AdresaInput'

const MapaPicker = lazy(() => import('../components/MapaPicker'))

const schema = z.object({
  email: z.string().email('Unesi validan email'),
  first_name: z.string().min(2, 'Obavezno'),
  last_name: z.string().min(2, 'Obavezno'),
  role: z.enum(['owner', 'walker']),
  address: z.string().min(5, 'Adresa je obavezna'),
  password: z.string().min(8, 'Minimum 8 karaktera'),
  password2: z.string(),
}).refine(d => d.password === d.password2, { message: 'Lozinke se ne poklapaju', path: ['password2'] })

type F = z.infer<typeof schema>

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white transition-all"
const inpStyle = { borderColor: '#e5e7eb' }
const inpFocus = { borderColor: '#00BF8F', boxShadow: '0 0 0 3px rgba(0,191,143,0.12)' }

const SVC_ICONS: Record<string, React.ReactNode> = {
  walking: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
  boarding: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  both: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="8" cy="6" rx="2" ry="2.5"/><ellipse cx="16" cy="6" rx="2" ry="2.5"/><ellipse cx="4.5" cy="12" rx="2" ry="2.5"/><ellipse cx="19.5" cy="12" rx="2" ry="2.5"/><path d="M12 22c-3.5 0-6-2.2-6-5 0-2.5 2-4.5 3.5-6 .7-.7 1.5-1 2.5-1s1.8.3 2.5 1c1.5 1.5 3.5 3.5 3.5 6 0 2.8-2.5 5-6 5z"/></svg>,
}
const SVC_OPTIONS = [
  { val: 'walking', title: 'Šetanje', desc: 'Vodim pse na šetnju' },
  { val: 'boarding', title: 'Čuvanje', desc: 'Čuvam pse kod kuće' },
  { val: 'both', title: 'Oboje', desc: 'Šetam i čuvam' },
]

const LEFT_CONTENT = {
  owner: {
    heading: ['Pronađi', 'šetača!'],
    sub: 'Besplatna registracija. Povezi se sa proverenim šetačima u svojoj blizini.',
    bullets: ['Besplatna registracija', 'Rezerviši online', 'Ocene i recenzije', 'Sigurna komunikacija'],
  },
  walker: {
    heading: ['Ponudi', 'usluge!'],
    sub: 'Povezi se sa vlasnicima pasa u tvojoj blizini i zarađuj radeći što voliš.',
    bullets: ['Besplatna registracija', 'Vidljiv vlasnicima pasa', 'Primaj rezervacije online', 'Ocene grade poverenje'],
  },
}

export default function RegistracijaPage() {
  useEffect(() => { document.title = 'Registracija - PawsApp' }, [])
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [services, setServices] = useState<'walking' | 'boarding' | 'both'>('both')
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [currentAddress, setCurrentAddress] = useState('Trenutna adresa nije učitana')
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [showMap, setShowMap] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'owner' },
  })
  const role = watch('role')
  const left = LEFT_CONTENT[role] ?? LEFT_CONTENT.owner

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=sr`
    const res = await fetch(url, { headers: { 'User-Agent': 'PawsApp/1.0' } })
    const data = await res.json() as {
      address?: {
        road?: string
        house_number?: string
        city?: string
        town?: string
        village?: string
        county?: string
      }
      display_name?: string
    }
    if (data.display_name && !data.address) return data.display_name
    const a = data.address
    if (!a) return ''
    const street = a.road ? `${a.road}${a.house_number ? ` ${a.house_number}` : ''}` : ''
    const city = a.city || a.town || a.village || a.county || ''
    return [street, city].filter(Boolean).join(', ') || data.display_name || ''
  }, [])

  const fillFromCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Pregledač ne podržava geolokaciju.')
      return
    }

    setIsLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const rawLat = position.coords.latitude
          const rawLng = position.coords.longitude
          if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
            setLocationError('Koordinate nisu dostupne. Proverite podešavanja lokacije u pregledaču.')
            setIsLocating(false)
            return
          }
          const lat = parseFloat(rawLat.toFixed(6))
          const lng = parseFloat(rawLng.toFixed(6))
          const address = await reverseGeocode(lat, lng)
          if (!address) {
            setLocationError('Nije moguće očitati adresu sa trenutne lokacije.')
            setIsLocating(false)
            return
          }
          setCurrentAddress(address)
          setValue('address', address, { shouldValidate: true })
          setCoords({ lat, lng })
        } catch {
          setLocationError('Nije moguće očitati adresu sa trenutne lokacije.')
        } finally {
          setIsLocating(false)
        }
      },
      () => {
        setLocationError('Lokacija nije dozvoljena ili nije dostupna.')
        setIsLocating(false)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    )
  }

  const onSubmit = async (data: F) => {
    try {
      setApiError('')
      const payload = {
        ...data,
        ...(coords.lat != null && coords.lng != null ? { lat: coords.lat, lng: coords.lng } : {}),
        ...(data.role === 'walker' ? { services } : {}),
      }
      await api.post('/users/register/', payload)
      navigate('/login')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { email?: string[] } } }
      setApiError(err.response?.data?.email?.[0] || 'Greška pri registraciji.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Left photo panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between px-14 py-12 w-[460px] shrink-0"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.68), rgba(0,0,0,0.38)), url('https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?q=80&w=1200&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#00BF8F' }}>
            <span className="text-white text-xl font-black">P</span>
          </div>
          <span className="text-2xl font-black text-white">Paws</span>
        </Link>

        <div key={role} style={{ animation: 'fadeUp 0.35s ease' }}>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            {left.heading[0]}<br />{left.heading[1]}
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10">{left.sub}</p>
          <div className="space-y-3">
            {left.bullets.map(item => (
              <div key={item} className="flex items-center gap-3 text-white/90 text-sm">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#00BF8F' }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 overflow-y-auto">
        <div className="w-full max-w-md" style={{ animation: 'fadeUp 0.4s ease' }}>

          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src={logoImg} alt="Paws" className="w-9 h-9 rounded-xl object-cover" />
            <span className="text-xl font-black text-gray-900">Paws</span>
          </Link>

          <h1 className="text-2xl font-black text-gray-900 mb-1">Kreiraj nalog</h1>
          <p className="text-gray-500 text-sm mb-6">
            Već imaš nalog?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#00BF8F' }}>Prijavi se</Link>
          </p>

          {/* ── Step 1: Ko si? ── */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Ko si?</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { val: 'owner',  title: 'Vlasnik psa',   desc: 'Tražim šetača',
                ic: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
              { val: 'walker', title: 'Šetač / Čuvar', desc: 'Nudim usluge',
                ic: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg> },
            ].map(({ val, ic, title, desc }) => (
              <label
                key={val}
                className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all"
                style={role === val
                  ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' }
                  : { borderColor: '#e5e7eb', backgroundColor: 'white' }}
              >
                <input {...register('role')} type="radio" value={val} className="sr-only" />
                <span className="text-gray-500">{ic}</span>
                <div>
                  <div className="font-bold text-sm" style={{ color: role === val ? '#00BF8F' : '#1f2937' }}>{title}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* ── Step 1b: Koje usluge? (walker only) ── */}
          {role === 'walker' && (
            <div style={{ animation: 'slideDown 0.25s ease' }} className="mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Koje usluge nudim?</p>
              <div className="grid grid-cols-3 gap-2">
                {SVC_OPTIONS.map(({ val, title, desc }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setServices(val as typeof services)}
                    className="flex flex-col items-center gap-1 py-3.5 px-2 rounded-xl border-2 transition-all"
                    style={services === val
                      ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' }
                      : { borderColor: '#e5e7eb', backgroundColor: 'white' }}
                  >
                    <span className="text-gray-500">{SVC_ICONS[val]}</span>
                    <span className="text-xs font-bold" style={{ color: services === val ? '#059669' : '#1f2937' }}>{title}</span>
                    <span className="text-[10px] text-center leading-tight text-gray-400">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              {apiError}
            </div>
          )}

          {/* ── Form fields ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ime</label>
                <input {...register('first_name')} placeholder="Marko" className={inp} style={inpStyle}
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpStyle)} />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Prezime</label>
                <input {...register('last_name')} placeholder="Petrović" className={inp} style={inpStyle}
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpStyle)} />
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email adresa</label>
              <input {...register('email')} type="email" placeholder="name@email.com" className={inp} style={inpStyle}
                onFocus={e => Object.assign(e.target.style, inpFocus)}
                onBlur={e => Object.assign(e.target.style, inpStyle)} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Adresa</label>
              <AdresaInput
                value={watch('address') || ''}
                onChange={(addr, lat, lng) => {
                  setValue('address', addr, { shouldValidate: true })
                  setCoords({ lat: lat ?? null, lng: lng ?? null })
                }}
                placeholder="npr. Bulevar Oslobođenja 12, Novi Sad"
                onLocate={fillFromCurrentLocation}
                isLocating={isLocating}
              />
              {currentAddress !== 'Trenutna adresa nije učitana' && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Približna lokacija: <span className="font-semibold text-gray-600">{currentAddress}</span>
                  {' - ako nije tačna, '}
                  <button type="button" onClick={() => setShowMap(true)} className="font-semibold underline hover:no-underline" style={{ color: '#00BF8F' }}>
                    izaberi na mapi
                  </button>
                </p>
              )}
              {showMap && coords.lat != null && coords.lng != null && (
                <Suspense fallback={<div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ height: '280px' }}><p className="text-xs text-gray-400">Učitavam mapu...</p></div>}>
                  <MapaPicker
                    lat={coords.lat}
                    lng={coords.lng}
                    reverseGeocode={reverseGeocode}
                    onClose={() => setShowMap(false)}
                    onConfirm={(address, lat, lng) => {
                      setValue('address', address, { shouldValidate: true })
                      setCoords({ lat, lng })
                      setCurrentAddress(address)
                      setShowMap(false)
                    }}
                  />
                </Suspense>
              )}
              {locationError && <p className="text-red-500 text-xs mt-1">{locationError}</p>}
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Lozinka</label>
                <div className="relative">
                  <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Min. 8 karaktera" className={inp + ' pr-10'} style={inpStyle}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => Object.assign(e.target.style, inpStyle)} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Potvrdi</label>
                <div className="relative">
                  <input {...register('password2')} type={showPw2 ? 'text' : 'password'} placeholder="Ponovi lozinku" className={inp + ' pr-10'} style={inpStyle}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => Object.assign(e.target.style, inpStyle)} />
                  <button type="button" onClick={() => setShowPw2(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw2 ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                  </button>
                </div>
                {errors.password2 && <p className="text-red-500 text-xs mt-1">{errors.password2.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#00BF8F' }}
            >
              {isSubmitting
                ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                : 'Kreiraj nalog besplatno →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
