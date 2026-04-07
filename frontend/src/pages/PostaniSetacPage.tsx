import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useEffect } from 'react'

export default function PostaniSetacPage() {
  useEffect(() => { document.title = 'Postani šetač - PawsApp' }, [])

  return (
    <div className="bg-white">

      {/* Hero - split layout */}
      <section className="bg-gray-50 py-16 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#FAAB43' }}>Postani partner</p>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight">
                Istraži nove mogućnosti sa{' '}
                <span style={{ color: '#00BF8F' }}>Paws</span>-om!
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed mb-4">
                Zajedno možemo raditi na unapređenju dobrobiti i zadovoljstva svih
                ljubimaca i njihovih vlasnika. Ako voliš pse i želiš da zarađuješ
                fleksibilno - Paws je pravo mesto za tebe.
              </p>
              <p className="text-gray-500 leading-relaxed mb-8">
                Imamo posebnu ponudu za sve! Pridruživanjem možeš <strong className="text-gray-700">proširiti bazu
                klijenata</strong>, imaćeš širu zajednicu koja se brine o pet ljubimcima, možete
                pružati kvalitetne usluge, podržati i pomagati vlasnicima pasa i omogućiti im
                da ostvare veći uticaj na zajednicu.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-white font-bold text-base px-8 py-4 rounded-full transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{ backgroundColor: '#FAAB43', boxShadow: '0 4px 16px rgba(250,171,67,0.35)' }}
              >
                Registruj se kao šetač
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative flex justify-center">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20" style={{ backgroundColor: '#FAAB43' }} />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-20" style={{ backgroundColor: '#00BF8F' }} />
              <img
                src="https://images.unsplash.com/photo-1527526029430-319f10814151?q=80&w=700&auto=format&fit=crop"
                alt="Šetač sa psima"
                className="relative rounded-3xl w-full max-w-md object-cover"
                style={{ aspectRatio: '4/5', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Zašto postati šetač - banner */}
      <section className="py-14 px-4" style={{ backgroundColor: '#FAAB43' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <p className="text-white text-lg sm:text-xl leading-relaxed">
              Kao šetač na Paws platformi, dobijaš pristup <strong className="font-black">stotinama vlasnika pasa</strong> u
              tvom gradu. Sam biraš raspored, cene i usluge - <strong className="font-black">bez provizije</strong>,
              bez skrivenih troškova. Sve što zaradiš je 100% tvoje.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Benefiti */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Zašto postati šetač?</h2>
              <p className="text-gray-500 text-lg">Pridruži se šetačima koji već zarađuju na Paws-u.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ),
                title: 'Fleksibilan raspored',
                desc: 'Sam biraš kada radiš. Podesi raspored prema svom životu - jutro, popodne, vikend ili kasno uveče. Ti si svoj šef i imaš potpunu kontrolu nad vremenom.',
                bg: '#e6f9f3',
                color: '#00BF8F',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                ),
                title: 'Dodatna zarada bez provizije',
                desc: 'Postavi sopstvene cene za šetanje i čuvanje. Zarađuj radeći ono što voliš - Paws ne uzima nikakvu proviziju. 100% zarade ostaje tebi.',
                bg: '#fff5e6',
                color: '#FAAB43',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                ),
                title: 'Upoznaj ljude i pse',
                desc: 'Postani deo zajednice ljubitelja pasa u svom gradu. Upoznaj nove ljude, izgradi trajne odnose sa klijentima i provedu vreme sa divnim psima svaki dan.',
                bg: '#e6f9f3',
                color: '#00BF8F',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                ),
                title: 'Izgradi reputaciju',
                desc: 'Ocene i recenzije ti pomažu da izgradite profil koji privlači nove klijente. Što više šetnji obavite, to je vaš profil jači i vidljiviji na platformi.',
                bg: '#fff5e6',
                color: '#FAAB43',
              },
            ].map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <div className="rounded-xl p-8 h-full" style={{ backgroundColor: b.bg }}>
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4" style={{ color: b.color }}>
                    {b.icon}
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-2">{b.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Kako da počneš - koraci */}
      <section className="bg-gray-50 py-14 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Kako da počneš?</h2>
              <p className="text-gray-500 text-lg">Tri jednostavna koraka do prve zarade na Paws platformi.</p>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                num: '1',
                title: 'Registruj se',
                desc: 'Kreiraj besplatan nalog kao šetač. Popuni svoj profil sa opisom, slikom i iskustvom. Navedi da li nudiš šetanje, čuvanje ili oba.',
                img: 'https://images.unsplash.com/photo-1554692918-08fa0fdc9db3?q=80&w=500&auto=format&fit=crop',
              },
              {
                num: '2',
                title: 'Postavi raspored i cene',
                desc: 'Definiši dostupne dane i sate. Postavi cenu po satu za šetanje i dnevnu cenu za čuvanje. Cene su potpuno pod tvojom kontrolom.',
                img: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?q=80&w=500&auto=format&fit=crop',
              },
              {
                num: '3',
                title: 'Počni da zarađuješ',
                desc: 'Primi prvu rezervaciju, obavi šetnju ili čuvanje i dobij ocenu od vlasnika. Izgradi reputaciju i privuci stalne klijente.',
                img: 'https://images.unsplash.com/photo-1601758003122-53c40e686a19?q=80&w=500&auto=format&fit=crop',
              },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <div className="bg-white rounded-xl overflow-hidden h-full" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                  <div className="h-44 overflow-hidden">
                    <img src={step.img} alt={step.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm mb-3" style={{ backgroundColor: '#FAAB43' }}>
                      {step.num}
                    </div>
                    <h3 className="font-black text-gray-900 text-lg mb-2">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Uslovi */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Šta je potrebno?</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Da bi postao šetač na Paws platformi, potrebno je ispuniti nekoliko jednostavnih uslova.
                Nema komplikacija - cilj nam je da omogućimo <strong className="text-gray-800">svima koji vole pse</strong> da
                pruže kvalitetnu uslugu vlasnicima.
              </p>
              <ul className="space-y-4">
                {[
                  'Punoletna osoba (18+ godina)',
                  'Ljubav prema psima i iskustvo u radu sa životinjama',
                  'Pouzdanost i odgovornost',
                  'Mogućnost šetnje pasa ili primanja kod sebe',
                  'Pristup internetu za upravljanje rezervacijama',
                ].map((r, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs" style={{ backgroundColor: '#00BF8F' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="relative flex justify-center">
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-15" style={{ backgroundColor: '#FAAB43' }} />
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=600&auto=format&fit=crop"
                alt="Zlatni retriver"
                className="relative rounded-xl w-full max-w-sm object-cover"
                style={{ aspectRatio: '3/4', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 px-4" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Spreman da počneš?</h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Registracija je besplatna i traje manje od 2 minuta.
              Postani deo Paws zajednice i počni da zarađuješ radeći ono što voliš.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="inline-flex items-center justify-center font-bold px-8 py-3.5 rounded-full transition-all hover:opacity-90 bg-white" style={{ color: '#00BF8F' }}>
                Registruj se kao šetač
              </Link>
              <Link to="/faq" className="inline-flex items-center justify-center text-white font-bold px-8 py-3.5 rounded-full border-2 border-white/40 transition-all hover:bg-white/10">
                Imaš pitanja? Pogledaj FAQ
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
