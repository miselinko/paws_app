import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'

interface FaqItem { q: string; a: string; cat: string }

const CATEGORIES = [
  { id: 'all', label: 'Sve' },
  { id: 'general', label: 'Opšta' },
  { id: 'owners', label: 'Za vlasnike' },
  { id: 'walkers', label: 'Za šetače' },
  { id: 'safety', label: 'Sigurnost' },
  { id: 'payment', label: 'Plaćanje' },
]

const FAQS: FaqItem[] = [
  { cat: 'general', q: 'Šta je PawsApp?', a: 'PawsApp je online platforma koja povezuje vlasnike pasa sa proverenim šetačima i čuvarima u Srbiji. Kroz naš sajt i mobilnu aplikaciju možete lako pronaći, rezervisati i oceniti šetača u svojoj blizini. Sve funkcionalnosti su besplatne za korišćenje.' },
  { cat: 'general', q: 'Da li je registracija besplatna?', a: 'Da, registracija je potpuno besplatna i za vlasnike i za šetače. Ne naplaćujemo nikakvu proviziju niti mesečnu pretplatu. Svi prihodi od šetnji i čuvanja idu direktno šetačima.' },
  { cat: 'general', q: 'U kojim gradovima je PawsApp dostupan?', a: 'PawsApp je dostupan širom Srbije. Možete pretraživati šetače po lokaciji i pronaći nekoga u svojoj blizini, bez obzira na grad. Platforma radi svuda gde postoji internet konekcija.' },
  { cat: 'general', q: 'Da li mogu koristiti PawsApp bez naloga?', a: 'Možete pregledati profile šetača bez naloga, ali za rezervaciju, komunikaciju, praćenje šetnji i ostale funkcionalnosti je potrebna besplatna registracija. Registracija traje manje od 2 minuta.' },

  { cat: 'owners', q: 'Kako da pronađem šetača?', a: 'Na stranici "Pronađi šetača" možete filtrirati po lokaciji, usluzi (šetanje ili čuvanje), maksimalnoj ceni i oceni. Kliknite na profil šetača za više detalja, recenzije i raspored. Možete pregledati i njihovu mapu lokacije.' },
  { cat: 'owners', q: 'Kako funkcioniše rezervacija?', a: 'Izaberite šetača, odaberite datum i vreme, selektujte pse i pošaljite zahtev. Šetač potvrđuje ili odbija rezervaciju, a vi dobijate push notifikaciju i email obaveštenje o statusu. Ceo proces traje svega par klikova.' },
  { cat: 'owners', q: 'Mogu li pratiti šetnju u realnom vremenu?', a: 'Da! Tokom aktivne šetnje možete videti lokaciju šetača na mapi u realnom vremenu. Na mobilnoj aplikaciji možete otvoriti navigaciju do šetača. GPS praćenje radi automatski čim šetač započne šetnju.' },
  { cat: 'owners', q: 'Kako da ostavim ocenu?', a: 'Nakon završene šetnje, na stranici rezervacija ćete imati opciju da ostavite ocenu (1-5 zvezdica) i tekstualnu recenziju. Ocene pomažu drugim vlasnicima da pronađu najbolje šetače i motivišu šetače da pružaju kvalitetnu uslugu.' },
  { cat: 'owners', q: 'Mogu li otkazati rezervaciju?', a: 'Da, možete otkazati rezervaciju najkasnije 3 sata pre zakazanog početka. Otkazivanje unutar 3 sata nije moguće kako bi se zaštitio šetač koji je već rezervisao svoje vreme za vašeg psa.' },

  { cat: 'walkers', q: 'Kako da postanem šetač?', a: 'Registrujte se kao šetač, popunite profil sa opisom, cenama i rasporedom. Vaš profil će biti vidljiv vlasnicima pasa odmah nakon registracije. Ne uzimamo nikakvu proviziju - sve što zaradite je vaše.' },
  { cat: 'walkers', q: 'Da li sam postavljam cene?', a: 'Da, vi postavljate cenu po satu za šetanje i dnevnu cenu za čuvanje. Cene su potpuno pod vašom kontrolom i možete ih menjati u bilo kom trenutku kroz podešavanja profila.' },
  { cat: 'walkers', q: 'Kako primam rezervacije?', a: 'Vlasnici vam šalju zahteve za rezervaciju. Dobijate push notifikaciju i email obaveštenje, i možete potvrditi ili odbiti svaki zahtev prema svom rasporedu. Sistem automatski prikazuje vaše zauzetetermine.' },
  { cat: 'walkers', q: 'Mogu li nuditi i šetanje i čuvanje?', a: 'Da, pri registraciji možete izabrati jednu ili obe usluge. Cene se postavljaju zasebno za svaku uslugu, što vam daje potpunu fleksibilnost u kreiranju ponude.' },

  { cat: 'safety', q: 'Da li su šetači provereni?', a: 'Svaki šetač ima javni profil sa ocenama i recenzijama od drugih vlasnika. Sistem transparentnosti pomaže u izgradnji poverenja u zajednici. Što više pozitivnih ocena šetač ima, to je pouzdaniji.' },
  { cat: 'safety', q: 'Kako funkcioniše komunikacija?', a: 'Sva komunikacija ide kroz ugrađeni chat na platformi. Možete razmeniti poruke sa šetačem pre i posle rezervacije, podeliti informacije o psu i dogovoriti detalje - sve bez razmene privatnih brojeva telefona.' },
  { cat: 'safety', q: 'Šta ako imam problem sa rezervacijom?', a: 'Kontaktirajte nas putem kontakt forme ili emaila na info@paws.rs. Naš tim će vam pomoći u najkraćem roku. Takođe možete koristiti AI asistenta za brze odgovore na česta pitanja.' },

  { cat: 'payment', q: 'Kako funkcioniše plaćanje?', a: 'Trenutno se plaćanje dogovara direktno između vlasnika i šetača. Radimo na integraciji online plaćanja za veću bezbednost i jednostavnost u budućnosti.' },
  { cat: 'payment', q: 'Da li PawsApp naplaćuje proviziju?', a: 'Ne. PawsApp je trenutno potpuno besplatan za korišćenje - i za vlasnike i za šetače. Bez skrivenih troškova, mesečnih pretplata ili provizija. 100% zarade ide šetaču.' },
]

export default function FaqPage() {
  useEffect(() => { document.title = 'FAQ - PawsApp' }, [])

  const [activeCat, setActiveCat] = useState('all')
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const filtered = activeCat === 'all' ? FAQS : FAQS.filter(f => f.cat === activeCat)

  function toggle(i: number) {
    setOpenItems(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="bg-white">

      {/* Hero - split layout */}
      <section className="bg-gray-50 py-16 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#00BF8F' }}>FAQ</p>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight">
                Često postavljana{' '}
                <span style={{ color: '#00BF8F' }}>pitanja</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed">
                Sve što treba da znaš o PawsApp platformi - od registracije do praćenja šetnji.
                Ako ne pronađeš odgovor ovde, slobodno nas <Link to="/kontakt" className="font-bold hover:underline" style={{ color: '#00BF8F' }}>kontaktiraj</Link>.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative flex justify-center">
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: '#FAAB43' }} />
              <img
                src="https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=600&auto=format&fit=crop"
                alt="Prijateljski pas"
                className="relative rounded-xl w-full max-w-sm object-cover"
                style={{ aspectRatio: '4/3', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Category tabs */}
      <section className="sticky top-0 z-10 bg-white border-b border-gray-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => { setActiveCat(c.id); setOpenItems(new Set()) }}
              className="flex-shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all"
              style={activeCat === c.id
                ? { backgroundColor: '#00BF8F', color: 'white' }
                : { color: '#666', backgroundColor: 'transparent' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Accordion */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {filtered.map((faq, i) => {
            const isOpen = openItems.has(i)
            return (
              <Reveal key={`${activeCat}-${i}`} delay={Math.min(i * 40, 200)}>
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between py-5 text-left gap-4"
                  >
                    <span className="font-bold text-gray-900">{faq.q}</span>
                    <svg
                      className="w-5 h-5 flex-shrink-0 text-gray-400 transition-transform duration-200"
                      style={isOpen ? { transform: 'rotate(180deg)' } : {}}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-200"
                    style={{ maxHeight: isOpen ? '300px' : '0', opacity: isOpen ? 1 : 0 }}
                  >
                    <p className="text-gray-500 leading-relaxed pb-5">{faq.a}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Nisi pronašao odgovor?</h2>
            <p className="text-white/80 mb-6 leading-relaxed">Kontaktiraj nas i rado ćemo ti pomoći. Obično odgovaramo u roku od 24 sata.</p>
            <Link to="/kontakt" className="inline-flex items-center justify-center font-bold px-8 py-3.5 rounded-full transition-all hover:opacity-90 bg-white" style={{ color: '#00BF8F' }}>
              Kontaktiraj nas
            </Link>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
