import { BACKEND_URL } from '../config'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getUnreadCount } from '../api/chat'
import { getPendingCount } from '../api/reservations'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: unread } = useQuery({
    queryKey: ['unread'],
    queryFn: getUnreadCount,
    enabled: !!user,
    refetchInterval: 10000,
    select: (d: { count: number }) => d.count,
  })

  const { data: pendingCount } = useQuery({
    queryKey: ['pendingCount'],
    queryFn: getPendingCount,
    enabled: !!user && user.role === 'walker',
    refetchInterval: 15000,
    select: (d: { count: number }) => d.count,
  })

  const handleLogout = () => { logout(); navigate('/') }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-[#00BF8F] bg-green-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#00BF8F' }}>
            <span className="text-white font-black text-lg">P</span>
          </div>
          <span className="text-xl font-black text-gray-900">Paws</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/walkers" className={({ isActive }) =>
            `px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isActive ? 'text-[#00BF8F] bg-green-50' : 'text-gray-700 hover:text-[#00BF8F] hover:bg-green-50'}`
          }>
            🐾 Pronađi šetača
          </NavLink>
          {user && (
            <>
              <NavLink to="/reservations" className={linkClass}>Rezervacije</NavLink>
              <NavLink to="/messages" className={({ isActive }) =>
                `relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-[#00BF8F] bg-green-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
              }>
                Poruke
                {!!unread && unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">
                    {unread}
                  </span>
                )}
              </NavLink>
              {user.role === 'owner' && (
                <NavLink to="/my-dogs" className={linkClass}>Moji psi</NavLink>
              )}
            </>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/login" className="hidden sm:block text-sm font-medium text-gray-600 px-4 py-2 hover:text-gray-900 transition-colors">
                Prijavi se
              </Link>
              <Link to="/register"
                className="text-sm font-bold text-white px-4 py-2.5 rounded-xl transition-colors hover:opacity-90"
                style={{ backgroundColor: '#00BF8F' }}>
                Registruj se
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {user.profile_image ? (
                  <img src={`${BACKEND_URL}${user.profile_image}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#00BF8F' }}>
                    {user.first_name[0]}{user.last_name[0]}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-gray-700">{user.first_name}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl border border-gray-100 py-1 z-50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <span>👤</span> Moj profil
                    </Link>
                    <Link to="/reservations" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <span>📅</span> Rezervacije
                    </Link>
                    <Link to="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <span>💬</span> Poruke
                      {!!unread && unread > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{unread}</span>
                      )}
                    </Link>
                    {user.role === 'owner' && (
                      <Link to="/my-dogs" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <span>🐕</span> Moji psi
                      </Link>
                    )}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                        <span>🚪</span> Odjavi se
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          {!user && (
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-50 text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav — only for logged in users */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-white border-t border-gray-100"
          style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around px-1 py-1">
            {(user.role === 'owner' ? [
              { to: '/walkers', icon: '🐾', label: 'Šetači' },
              { to: '/my-dogs', icon: '🐕', label: 'Moji psi' },
              { to: '/reservations', icon: '📅', label: 'Termini' },
              { to: '/messages', icon: '💬', label: 'Poruke', badge: unread },
              { to: '/profile', icon: '👤', label: 'Profil' },
            ] : [
              { to: '/', icon: '🏠', label: 'Dom' },
              { to: '/walkers', icon: '🐾', label: 'Šetači' },
              { to: '/reservations', icon: '📅', label: 'Termini', badge: pendingCount },
              { to: '/messages', icon: '💬', label: 'Poruke', badge: unread },
              { to: '/profile', icon: '👤', label: 'Profil' },
            ]).map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl relative transition-all ${isActive ? 'text-[#00BF8F]' : 'text-gray-400'}`
                }>
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* Mobile menu for guests */}
      {menuOpen && !user && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link to="/walkers" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-green-50 rounded-lg">🐾 Pronađi šetača</Link>
          <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Prijavi se</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-bold text-white rounded-lg text-center" style={{ backgroundColor: '#00BF8F' }}>Registruj se</Link>
        </div>
      )}
    </nav>
  )
}
