import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useEffect } from 'react'

export default function ONamaPage() {
  useEffect(() => { document.title = 'O nama - Paws' }, [])

  return (
    <div className="bg-white">

      {/* Hero - split layout */}
      <section className="bg-gray-50 py-16 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#00BF8F' }}>O nama</p>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight">
                Paws aplikacija - <br />
                <span style={{ color: '#00BF8F' }}>tvoj najbolji prijatelj</span><br />
                za brigu o psu
              </h1>
              <p className="text-gray-500 text-lg mb-4 leading-relaxed">
                Ko smo mi? Tim ljubitelja pasa koji veruju da svaki ljubimac zaslužuje
                najbolju moguću brigu, a svaki vlasnik - mir i sigurnost.
              </p>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Paws je prva platforma u Srbiji koja omogućava <strong className="text-gray-700">online zakazivanje šetnji i čuvanja pasa</strong> sa
                proverenim šetačima u tvom komšiluku. Jednostavno, brzo i sigurno.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/walkers" className="inline-flex items-center justify-center text-white font-bold px-7 py-3.5 rounded-full transition-all hover:opacity-90 hover:-translate-y-0.5" style={{ backgroundColor: '#00BF8F' }}>
                  Pronađi šetača
                </Link>
                <Link to="/postani-setac" className="inline-flex items-center justify-center font-bold px-7 py-3.5 rounded-full border-2 transition-all hover:opacity-80" style={{ color: '#00BF8F', borderColor: '#00BF8F' }}>
                  Postani šetač
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative flex justify-center">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20" style={{ backgroundColor: '#FAAB43' }} />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-20" style={{ backgroundColor: '#00BF8F' }} />
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=700&auto=format&fit=crop"
                alt="Srećan pas"
                className="relative rounded-3xl w-full max-w-md object-cover"
                style={{ aspectRatio: '4/5', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission banner */}
      <section className="py-14 sm:py-20 px-4" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <p className="text-white text-lg sm:text-xl leading-relaxed">
              Paws je nastao kao rezultat <strong className="font-black">ljubavi prema psima</strong> i velike strasti sa ciljem da{' '}
              <strong className="font-black">olakša život vlasnicima</strong> i{' '}
              <strong className="font-black">šetačima</strong> širom Srbije.
              Naša posvećenost je ne samo da olakšamo brigu o ljubimcima, već i da unapredimo
              njihovu sreću i zadovoljstvo, jer za nas, ljubav prema životinjama nije samo reč, već{' '}
              <strong className="font-black">način života.</strong>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Misija & Vizija cards */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-5xl mb-4">🐶</div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Zašto postojimo</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6">
            <Reveal delay={0}>
              <div className="rounded-xl p-8 sm:p-10 h-full" style={{ backgroundColor: '#e6f9f3' }}>
                <h3 className="text-2xl font-black mb-1">Naša <span style={{ color: '#00BF8F' }}>misija</span></h3>
                <p className="font-bold text-gray-800 mb-4">Platforma koja povezuje ljubitelje pasa</p>
                <p className="text-gray-600 leading-relaxed">
                  Naša misija je da kroz Paws platformu unapredimo vezu između vlasnika pasa i šetača,
                  čineći proces zakazivanja šetnji i čuvanja <strong className="text-gray-800">jednostavnim, sigurnim i bezbrižnim</strong>.
                  Želimo da stvorimo harmoniju između ljubimaca i njihovih vlasnika, pružajući im
                  mogućnost da se brinu o svom četvoronožnom prijatelju sa lakoćom i zadovoljstvom.
                  Uz Paws, život sa psom postaje još lepši i praktičniji.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="rounded-xl p-8 sm:p-10 h-full" style={{ backgroundColor: '#fff5e6' }}>
                <h3 className="text-2xl font-black mb-1">Naša <span style={{ color: '#FAAB43' }}>vizija</span></h3>
                <p className="font-bold text-gray-800 mb-4">Budućnost brige o ljubimcima</p>
                <p className="text-gray-600 leading-relaxed">
                  Naša vizija je da budemo saveznici kako vlasnicima ljubimaca, tako i šetačima,
                  u boljoj organizaciji i upravljanju svakodnevnim potrebama pasa.
                  Želimo da Paws postane <strong className="text-gray-800">pouzdan partner</strong>,
                  pružajući vam jedinstvenu platformu koja olakšava brigu o ljubimcu,
                  unapređuje kvalitet usluga i gradi zajednicu zasnovanu na poverenju.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Mi smo vlasnici pasa */}
      <section className="bg-gray-50 py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Mi smo vlasnici pasa baš kao i vi!</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">Razumemo vaše brige jer ih i sami imamo svaki dan.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                ),
                title: 'Paws aplikacija',
                desc: 'Prva online platforma u Srbiji za zakazivanje šetnji i čuvanja pasa - dostupna na webu i kao mobilna aplikacija.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
                ),
                title: 'Više uživanja sa psom',
                desc: 'Paws unapređuje kvalitet života tvog ljubimca. Profesionalni šetači, praćenje u realnom vremenu i potpuna transparentnost.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                ),
                title: 'Ljubav prema psima',
                desc: 'U Paws timu, delimo istinsku strast prema psima i želimo da doprinesemo njihovom kvalitetu na najbolji mogući način.',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="bg-white rounded-xl p-8 text-center h-full" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#f0fdf9', color: '#00BF8F' }}>
                    {item.icon}
                  </div>
                  <h3 className="font-black text-lg mb-3" style={{ color: '#00BF8F' }}>{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Za vlasnike i šetače - split sections */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Za vlasnike */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-20">
            <Reveal>
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=700&auto=format&fit=crop" alt="Psi na šetnji" className="w-full h-52 sm:h-80 object-cover" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Za vlasnike pasa</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Pronađite proverene šetače po <strong className="text-gray-800">lokaciji, ceni i ocenama</strong>.
                  Rezervišite termin u svega par klikova i pratite šetnju na mapi u realnom vremenu.
                  Posle šetnje, ostavite ocenu i pomozite zajednici.
                </p>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Sa Paws-om, više ne morate da brinete kada ste na poslu ili putovanju.
                  Vaš pas je u sigurnim rukama, a vi u svakom trenutku znate gde se nalazi.
                  <strong className="text-gray-800"> GPS praćenje u realnom vremenu</strong> vam daje potpuni mir.
                </p>
                <Link to="/walkers" className="inline-flex items-center gap-2 font-bold transition-all hover:gap-3" style={{ color: '#00BF8F' }}>
                  Pronađi šetača <span>&rarr;</span>
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Za šetače */}
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Reveal delay={100}>
              <div className="order-2 lg:order-1">
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Za šetače</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Kreirajte profil, postavite <strong className="text-gray-800">sopstvene cene i raspored</strong>,
                  i počnite da zarađujete radeći ono što volite. Primajte rezervacije, komunicirajte
                  sa vlasnicima i izgradite reputaciju kroz ocene.
                </p>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Paws vam daje potpunu kontrolu - vi birate kada radite, koliko naplaćujete i
                  koje usluge nudite. <strong className="text-gray-800">Bez provizije, bez skrivenih troškova.</strong> Sve
                  što zaradite je vaše.
                </p>
                <Link to="/postani-setac" className="inline-flex items-center gap-2 font-bold transition-all hover:gap-3" style={{ color: '#FAAB43' }}>
                  Postani šetač <span>&rarr;</span>
                </Link>
              </div>
            </Reveal>
            <Reveal>
              <div className="rounded-xl overflow-hidden order-1 lg:order-2" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <img src="https://images.unsplash.com/photo-1601758003122-53c40e686a19?q=80&w=700&auto=format&fit=crop" alt="Šetač sa psom" className="w-full h-52 sm:h-80 object-cover" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '0 din', label: 'Cena registracije' },
            { value: '100%', label: 'Besplatna platforma' },
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

      {/* Postani deo zajednice - CTA */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full opacity-15" style={{ backgroundColor: '#FAAB43' }} />
              <img
                src="https://images.unsplash.com/photo-1554692918-08fa0fdc9db3?q=80&w=600&auto=format&fit=crop"
                alt="Vlasnica sa psom"
                className="relative rounded-xl w-full max-w-sm object-cover"
                style={{ aspectRatio: '4/3', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
              />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Želiš da budeš deo Paws priče?</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Bilo da tražiš šetača za svog ljubimca ili želiš da zarađuješ radeći sa psima -
                Paws je tu za tebe. Pridruži se stotinama korisnika koji već koriste platformu.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center justify-center text-white font-bold px-7 py-3.5 rounded-full transition-all hover:opacity-90" style={{ backgroundColor: '#FAAB43' }}>
                  Registruj se besplatno
                </Link>
                <Link to="/kako-funkcionise" className="inline-flex items-center justify-center font-bold px-7 py-3.5 rounded-full border-2 border-gray-200 text-gray-700 transition-all hover:border-gray-300">
                  Kako funkcioniše?
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
