import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

const EXPLORE = [
  { to: '/o-nama', label: 'O nama' },
  { to: '/zasto-paws', label: 'Zašto PawsApp' },
  { to: '/kako-funkcionise', label: 'Kako funkcioniše' },
  { to: '/postani-setac', label: 'Postani šetač' },
  { to: '/faq', label: 'FAQ' },
]

const USEFUL = [
  { to: '/walkers', label: 'Pronađi šetača' },
  { to: '/register', label: 'Registruj se' },
  { to: '/login', label: 'Prijavi se' },
  { to: '/kontakt', label: 'Kontakt' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Branding */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src={logoImg} alt="PawsApp" className="w-9 h-9 rounded-xl object-cover" />
              <span className="text-xl font-black text-white tracking-tight">PawsApp</span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Platforma za šetanje i čuvanje pasa u Srbiji. Povezujemo vlasnike sa proverenim šetačima.
            </p>
          </div>

          {/* Istraži */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Istraži</h4>
            <ul className="space-y-2.5">
              {EXPLORE.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Korisno */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Korisno</h4>
            <ul className="space-y-2.5">
              {USEFUL.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Kontakt</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="mailto:info@paws.rs" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  info@paws.rs
                </a>
              </li>
              <li className="flex items-center gap-3 pt-2">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} PawsApp. Sva prava zadržana.
        </div>
      </div>
    </footer>
  )
}
