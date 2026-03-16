import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Reveal from '../components/Reveal'

const SERVICES = [
  { id: 'walking', icon: '🦮', label: 'Šetanje', desc: 'Redovne šetnje u tvojoj blizini' },
  { id: 'boarding', icon: '🏠', label: 'Čuvanje', desc: 'Pas ostaje kod šetača' },
]

const STATS = [
  { value: '500+', label: 'Proverenih šetača' },
  { value: '2.000+', label: 'Zadovoljnih vlasnika' },
  { value: '4.9★', label: 'Prosečna ocena' },
  { value: '100%', label: 'Sigurno plaćanje' },
]

const HOW = [
  { num: '1', title: 'Pronađi šetača', desc: 'Pretraži dostupne šetače u blizini po usluzi, ceni i oceni.' },
  { num: '2', title: 'Rezerviši termin', desc: 'Izaberi slobodan termin, odaberi pse i pošalji zahtev.' },
  { num: '3', title: 'Opusti se', desc: 'Šetač dolazi po psa, a ti uživaš bez briga.' },
]

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedService, setSelectedService] = useState('walking')

  return (
    <div className="bg-white">

      {/* HERO */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: '680px',
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.55) 100%), url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=1600&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
            Tvoj pas zaslužuje<br />
            <span style={{ color: '#00BF8F' }}>najboljeg šetača</span>
          </h1>
          <p className="text-white/80 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            Povezi se sa proverenim šetačima i čuvarima pasa u tvojoj blizini.
          </p>

          {/* Service picker */}
          <div className="bg-white rounded-2xl p-2 flex gap-1 mb-4 max-w-md mx-auto" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
            {SERVICES.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s.id)}
                className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all"
                style={selectedService === s.id ? { backgroundColor: '#00BF8F', color: 'white' } : { color: '#555', backgroundColor: 'transparent' }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate(`/walkers?usluga=${selectedService}`)}
            className="inline-flex items-center gap-2 text-white font-bold text-base px-8 py-4 rounded-xl transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ backgroundColor: '#FAAB43', boxShadow: '0 4px 16px rgba(250,171,67,0.4)' }}
          >
            Pronađi šetača
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-gray-900 py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s, i) => (
            <Reveal key={s.value} delay={i * 80}>
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Sve usluge na jednom mestu</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Od kratkih šetnji do višednevnog čuvanja — pronađi pravo rešenje za svog ljubimca.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {[
              {
                icon: '🦮',
                title: 'Šetanje pasa',
                desc: 'Iskusni šetači dolaze po tvog psa i vode ga na sigurnu i prijatnu šetnju.',
                img: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?q=80&w=800&auto=format&fit=crop',
                service: 'walking',
              },
              {
                icon: '🏠',
                title: 'Čuvanje kod šetača',
                desc: 'Tvoj pas ostaje u toplom domu kod proverenog čuvara dok ti putuješ.',
                img: 'https://images.unsplash.com/photo-1560743641-3914f2c45636?q=80&w=800&auto=format&fit=crop',
                service: 'boarding',
              },
            ].map((svc, i) => (
              <Reveal key={svc.title} delay={i * 100}>
              <Link
                to={`/walkers?usluga=${svc.service}`}
                key={svc.title}
                className="group rounded-2xl overflow-hidden border border-gray-100 hover:border-transparent transition-all hover:-translate-y-1"
                style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.1)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(71,71,71,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 11px rgba(71,71,71,0.1)')}
              >
                <div className="h-48 overflow-hidden">
                  <img src={svc.img} alt={svc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{svc.icon}</span>
                    <h3 className="font-black text-gray-900 text-lg">{svc.title}</h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{svc.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold" style={{ color: '#00BF8F' }}>
                    Pronađi šetača
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Kako funkcioniše?</h2>
            <p className="text-gray-500 text-lg">Rezerviši za nekoliko minuta, bez komplikacija.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW.map((step, i) => (
              <Reveal key={step.num} delay={i * 120}>
              <div className="relative text-center">
                {i < HOW.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-px border-t-2 border-dashed border-gray-200" />
                )}
                <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center text-white text-2xl font-black relative z-10"
                  style={{ backgroundColor: '#00BF8F' }}>
                  {step.num}
                </div>
                <h3 className="font-black text-gray-900 text-xl mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
              </Reveal>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/walkers')}
              className="inline-flex items-center gap-2 font-bold text-white px-8 py-4 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: '#00BF8F' }}
            >
              Počni odmah
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* CTA for walkers */}
      {!user && (
        <Reveal from="fade">
        <section
          className="py-20 px-4 relative flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.5)), url('https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?q=80&w=1200&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="text-center max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Postani šetač na Paws-u
            </h2>
            <p className="text-white/75 text-lg mb-8">
              Zarađuj radeći ono što voliš. Sam postavljaš cene i raspored.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                to="/register"
                className="font-bold text-white px-7 py-3.5 rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: '#FAAB43' }}
              >
                Registruj se kao šetač
              </Link>
              <Link
                to="/walkers"
                className="font-semibold text-white px-7 py-3.5 rounded-xl border-2 border-white/50 hover:border-white transition-colors"
              >
                Pregledaj šetače
              </Link>
            </div>
          </div>
        </section>
        </Reveal>
      )}

      {/* Quick links for logged-in users */}
      {user && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Dobrodošao nazad, {user.first_name}!</h2>
            <p className="text-gray-500 mb-8">Šta bi danas uradio?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Reveal delay={0}><Link to="/walkers" className="block bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#00BF8F] transition-all hover:-translate-y-0.5 group" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
                <div className="text-3xl mb-3">🔍</div>
                <div className="font-bold text-gray-900">Pronađi šetača</div>
                <div className="text-sm text-gray-500 mt-1">Pretraži dostupne šetače</div>
              </Link></Reveal>
              <Reveal delay={100}><Link to="/reservations" className="block bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#00BF8F] transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
                <div className="text-3xl mb-3">📅</div>
                <div className="font-bold text-gray-900">Rezervacije</div>
                <div className="text-sm text-gray-500 mt-1">Pregledaj aktivne termine</div>
              </Link></Reveal>
              <Reveal delay={200}>{user.role === 'owner' ? (
                <Link to="/my-dogs" className="block bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#00BF8F] transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
                  <div className="text-3xl mb-3">🐕</div>
                  <div className="font-bold text-gray-900">Moji psi</div>
                  <div className="text-sm text-gray-500 mt-1">Upravljaj profilima pasa</div>
                </Link>
              ) : (
                <Link to="/profile" className="block bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#00BF8F] transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
                  <div className="text-3xl mb-3">👤</div>
                  <div className="font-bold text-gray-900">Moj profil</div>
                  <div className="text-sm text-gray-500 mt-1">Uredi profil šetača</div>
                </Link>
              )}</Reveal>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
