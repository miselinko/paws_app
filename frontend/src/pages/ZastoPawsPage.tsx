import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useEffect } from 'react'

const REASONS = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
    ),
    title: 'GPS praćenje u realnom vremenu',
    desc: 'Uvek znaj gde je tvoj pas. Dok traje šetnja, pratiš lokaciju šetača na mapi - uživo, bez čekanja. Potpuni mir dok si na poslu ili obavljaš obaveze.',
    bg: '#e6f9f3',
    color: '#00BF8F',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
    ),
    title: 'Direktna komunikacija',
    desc: 'Ugrađeni chat omogućava brzu i sigurnu komunikaciju sa šetačem. Dogovorite detalje, podelite informacije o psu - sve bez razmene privatnih brojeva.',
    bg: '#fff5e6',
    color: '#FAAB43',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
    ),
    title: 'Ocene i recenzije',
    desc: 'Svaki šetač ima javne ocene od prethodnih klijenata. Sistem transparentnosti gradi poverenje i pomaže ti da pronađeš najboljeg šetača za svog psa.',
    bg: '#e6f9f3',
    color: '#00BF8F',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
    ),
    title: 'Web i mobilna aplikacija',
    desc: 'Koristi Paws na računaru ili telefonu - sve funkcionalnosti dostupne na oba mesta. Android aplikacija sa push notifikacijama za rezervacije i poruke.',
    bg: '#fff5e6',
    color: '#FAAB43',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
    ),
    title: 'AI asistent za pomoć',
    desc: 'Naš pametni asistent odgovara na pitanja o aplikaciji, pomaže oko rezervacija i daje korisne savete za negu i brigu o psima - dostupan 24/7.',
    bg: '#e6f9f3',
    color: '#00BF8F',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
    ),
    title: 'Sigurna platforma',
    desc: 'Rate limiting, verifikacija emaila, zaštita podataka i sigurna komunikacija. Tvoja sigurnost i sigurnost tvog ljubimca su nam na prvom mestu.',
    bg: '#fff5e6',
    color: '#FAAB43',
  },
]

const COMPARISON = [
  { feature: 'Online rezervacija', paws: true, others: false },
  { feature: 'GPS praćenje šetnje', paws: true, others: false },
  { feature: 'Chat sa šetačem', paws: true, others: false },
  { feature: 'Ocene i recenzije', paws: true, others: false },
  { feature: 'Mobilna aplikacija', paws: true, others: false },
  { feature: 'AI asistent', paws: true, others: false },
  { feature: 'Besplatna registracija', paws: true, others: true },
  { feature: 'Zauzeti termini kalendar', paws: true, others: false },
  { feature: 'Push notifikacije', paws: true, others: false },
]


export default function ZastoPawsPage() {
  useEffect(() => { document.title = 'Zašto PawsApp - PawsApp' }, [])

  return (
    <div className="bg-white">

      {/* Hero - split layout */}
      <section className="bg-gray-50 py-16 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#00BF8F' }}>Zašto Paws</p>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight">
                Jedina platforma koja nudi{' '}
                <span style={{ color: '#00BF8F' }}>kompletno iskustvo</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed mb-4">
                Od pretrage šetača do praćenja šetnje uživo - Paws nudi sve što ti
                treba za brigu o tvom ljubimcu. Funkcionalnosti koje nećeš naći na
                oglasnicima i klasičnim sajtovima.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Paws je jedina <strong className="text-gray-700">specijalizovana platforma za šetanje i čuvanje pasa u Srbiji</strong> sa
                ugrađenim GPS praćenjem, chat-om, ocenama, AI asistentom i mobilnom aplikacijom.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative flex justify-center">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20" style={{ backgroundColor: '#00BF8F' }} />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-20" style={{ backgroundColor: '#FAAB43' }} />
              <img
                src="https://images.unsplash.com/photo-1522276498395-f4f68f7f8454?q=80&w=700&auto=format&fit=crop"
                alt="Šetnja sa psom"
                className="relative rounded-3xl w-full max-w-md object-cover"
                style={{ aspectRatio: '4/5', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Razlozi - colored cards */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Šta nas izdvaja</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Funkcionalnosti koje nećeš naći na oglasnicima i klasičnim sajtovima.
                Paws je dizajniran da ti pruži <strong className="text-gray-700">potpunu kontrolu i sigurnost</strong>.
              </p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {REASONS.map((r, i) => (
              <Reveal key={r.title} delay={i * 80}>
                <div className="rounded-xl p-7 h-full" style={{ backgroundColor: r.bg }}>
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4" style={{ color: r.color }}>
                    {r.icon}
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-2">{r.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{r.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="py-14 px-4" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <p className="text-white text-lg sm:text-xl leading-relaxed">
              Paws je <strong className="font-black">potpuno besplatna platforma</strong> -bez provizije, bez skrivenih troškova.
              Registracija traje manje od 2 minuta, a pristup svim funkcionalnostima je{' '}
              <strong className="font-black">100% besplatan</strong> i za vlasnike i za šetače.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Poređenje */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Reveal>
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Paws vs. klasični oglasnici</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Uporedi mogućnosti Paws platforme sa Halo Oglasima, Supersiterkom i sličnim servisima.
                  Dok oglasnici nude samo kontakt podatke, <strong className="text-gray-800">Paws pruža kompletan ekosistem</strong> za
                  zakazivanje, komunikaciju, praćenje i ocenjivanje.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Sa Paws-om, ne moraš da brineš o pouzdanosti -sistem ocena i recenzija
                  osigurava da uvek biraš <strong className="text-gray-800">proverene šetače</strong> sa dokazanim iskustvom.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="bg-white rounded-xl overflow-x-auto border border-gray-100" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-4 px-5 font-bold text-gray-900">Funkcionalnost</th>
                      <th className="py-4 px-4 font-black text-center" style={{ color: '#00BF8F' }}>Paws</th>
                      <th className="py-4 px-4 font-bold text-gray-400 text-center">Ostali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((c, i) => (
                      <tr key={c.feature} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                        <td className="py-3 px-5 text-gray-700">{c.feature}</td>
                        <td className="py-3 px-4 text-center">
                          {c.paws
                            ? <span className="inline-flex w-6 h-6 rounded-full items-center justify-center text-white text-xs" style={{ backgroundColor: '#00BF8F' }}>&#10003;</span>
                            : <span className="inline-flex w-6 h-6 rounded-full bg-gray-200 items-center justify-center text-gray-400 text-xs">&#10005;</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.others
                            ? <span className="inline-flex w-6 h-6 rounded-full items-center justify-center text-white text-xs" style={{ backgroundColor: '#00BF8F' }}>&#10003;</span>
                            : <span className="inline-flex w-6 h-6 rounded-full bg-gray-200 items-center justify-center text-gray-400 text-xs">&#10005;</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Image gallery */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <img src="https://images.unsplash.com/photo-1601758003122-53c40e686a19?q=80&w=600&auto=format&fit=crop" alt="Šetanje psa u gradu" className="w-full h-44 sm:h-56 object-cover rounded-xl" />
              <img src="https://images.unsplash.com/photo-1554692918-08fa0fdc9db3?q=80&w=600&auto=format&fit=crop" alt="Vlasnica sa psom" className="w-full h-44 sm:h-56 object-cover rounded-xl" />
              <img src="https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?q=80&w=600&auto=format&fit=crop" alt="Psi u parku" className="w-full h-44 sm:h-56 object-cover rounded-xl col-span-2 sm:col-span-1" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Kako početi */}
      <section className="bg-gray-50 py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Počni za manje od 2 minuta</h2>
              <p className="text-gray-500 text-lg">Tri koraka do prvog zakazivanja.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Registruj se', desc: 'Kreiraj nalog kao vlasnik ili šetač. Verifikuj email i popuni profil - to je sve.', color: '#00BF8F' },
              { step: '2', title: 'Pronađi šetača', desc: 'Pregledaj profile šetača u svom gradu, uporedi cene i ocene, izaberi termin koji ti odgovara.', color: '#FAAB43' },
              { step: '3', title: 'Rezerviši i prati', desc: 'Zakaži šetnju ili čuvanje, komuniciraj putem chat-a i prati lokaciju psa uživo na mapi.', color: '#00BF8F' },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 100}>
                <div className="bg-white rounded-xl p-7 h-full flex flex-col" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg mb-4"
                    style={{ backgroundColor: s.color }}>{s.step}</div>
                  <h3 className="font-black text-gray-900 text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-600 leading-relaxed flex-1">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '0 din', label: 'Cena registracije' },
            { value: '< 2 min', label: 'Za kreiranje naloga' },
            { value: '24/7', label: 'Dostupnost platforme' },
            { value: '100%', label: 'Bez provizije' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="text-3xl sm:text-4xl font-black text-white mb-1">{s.value}</div>
              <div className="text-white/80 text-sm">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Spreman da probaš?</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Registracija je besplatna. Pronađi šetača za svog psa za manje od minut
                ili se registruj kao šetač i počni da zarađuješ.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/walkers" className="inline-flex items-center justify-center text-white font-bold px-7 py-3.5 rounded-full transition-all hover:opacity-90" style={{ backgroundColor: '#00BF8F' }}>
                  Pronađi šetača
                </Link>
                <Link to="/register" className="inline-flex items-center justify-center text-white font-bold px-7 py-3.5 rounded-full transition-all hover:opacity-90" style={{ backgroundColor: '#FAAB43' }}>
                  Registruj se besplatno
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="relative flex justify-center">
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-15" style={{ backgroundColor: '#00BF8F' }} />
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=600&auto=format&fit=crop"
                alt="Srećan zlatni retriver"
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
