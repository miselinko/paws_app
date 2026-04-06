import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Reveal from '../components/Reveal'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedService, setSelectedService] = useState('walking')

  return (
    <div className="bg-white">

      {/* HERO - split layout */}
      <section className="bg-gray-50 py-16 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <h1 className="text-3xl sm:text-5xl lg:text-[3.4rem] font-black text-gray-900 leading-tight mb-5">
                Prva aplikacija za{' '}
                <span style={{ color: '#00BF8F' }}>online zakazivanje</span>{' '}
                šetanja i čuvanja pasa
              </h1>
              <p className="text-gray-500 text-lg mb-4 leading-relaxed">
                Konačno i kod nas! Povežite se sa <strong className="text-gray-700">proverenim šetačima</strong> u
                vašoj blizini. Zakažite termin u par klikova i pratite šetnju u realnom vremenu.
              </p>

              {/* Service picker */}
              <div className="bg-white rounded-full p-1.5 flex gap-1 mb-5 max-w-xs" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                {[
                  { id: 'walking', label: 'Šetanje' },
                  { id: 'boarding', label: 'Čuvanje' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s.id)}
                    className="flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all"
                    style={selectedService === s.id ? { backgroundColor: '#00BF8F', color: 'white' } : { color: '#666' }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/walkers?usluga=${selectedService}`)}
                  className="inline-flex items-center gap-2 text-white font-bold text-base px-8 py-4 rounded-full transition-all hover:opacity-90 hover:-translate-y-0.5"
                  style={{ backgroundColor: '#FAAB43', boxShadow: '0 4px 16px rgba(250,171,67,0.35)' }}
                >
                  Pronađi šetača
                </button>
                {!user && (
                  <Link
                    to="/postani-setac"
                    className="inline-flex items-center font-bold px-7 py-4 rounded-full border-2 transition-all hover:opacity-80"
                    style={{ color: '#00BF8F', borderColor: '#00BF8F' }}
                  >
                    Postani šetač
                  </Link>
                )}
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative flex justify-center">
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20" style={{ backgroundColor: '#FAAB43' }} />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: '#00BF8F' }} />
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=700&auto=format&fit=crop"
                alt="Srećan zlatni retriver"
                className="relative rounded-3xl w-full max-w-md object-cover max-h-72 sm:max-h-none"
                style={{ aspectRatio: '4/5', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 koraka mini */}
      <section className="py-14" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-4xl mx-auto px-4 grid sm:grid-cols-3 gap-8 text-center text-white">
          {[
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              ),
              title: 'Izaberi',
              desc: 'Izaberi šetača po lokaciji, ceni i ocenama.',
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
              ),
              title: 'Rezerviši',
              desc: 'Potvrdi termin u dva klika - brzo i jednostavno!',
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
              ),
              title: 'Uživaj',
              desc: 'Uživaj u miru dok je tvoj pas u sigurnim rukama.',
            },
          ].map((step, i) => (
            <Reveal key={step.title} delay={i * 100}>
              <div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  {step.icon}
                </div>
                <h3 className="font-black text-xl mb-1">{step.title}</h3>
                <p className="text-white/80 text-sm">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* O platformi */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
              <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=700&auto=format&fit=crop" alt="Psi na šetnji" className="w-full h-52 sm:h-80 object-cover" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#00BF8F' }}>O platformi</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
                Paws - prva aplikacija za <span style={{ color: '#00BF8F' }}>online zakazivanje</span> šetanja i čuvanja pasa
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Paws je praktična aplikacija koja ti omogućava da brzo i lako
                zakažeš šetnju za svog psa, pronađeš čuvara ili ponudiš usluge šetanja -
                sve na jednom mestu. Dovoljno je samo <strong className="text-gray-800">dva klika</strong> i tvoj
                ljubimac ima zakazan termin za šetnju ili brigu.
              </p>
              <Link to="/o-nama" className="inline-flex items-center gap-2 font-bold transition-all hover:gap-3" style={{ color: '#00BF8F' }}>
                Saznaj više <span>&rarr;</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Usluge */}
      <section className="bg-gray-50 py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Dostupne usluge</h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">Od kratkih šetnji do višednevnog čuvanja - pronađi pravo rešenje za svog ljubimca.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Reveal delay={0}>
              <Link to="/walkers?usluga=walking" className="group block rounded-xl overflow-hidden bg-white transition-all hover:-translate-y-1" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div className="h-48 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=800&auto=format&fit=crop" alt="Šetanje pasa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="font-black text-gray-900 text-xl mb-2">Šetanje pasa</h3>
                  <p className="text-gray-500 leading-relaxed mb-3">
                    Iskusni šetači dolaze po tvog psa i vode ga na sigurnu i prijatnu šetnju.
                    <strong className="text-gray-700"> Praćenje na mapi u realnom vremenu</strong> ti daje potpuni mir.
                  </p>
                  <span className="text-sm font-bold" style={{ color: '#00BF8F' }}>Pronađi šetača</span>
                </div>
              </Link>
            </Reveal>
            <Reveal delay={100}>
              <Link to="/walkers?usluga=boarding" className="group block rounded-xl overflow-hidden bg-white transition-all hover:-translate-y-1" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div className="h-48 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?q=80&w=800&auto=format&fit=crop" alt="Čuvanje pasa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="font-black text-gray-900 text-xl mb-2">Čuvanje pasa</h3>
                  <p className="text-gray-500 leading-relaxed mb-3">
                    Tvoj pas ostaje u toplom domu kod proverenog čuvara dok ti putuješ ili si na poslu.
                    <strong className="text-gray-700"> Sigurno okruženje</strong> i redovne šetnje.
                  </p>
                  <span className="text-sm font-bold" style={{ color: '#00BF8F' }}>Pronađi čuvara</span>
                </div>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Kako funkcioniše - detaljno */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Kako se koristi Paws?</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Korišćenjem Paws platforme, rezervacija termina za šetanje ili čuvanje psa je brza i jednostavna procedura.
              </p>
            </div>
          </Reveal>

          {/* Korak 1 */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
            <Reveal>
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?q=80&w=700&auto=format&fit=crop" alt="Pretraga šetača" className="w-full h-48 sm:h-64 object-cover" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: '#00BF8F' }}>1</div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Pronađi šetača u blizini</h3>
                <p className="text-gray-600 leading-relaxed">
                  Na platformi nalaziš <strong className="text-gray-800">listu partnerskih šetača</strong> u svom
                  gradu. Filtriraj po lokaciji, usluzi, ceni i ocenama.
                  Pogledaj profil, recenzije i dostupne termine svakog šetača.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Korak 2 */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
            <Reveal delay={100}>
              <div className="order-2 lg:order-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: '#00BF8F' }}>2</div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Rezerviši termin</h3>
                <p className="text-gray-600 leading-relaxed">
                  Jednostavno pregledaš <strong className="text-gray-800">dostupne termine</strong> u kalendaru.
                  Izaberi datum i vreme, selektuj pse i potvrdi rezervaciju.
                  Šetač prima push notifikaciju i potvrđuje termin.
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div className="rounded-xl overflow-hidden order-1 lg:order-2" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1601758003122-53c40e686a19?q=80&w=700&auto=format&fit=crop" alt="Rezervacija termina" className="w-full h-48 sm:h-64 object-cover" />
              </div>
            </Reveal>
          </div>

          {/* Korak 3 */}
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1522276498395-f4f68f7f8454?q=80&w=700&auto=format&fit=crop" alt="Prati šetnju" className="w-full h-48 sm:h-64 object-cover" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: '#00BF8F' }}>3</div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Prati i oceni</h3>
                <p className="text-gray-600 leading-relaxed">
                  Dok traje šetnja, pratiš <strong className="text-gray-800">lokaciju šetača na mapi u realnom vremenu</strong>.
                  Posle šetnje, ostavi ocenu i recenziju i pomozi drugim vlasnicima.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="text-center mt-14">
              <Link
                to="/kako-funkcionise"
                className="inline-flex items-center gap-2 font-bold transition-all hover:gap-3"
                style={{ color: '#00BF8F' }}
              >
                Saznaj više o tome kako funkcioniše <span>&rarr;</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Banner */}
      <section className="py-14 px-4" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <p className="text-white text-lg sm:text-xl leading-relaxed">
              Paws je <strong className="font-black">potpuno besplatna platforma</strong> - bez provizije, bez skrivenih troškova.
              Registracija traje manje od 2 minuta, a pristup svim funkcionalnostima je{' '}
              <strong className="font-black">100% besplatan</strong> i za vlasnike i za šetače.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Postani šetač */}
      {!user && (
        <section className="py-14 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            <Reveal delay={100}>
              <div className="order-2 lg:order-1">
                <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#FAAB43' }}>Postani partner</p>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
                  Istraži nove mogućnosti!
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Zajedno možemo raditi na unapređenju dobrobiti svih ljubimaca i njihovih vlasnika.
                  Ako voliš pse i želiš da <strong className="text-gray-800">zarađuješ fleksibilno</strong> - Paws je pravo mesto za tebe.
                </p>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Pridruživanjem možeš proširiti bazu klijenata, pružati kvalitetne usluge
                  i postati deo zajednice koja se brine o psima. <strong className="text-gray-800">Bez provizije</strong> - sve što zaradiš je tvoje.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/register"
                    className="inline-flex items-center font-bold text-white px-7 py-3.5 rounded-full transition-all hover:opacity-90"
                    style={{ backgroundColor: '#FAAB43' }}
                  >
                    Registruj se kao šetač
                  </Link>
                  <Link
                    to="/postani-setac"
                    className="inline-flex items-center font-bold px-7 py-3.5 rounded-full border-2 transition-all hover:opacity-80"
                    style={{ color: '#FAAB43', borderColor: '#FAAB43' }}
                  >
                    Saznaj više
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal>
              <div className="relative flex justify-center order-1 lg:order-2">
                <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full opacity-15" style={{ backgroundColor: '#FAAB43' }} />
                <img
                  src="https://images.unsplash.com/photo-1527526029430-319f10814151?q=80&w=600&auto=format&fit=crop"
                  alt="Šetač sa psima"
                  className="relative rounded-xl w-full max-w-sm object-cover"
                  style={{ aspectRatio: '3/4', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Quick links for logged-in users */}
      {user && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Dobrodošao nazad, {user.first_name}!</h2>
              <p className="text-gray-500 mb-8">Šta bi danas uradio?</p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Reveal delay={0}><Link to="/walkers" className="block bg-white rounded-xl p-6 border border-gray-100 hover:border-transparent transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </div>
                <div className="font-bold text-gray-900">Pronađi šetača</div>
                <div className="text-sm text-gray-500 mt-1">Pretraži dostupne šetače</div>
              </Link></Reveal>
              <Reveal delay={100}><Link to="/reservations" className="block bg-white rounded-xl p-6 border border-gray-100 hover:border-transparent transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#fff5e6', color: '#FAAB43' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                </div>
                <div className="font-bold text-gray-900">Rezervacije</div>
                <div className="text-sm text-gray-500 mt-1">Pregledaj aktivne termine</div>
              </Link></Reveal>
              <Reveal delay={200}>{user.role === 'owner' ? (
                <Link to="/my-dogs" className="block bg-white rounded-xl p-6 border border-gray-100 hover:border-transparent transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F' }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="8" cy="6" rx="2" ry="2.5"/><ellipse cx="16" cy="6" rx="2" ry="2.5"/><ellipse cx="4.5" cy="12" rx="2" ry="2.5"/><ellipse cx="19.5" cy="12" rx="2" ry="2.5"/><path d="M12 22c-3.5 0-6-2.2-6-5 0-2.5 2-4.5 3.5-6 .7-.7 1.5-1 2.5-1s1.8.3 2.5 1c1.5 1.5 3.5 3.5 3.5 6 0 2.8-2.5 5-6 5z"/></svg>
                  </div>
                  <div className="font-bold text-gray-900">Moji psi</div>
                  <div className="text-sm text-gray-500 mt-1">Upravljaj profilima pasa</div>
                </Link>
              ) : (
                <Link to="/profile" className="block bg-white rounded-xl p-6 border border-gray-100 hover:border-transparent transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <div className="font-bold text-gray-900">Moj profil</div>
                  <div className="text-sm text-gray-500 mt-1">Uredi profil šetača</div>
                </Link>
              )}</Reveal>
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-14" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '0 din', label: 'Cena registracije' },
            { value: '100%', label: 'Bez provizije' },
            { value: '4.9', label: 'Prosečna ocena' },
            { value: '24/7', label: 'Dostupnost' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="text-3xl sm:text-4xl font-black text-white mb-1">{s.value}</div>
              <div className="text-white/80 text-sm">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

    </div>
  )
}
