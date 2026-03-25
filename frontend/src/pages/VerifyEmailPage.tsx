import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import logoImg from '../assets/logo.png'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Nevažeći link za verifikaciju.')
      return
    }
    axios
      .get(`${API_URL}/users/verify-email/`, { params: { token } })
      .then(res => {
        setMessage(res.data.detail || 'Email adresa je potvrđena.')
        setStatus('success')
      })
      .catch(err => {
        setMessage(err.response?.data?.detail || 'Nevažeći ili istekao link.')
        setStatus('error')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <img src={logoImg} alt="Paws" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-xl font-black text-gray-900">Paws</span>
        </Link>

        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Verifikacija u toku...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Email potvrđen!</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block py-3 px-6 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
              style={{ backgroundColor: '#00BF8F' }}
            >
              Prijavi se →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Greška</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link
              to="/login"
              className="text-sm font-semibold hover:underline"
              style={{ color: '#00BF8F' }}
            >
              Nazad na prijavu
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
