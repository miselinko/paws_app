import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/users'
import logoImg from '../assets/logo.png'

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError('Došlo je do greške. Pokušaj ponovo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <img src={logoImg} alt="Paws" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-xl font-black text-gray-900">Paws</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Proveri email</h1>
            <p className="text-gray-500 text-sm mb-6">
              Ako ovaj email postoji u sistemu, poslaćemo ti link za resetovanje lozinke.
            </p>
            <Link to="/login" className="text-sm font-semibold hover:underline" style={{ color: '#00BF8F' }}>
              ← Nazad na prijavu
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-gray-900 mb-1">Zaboravili ste lozinku?</h1>
            <p className="text-gray-500 text-sm mb-7">
              Unesite email i poslaćemo vam link za resetovanje.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email adresa</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="ime@email.com" required className={inp}
                  onFocus={e => { e.target.style.borderColor = '#00BF8F'; e.target.style.boxShadow = '0 0 0 3px rgba(0,191,143,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                style={{ backgroundColor: '#00BF8F' }}>
                {loading ? 'Šaljem...' : 'Pošalji link →'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-6">
              <Link to="/login" className="font-semibold hover:underline" style={{ color: '#00BF8F' }}>← Nazad na prijavu</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
