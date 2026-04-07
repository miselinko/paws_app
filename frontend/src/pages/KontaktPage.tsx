import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'

export default function KontaktPage() {
  useEffect(() => { document.title = 'Kontakt - PawsApp' }, [])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Paws kontakt: ${name}`)
    const body = encodeURIComponent(`Ime: ${name}\nEmail: ${email}\n\n${message}`)
    window.location.href = `mailto:info@paws.rs?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div className="bg-white">

      {/* Hero - split layout */}
      <section className="bg-gray-50 py-16 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#00BF8F' }}>Kontakt</p>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight">
                Kontaktirajte{' '}
                <span style={{ color: '#00BF8F' }}>nas</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed mb-4">
                Imate pitanje, sugestiju ili želite da sarađujete? Rado ćemo vam pomoći.
                Naš tim je tu za vas - obično odgovaramo u roku od 24 sata.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Možete nas kontaktirati putem forme ispod, direktno na email <strong className="text-gray-700">info@paws.rs</strong> ili
                na društvenim mrežama. Za brze odgovore na česta pitanja, pogledajte naš{' '}
                <Link to="/faq" className="font-bold hover:underline" style={{ color: '#00BF8F' }}>FAQ</Link>.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative flex justify-center">
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: '#00BF8F' }} />
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=600&auto=format&fit=crop"
                alt="Prijateljski pas"
                className="relative rounded-xl w-full max-w-sm object-cover"
                style={{ aspectRatio: '4/3', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Form + Info */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-12">

          {/* Form */}
          <div className="lg:col-span-3">
            <Reveal>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Pišite nam</h2>
              <p className="text-gray-500 mb-6">Popunite formu i javićemo vam se u najkraćem roku.</p>
              {sent ? (
                <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#e6f9f3' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-white" style={{ backgroundColor: '#00BF8F' }}>
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="font-black text-gray-900 text-lg mb-2">Email klijent je otvoren!</p>
                  <p className="text-gray-600">Pošaljite email da bismo primili vašu poruku. Obično odgovaramo u roku od 24 sata.</p>
                  <button onClick={() => setSent(false)} className="mt-4 text-sm font-bold transition-colors hover:opacity-80" style={{ color: '#00BF8F' }}>
                    Pošalji novu poruku
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ime</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Vaše ime"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-shadow"
                      style={{ '--tw-ring-color': '#00BF8F' } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="vas@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-shadow"
                      style={{ '--tw-ring-color': '#00BF8F' } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Poruka</label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Opišite vaše pitanje ili sugestiju..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-shadow resize-none"
                      style={{ '--tw-ring-color': '#00BF8F' } as React.CSSProperties}
                    />
                  </div>
                  <button
                    type="submit"
                    className="text-white font-bold px-8 py-3.5 rounded-full transition-all hover:opacity-90"
                    style={{ backgroundColor: '#00BF8F' }}
                  >
                    Pošalji poruku
                  </button>
                </form>
              )}
            </Reveal>
          </div>

          {/* Info */}
          <div className="lg:col-span-2">
            <Reveal delay={100}>
              <h2 className="text-2xl font-black text-gray-900 mb-6">Ostale opcije</h2>
              <div className="space-y-6">

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f9f3', color: '#00BF8F' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Email</h4>
                    <a href="mailto:info@paws.rs" className="text-sm hover:underline" style={{ color: '#00BF8F' }}>info@paws.rs</a>
                    <p className="text-gray-400 text-xs mt-0.5">Za sva pitanja i saradnju</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f9f3', color: '#00BF8F' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Vreme odgovora</h4>
                    <p className="text-gray-500 text-sm">Obično odgovaramo u roku od 24 sata.</p>
                    <p className="text-gray-400 text-xs mt-0.5">Radnim danima i vikendom</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f9f3', color: '#00BF8F' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.05" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Društvene mreže</h4>
                    <div className="flex gap-3 mt-1">
                      <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: '#00BF8F' }}>Instagram</a>
                      <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: '#00BF8F' }}>Facebook</a>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">Zapratite nas za novosti</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff5e6', color: '#FAAB43' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">AI asistent</h4>
                    <p className="text-gray-500 text-sm">Za brze odgovore, koristite chat bota u aplikaciji.</p>
                    <p className="text-gray-400 text-xs mt-0.5">Dostupan 24/7</p>
                  </div>
                </div>

              </div>
            </Reveal>
          </div>

        </div>
      </section>

      {/* FAQ teaser */}
      <section className="py-16 px-4" style={{ backgroundColor: '#00BF8F' }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Možda odgovor već postoji?</h2>
            <p className="text-white/80 mb-6">Pogledajte najčešće postavljana pitanja pre nego što nam pišete.</p>
            <Link to="/faq" className="inline-flex items-center justify-center font-bold px-8 py-3.5 rounded-full border-2 border-white/40 text-white transition-all hover:bg-white/10">
              Pogledaj FAQ
            </Link>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
