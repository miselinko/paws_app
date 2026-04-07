import { useState, useEffect } from 'react'
import logoImg from '../assets/logo.png'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const schema = z.object({
  email: z.string().email('Unesi validan email'),
  password: z.string().min(1, 'Lozinka je obavezna'),
})
type F = z.infer<typeof schema>

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors bg-white"
const inpFocus = { outline: 'none', borderColor: '#00BF8F', boxShadow: '0 0 0 3px rgba(0,191,143,0.12)' }

export default function PrijavaPage() {
  useEffect(() => { document.title = 'Prijava - PawsApp' }, [])
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: F) => {
    try { setError(''); await login(data.email, data.password); navigate('/') }
    catch { setError('Pogresna email adresa ili lozinka.') }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left photo panel */}
      <div
        className="hidden lg:flex flex-col justify-between px-14 py-12 w-[480px] shrink-0"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.60), rgba(0,0,0,0.35)), url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=1200&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#00BF8F' }}>
            <span className="text-white text-xl font-black">P</span>
          </div>
          <span className="text-2xl font-black text-white">PawsApp</span>
        </Link>

        <div>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Dobrodosao<br />nazad!
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10">
            Povezi se sa proverenim setacima i cuvarima pasa u tvojoj blizini.
          </p>
          <div className="space-y-3">
            {['Provereni setaci', 'Kalendar rezervacija', 'Direktan chat', 'Ocene i recenzije'].map(item => (
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

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src={logoImg} alt="PawsApp" className="w-9 h-9 rounded-xl object-cover" />
            <span className="text-xl font-black text-gray-900">PawsApp</span>
          </Link>

          <h1 className="text-2xl font-black text-gray-900 mb-1">Prijavi se</h1>
          <p className="text-gray-500 text-sm mb-7">
            Nemas nalog?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#00BF8F' }}>Registruj se besplatno</Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email adresa</label>
              <input
                {...register('email')}
                type="email"
                placeholder="ime@email.com"
                className={inp}
                onFocus={e => Object.assign(e.target.style, inpFocus)}
                onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Lozinka</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={inp + ' pr-10'}
                  onFocus={e => Object.assign(e.target.style, inpFocus)}
                  onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-gray-400 hover:underline" style={{ color: '#00BF8F' }}>
                Zaboravili ste lozinku?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 mt-2 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#00BF8F' }}
            >
              {isSubmitting ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : 'Prijavi se →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
