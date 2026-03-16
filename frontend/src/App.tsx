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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <>{children}</> : <Navigate to="/login" replace />
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
      <Navbar />
      <div className={user ? 'pb-16 md:pb-0' : ''}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/walkers" element={<SetaciPage />} />
        <Route path="/walkers/:id" element={<SetacProfilPage />} />
        <Route path="/login" element={<GuestRoute><PrijavaPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegistracijaPage /></GuestRoute>} />
        <Route path="/reservations" element={<PrivateRoute><RezervacijePage /></PrivateRoute>} />
        <Route path="/my-dogs" element={<PrivateRoute><MojiPsiPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilPage /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><PorukePage /></PrivateRoute>} />
        <Route path="/messages/:userId" element={<PrivateRoute><PorukePage /></PrivateRoute>} />
      </Routes>
      </div>
    </>
  )
}
