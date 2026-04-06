import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useEffect } from 'react'

export default function KakoFunkcionisePage() {
  useEffect(() => { document.title = 'Kako funkcioniše - Paws' }, [])

  return (
    <div className="bg-white">

      {/* Hero - split layout */}
      <section className="bg-gray-50 py-16 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#00BF8F' }}>Kako funkcioniše</p>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight">
                Koristi Paws aplikaciju,<br />
                rezervacija je <span style={{ color: '#00BF8F' }}>brza i jednostavna</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed">
                Korišćenjem Paws platforme, rezervacija termina za šetanje ili čuvanje psa je brza i
                jednostavna procedura. Pronađi šetača u svom komšiluku, zakaži termin
                i prati šetnju u realnom vremenu - sve na jednom mestu.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative flex justify-center">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20" style={{ backgroundColor: '#00BF8F' }} />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-20" style={{ backgroundColor: '#FAAB43' }} />
              <img
                src="https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?q=80&w=700&auto=format&fit=crop"
                alt="Vlasnik sa psom"
                className="relative rounded-3xl w-full max-w-md object-cover"
                style={{ aspectRatio: '4/5', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 koraka - ikonice */}
      <section className="py-14" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-4xl mx-auto px-4 grid sm:grid-cols-3 gap-8 text-center text-white">
          {[
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              ),
              title: 'Izaberi',
              desc: 'Izaberi šetača po lokaciji, usluzi, ceni i ocenama.',
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

      {/* Detaljno - Za vlasnike */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Kako se koristi Paws?</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Korišćenjem Paws platforme, proces pronalaženja šetača je brz i jednostavan.
                Evo detaljnog vodiča za vlasnike i šetače.
              </p>
            </div>
          </Reveal>

          {/* Korak 1 */}
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 items-center mb-12 sm:mb-16">
            <Reveal>
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=700&auto=format&fit=crop" alt="Psi na šetnji" className="w-full h-56 sm:h-72 object-cover" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: '#00BF8F' }}>1</div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Pretraži šetače u blizini</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Prvo, na platformi nalaziš <strong className="text-gray-800">listu partnerskih šetača</strong> u svom
                  gradu ili komšiluku. Filtriraj po lokaciji, usluzi (šetanje ili čuvanje),
                  maksimalnoj ceni i prosečnoj oceni.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Pogledaj profil svakog šetača - opise, slike, recenzije drugih vlasnika i
                  dostupne termine. Sve informacije su ti na dlanu.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Korak 2 */}
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 items-center mb-12 sm:mb-16">
            <Reveal delay={100}>
              <div className="order-2 lg:order-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: '#00BF8F' }}>2</div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Rezerviši termin koji ti odgovara</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Zatim, jednostavno pregledaš <strong className="text-gray-800">dostupne termine</strong> u
                  interaktivnom kalendaru. Kada pronađeš termin koji ti odgovara, jednostavno
                  izabereš željeni datum i vreme i potvrdite svoju rezervaciju.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Šetač potvrđuje ili odbija rezervaciju, a ti dobijaš <strong className="text-gray-800">push notifikaciju</strong> o statusu.
                  Možeš i da komuniciraš sa šetačem kroz ugrađeni chat pre i posle rezervacije.
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div className="rounded-xl overflow-hidden order-1 lg:order-2" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1601758003122-53c40e686a19?q=80&w=700&auto=format&fit=crop" alt="Šetanje psa" className="w-full h-56 sm:h-72 object-cover" />
              </div>
            </Reveal>
          </div>

          {/* Korak 3 */}
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 items-center">
            <Reveal>
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1522276498395-f4f68f7f8454?q=80&w=700&auto=format&fit=crop" alt="Šetnja sa psom u prirodi" className="w-full h-56 sm:h-72 object-cover" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: '#00BF8F' }}>3</div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Prati šetnju i oceni iskustvo</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Dok traje šetnja, pratiš <strong className="text-gray-800">lokaciju šetača na mapi u realnom vremenu</strong>.
                  Uvek znaš gde je tvoj pas i koliko je šetnja trajala.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Paws omogućava da brzo i efikasno organizuješ brigu o svom ljubimcu,
                  a posle šetnje ostaviš ocenu i recenziju. Tako pomažeš drugim vlasnicima
                  da pronađu najbolje šetače u svojoj blizini.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Info banner */}
      <section className="py-14 px-4" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <p className="text-white text-lg sm:text-xl leading-relaxed">
              Paws omogućava da <strong className="font-black">brzo i efikasno</strong> organizuješ
              brigu o svom ljubimcu. Naši šetači prolaze kroz sistem ocena
              koji pruža <strong className="font-black">jednostavnost i pouzdanost</strong> u
              celom procesu zakazivanja.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Dostupne usluge */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Dostupne usluge</h2>
              <p className="text-gray-500 text-lg">Sve što je potrebno za brigu o tvom ljubimcu - na jednom mestu.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6">
            <Reveal delay={0}>
              <Link to="/walkers?usluga=walking" className="group block rounded-xl overflow-hidden transition-all hover:-translate-y-1" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
                <div className="h-48 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=800&auto=format&fit=crop" alt="Šetanje pasa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="font-black text-gray-900 text-xl mb-2">Šetanje pasa</h3>
                  <p className="text-gray-500 leading-relaxed mb-3">
                    Iskusni šetači dolaze po tvog psa i vode ga na sigurnu i prijatnu šetnju.
                    Biraj trajanje od 30 min do 3 sata. <strong className="text-gray-700">Praćenje na mapi u realnom vremenu</strong> ti
                    daje potpuni mir dok si na poslu ili obavljaš obaveze.
                  </p>
                  <span className="text-sm font-bold" style={{ color: '#00BF8F' }}>Pronađi šetača</span>
                </div>
              </Link>
            </Reveal>
            <Reveal delay={100}>
              <Link to="/walkers?usluga=boarding" className="group block rounded-xl overflow-hidden transition-all hover:-translate-y-1" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
                <div className="h-48 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?q=80&w=800&auto=format&fit=crop" alt="Čuvanje pasa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="font-black text-gray-900 text-xl mb-2">Čuvanje pasa</h3>
                  <p className="text-gray-500 leading-relaxed mb-3">
                    Tvoj pas ostaje u toplom domu kod proverenog čuvara dok ti putuješ ili si na poslu.
                    Čuvari nude <strong className="text-gray-700">sigurno okruženje</strong> i redovne šetnje tokom boravka.
                    Dogovori detalje kroz ugrađeni chat.
                  </p>
                  <span className="text-sm font-bold" style={{ color: '#00BF8F' }}>Pronađi čuvara</span>
                </div>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Spreman za početak?</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Pronađi šetača za svog psa ili počni da zarađuješ kao šetač.
                Registracija je besplatna i traje manje od 2 minuta.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/walkers" className="inline-flex items-center justify-center text-white font-bold px-7 py-3.5 rounded-full transition-all hover:opacity-90" style={{ backgroundColor: '#00BF8F' }}>
                  Pronađi šetača
                </Link>
                <Link to="/postani-setac" className="inline-flex items-center justify-center font-bold px-7 py-3.5 rounded-full border-2 transition-all hover:opacity-80" style={{ color: '#00BF8F', borderColor: '#00BF8F' }}>
                  Postani šetač
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="relative flex justify-center">
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-15" style={{ backgroundColor: '#00BF8F' }} />
              <img
                src="https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=600&auto=format&fit=crop"
                alt="Srećan pas"
                className="relative rounded-xl w-full max-w-sm object-cover"
                style={{ aspectRatio: '4/3', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
