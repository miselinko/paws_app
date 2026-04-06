import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import PrijavaPage from './pages/PrijavaPage'
import RegistracijaPage from './pages/RegistracijaPage'
import SetaciPage from './pages/SetaciPage'
import SetacProfilPage from './pages/SetacProfilPage'
import RezervacijePage from './pages/RezervacijePage'
import MojiPsiPage from './pages/MojiPsiPage'
import ProfilPage from './pages/ProfilPage'
import PorukePage from './pages/PorukePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminPage from './pages/AdminPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import PasProfilPage from './pages/PasProfilPage'
import ONamaPage from './pages/ONamaPage'
import KakoFunkcionisePage from './pages/KakoFunkcionisePage'
import PostaniSetacPage from './pages/PostaniSetacPage'
import FaqPage from './pages/FaqPage'
import KontaktPage from './pages/KontaktPage'
import ZastoPawsPage from './pages/ZastoPawsPage'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" replace />
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  const { user } = useAuth()

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <div className={user ? 'pb-16 md:pb-0' : ''}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/o-nama" element={<ONamaPage />} />
        <Route path="/kako-funkcionise" element={<KakoFunkcionisePage />} />
        <Route path="/postani-setac" element={<PostaniSetacPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/kontakt" element={<KontaktPage />} />
        <Route path="/zasto-paws" element={<ZastoPawsPage />} />
        <Route path="/walkers" element={<SetaciPage />} />
        <Route path="/walkers/:id" element={<SetacProfilPage />} />
        <Route path="/login" element={<GuestRoute><PrijavaPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegistracijaPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reservations" element={<PrivateRoute><RezervacijePage /></PrivateRoute>} />
        <Route path="/dogs/:id" element={<PrivateRoute><PasProfilPage /></PrivateRoute>} />
        <Route path="/my-dogs" element={<PrivateRoute><MojiPsiPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilPage /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><PorukePage /></PrivateRoute>} />
        <Route path="/messages/:userId" element={<PrivateRoute><PorukePage /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Routes>
      <Footer />
      </div>
    </>
  )
}
