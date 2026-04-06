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
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 text-gray-400">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            </div>
            <p className="text-gray-500">Verifikacija u toku...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F' }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </div>
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
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-yellow-50 text-yellow-500">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            </div>
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
