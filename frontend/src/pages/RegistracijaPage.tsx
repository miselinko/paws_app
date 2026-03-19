import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import AdresaInput from '../components/AdresaInput'

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

const SVC_OPTIONS = [
  { val: 'walking', icon: '🦮', title: 'Šetanje', desc: 'Vodim pse na šetnju' },
  { val: 'boarding', icon: '🏠', title: 'Čuvanje', desc: 'Čuvam pse kod kuće' },
  { val: 'both', icon: '🐾', title: 'Oboje', desc: 'Šetam i čuvam' },
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
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const [services, setServices] = useState<'walking' | 'boarding' | 'both'>('both')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'owner' },
  })
  const role = watch('role')
  const left = LEFT_CONTENT[role] ?? LEFT_CONTENT.owner

  const onSubmit = async (data: F) => {
    try {
      setApiError('')
      const payload = data.role === 'walker' ? { ...data, services } : data
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#00BF8F' }}>
              <span className="text-white font-black text-lg">P</span>
            </div>
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
              { val: 'owner',  icon: '🏠', title: 'Vlasnik psa',   desc: 'Tražim šetača' },
              { val: 'walker', icon: '🦮', title: 'Šetač / Čuvar', desc: 'Nudim usluge' },
            ].map(({ val, icon, title, desc }) => (
              <label
                key={val}
                className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all"
                style={role === val
                  ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' }
                  : { borderColor: '#e5e7eb', backgroundColor: 'white' }}
              >
                <input {...register('role')} type="radio" value={val} className="sr-only" />
                <span className="text-2xl">{icon}</span>
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
                {SVC_OPTIONS.map(({ val, icon, title, desc }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setServices(val as typeof services)}
                    className="flex flex-col items-center gap-1 py-3.5 px-2 rounded-xl border-2 transition-all"
                    style={services === val
                      ? { borderColor: '#00BF8F', backgroundColor: '#f0fdf9' }
                      : { borderColor: '#e5e7eb', backgroundColor: 'white' }}
                  >
                    <span className="text-2xl">{icon}</span>
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
                onChange={(addr) => setValue('address', addr, { shouldValidate: true })}
                placeholder="npr. Bulevar Oslobođenja 12, Novi Sad"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Lozinka</label>
                <input {...register('password')} type="password" placeholder="Min. 8 karaktera" className={inp} style={inpStyle}
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpStyle)} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Potvrdi</label>
                <input {...register('password2')} type="password" placeholder="Ponovi lozinku" className={inp} style={inpStyle}
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => Object.assign(e.target.style, inpStyle)} />
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
