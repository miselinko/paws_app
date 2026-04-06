import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/users'
import logoImg from '../assets/logo.png'

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white"

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== password2) { setError('Lozinke se ne poklapaju.'); return }
    if (password.length < 8) { setError('Lozinka mora imati najmanje 8 karaktera.'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Nevažeći ili istekao link.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-yellow-50 text-yellow-500">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        </div>
        <p className="text-gray-600 mb-4">Nevažeći link za resetovanje.</p>
        <Link to="/forgot-password" className="font-semibold hover:underline" style={{ color: '#00BF8F' }}>Zatraži novi link</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <img src={logoImg} alt="Paws" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-xl font-black text-gray-900">Paws</span>
        </Link>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F' }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Lozinka promenjena!</h1>
            <p className="text-gray-500 text-sm">Preusmeravamo te na prijavu...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-gray-900 mb-1">Nova lozinka</h1>
            <p className="text-gray-500 text-sm mb-7">Unesite novu lozinku za vaš Paws nalog.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nova lozinka</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Najmanje 8 karaktera" required className={inp}
                  onFocus={e => { e.target.style.borderColor = '#00BF8F'; e.target.style.boxShadow = '0 0 0 3px rgba(0,191,143,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ponovi lozinku</label>
                <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                  placeholder="••••••••" required className={inp}
                  onFocus={e => { e.target.style.borderColor = '#00BF8F'; e.target.style.boxShadow = '0 0 0 3px rgba(0,191,143,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                style={{ backgroundColor: '#00BF8F' }}>
                {loading ? 'Čuvam...' : 'Sačuvaj lozinku →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
