import { imgUrl } from '../config'
import { useState } from 'react'
import logoImg from '../assets/logo.png'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getUnreadCount } from '../api/chat'
import { getPendingCount } from '../api/reservations'

/* ── SVG nav icons ── */
const icon = {
  search: (c: string) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  cal: (c: string) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  chat: (c: string) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>,
  user: (c: string) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
  paw: (c: string) => <svg className={c} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="8" cy="6" rx="2" ry="2.5"/><ellipse cx="16" cy="6" rx="2" ry="2.5"/><ellipse cx="4.5" cy="12" rx="2" ry="2.5"/><ellipse cx="19.5" cy="12" rx="2" ry="2.5"/><path d="M12 22c-3.5 0-6-2.2-6-5 0-2.5 2-4.5 3.5-6 .7-.7 1.5-1 2.5-1s1.8.3 2.5 1c1.5 1.5 3.5 3.5 3.5 6 0 2.8-2.5 5-6 5z"/></svg>,
  home: (c: string) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  shield: (c: string) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  logout: (c: string) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>,
}

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
          <img src={logoImg} alt="PawsApp" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-xl font-black text-gray-900">PawsApp</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/walkers" className={({ isActive }) =>
            `px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isActive ? 'text-[#00BF8F] bg-green-50' : 'text-gray-700 hover:text-[#00BF8F] hover:bg-green-50'}`
          }>
            Pronađi šetača
          </NavLink>
          {!user && (
            <>
              <NavLink to="/o-nama" className={linkClass}>O nama</NavLink>
              <NavLink to="/zasto-paws" className={linkClass}>Zašto PawsApp</NavLink>
              <NavLink to="/kako-funkcionise" className={linkClass}>Kako funkcioniše</NavLink>
              <NavLink to="/postani-setac" className={linkClass}>Postani šetač</NavLink>
              <NavLink to="/kontakt" className={linkClass}>Kontakt</NavLink>
            </>
          )}
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
              {user.role === 'admin' && (
                <NavLink to="/admin" className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isActive ? 'text-purple-600 bg-purple-50' : 'text-purple-500 hover:text-purple-700 hover:bg-purple-50'}`
                }>
                  Admin
                </NavLink>
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
                className="text-sm font-bold text-white px-4 py-2.5 rounded-full transition-colors hover:opacity-90"
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
                <div className="relative">
                  {user.profile_image ? (
                    <img src={imgUrl(user.profile_image)} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: '#00BF8F' }}>
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                  )}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">{user.first_name}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 w-52 bg-white rounded-xl border border-gray-200 py-1 z-50" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      {icon.user('w-4 h-4 text-gray-400')} Moj profil
                    </Link>
                    <Link to="/reservations" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      {icon.cal('w-4 h-4 text-gray-400')} Rezervacije
                    </Link>
                    <Link to="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      {icon.chat('w-4 h-4 text-gray-400')} Poruke
                      {!!unread && unread > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{unread}</span>
                      )}
                    </Link>
                    {user.role === 'owner' && (
                      <Link to="/my-dogs" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        {icon.paw('w-4 h-4 text-gray-400')} Moji psi
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50">
                        {icon.shield('w-4 h-4 text-purple-400')} Admin panel
                      </Link>
                    )}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                        {icon.logout('w-4 h-4')} Odjavi se
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

      {/* Mobile bottom nav - logged in users */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-white border-t border-gray-100"
          style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around px-1 py-1">
            {(user.role === 'admin' ? [
              { to: '/admin', ic: icon.shield('w-5 h-5'), label: 'Admin' },
              { to: '/walkers', ic: icon.search('w-5 h-5'), label: 'Šetači' },
              { to: '/messages', ic: icon.chat('w-5 h-5'), label: 'Poruke', badge: unread },
              { to: '/profile', ic: icon.user('w-5 h-5'), label: 'Profil' },
            ] : user.role === 'owner' ? [
              { to: '/walkers', ic: icon.search('w-5 h-5'), label: 'Šetači' },
              { to: '/my-dogs', ic: icon.paw('w-5 h-5'), label: 'Moji psi' },
              { to: '/reservations', ic: icon.cal('w-5 h-5'), label: 'Termini' },
              { to: '/messages', ic: icon.chat('w-5 h-5'), label: 'Poruke', badge: unread },
              { to: '/profile', ic: icon.user('w-5 h-5'), label: 'Profil' },
            ] : [
              { to: '/', ic: icon.home('w-5 h-5'), label: 'Dom' },
              { to: '/walkers', ic: icon.search('w-5 h-5'), label: 'Šetači' },
              { to: '/reservations', ic: icon.cal('w-5 h-5'), label: 'Termini', badge: pendingCount },
              { to: '/messages', ic: icon.chat('w-5 h-5'), label: 'Poruke', badge: unread },
              { to: '/profile', ic: icon.user('w-5 h-5'), label: 'Profil' },
            ]).map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl relative transition-all ${isActive ? 'text-[#00BF8F]' : 'text-gray-400'}`
                }>
                {item.ic}
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
          <Link to="/walkers" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-green-50 rounded-lg">Pronađi šetača</Link>
          <Link to="/o-nama" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">O nama</Link>
          <Link to="/zasto-paws" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Zašto PawsApp</Link>
          <Link to="/kako-funkcionise" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Kako funkcioniše</Link>
          <Link to="/postani-setac" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Postani šetač</Link>
          <Link to="/kontakt" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Kontakt</Link>
          <div className="border-t border-gray-100 my-1"></div>
          <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Prijavi se</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-bold text-white rounded-lg text-center" style={{ backgroundColor: '#00BF8F' }}>Registruj se</Link>
        </div>
      )}
    </nav>
  )
}
