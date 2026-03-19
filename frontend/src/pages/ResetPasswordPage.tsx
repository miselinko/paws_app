import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/users'

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
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-gray-600 mb-4">Nevažeći link za resetovanje.</p>
        <Link to="/forgot-password" className="font-semibold hover:underline" style={{ color: '#00BF8F' }}>Zatraži novi link</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#00BF8F' }}>
            <span className="text-white font-black text-lg">P</span>
          </div>
          <span className="text-xl font-black text-gray-900">Paws</span>
        </Link>

        {done ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
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
