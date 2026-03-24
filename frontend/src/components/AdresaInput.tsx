import { useState, useEffect, useRef } from 'react'

const PHOTON_URL = 'https://photon.komoot.io/api/'
// bbox Srbije: minLon, minLat, maxLon, maxLat
const SERBIA_BBOX = '18.8,42.2,23.0,46.2'

interface PhotonProps {
  name?: string
  street?: string
  housenumber?: string
  city?: string
  district?: string
  county?: string
  state?: string
  country?: string
  postcode?: string
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: PhotonProps
}

function formatMain(p: PhotonProps): string {
  if (p.street) {
    const adresa = p.housenumber ? `${p.street} ${p.housenumber}` : p.street
    return p.name && p.name !== p.street ? `${adresa} (${p.name})` : adresa
  }
  return p.name || ''
}

function formatSub(p: PhotonProps): string {
  return [p.city || p.county, p.state].filter(Boolean).join(', ')
}

function formatShort(p: PhotonProps): string {
  const main = formatMain(p)
  const city = p.city || p.county || ''
  return [main, city].filter(Boolean).join(', ')
}

interface Props {
  value: string
  onChange: (adresa: string, lat?: number, lng?: number) => void
  placeholder?: string
  onLocate?: () => void
  isLocating?: boolean
}

export default function AdresaInput({ value, onChange, placeholder = 'Unesite adresu...', onLocate, isLocating = false }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<PhotonFeature[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = (q: string) => {
    if (q.length < 3) { setResults([]); setOpen(false); return }

    // Otkaži prethodni zahtev
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=10&lang=en&bbox=${SERBIA_BBOX}`
    fetch(url, { signal: abortRef.current.signal })
      .then(r => r.json())
      .then((data: { features: PhotonFeature[] }) => {
        const all = data.features || []
        const serbian = all.filter(f => f.properties.country === 'Serbia')
        const results = (serbian.length > 0 ? serbian : all).slice(0, 5)
        setResults(results)
        setOpen(results.length > 0)
      })
      .catch(e => { if (e.name !== 'AbortError') setResults([]) })
      .finally(() => setLoading(false))
  }

  const handleInput = (val: string) => {
    setQuery(val)
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 450)
  }

  const handleSelect = (f: PhotonFeature) => {
    const [lng, lat] = f.geometry.coordinates
    const shortName = formatShort(f.properties)
    setQuery(shortName)
    setOpen(false)
    setResults([])
    onChange(shortName, parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)))
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white pr-10"
          style={{ borderColor: query ? '#00BF8F' : '#e5e7eb', boxShadow: query ? '0 0 0 3px rgba(0,191,143,0.10)' : '' }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onLocate}
          disabled={isLocating || loading || !onLocate}
          title="Koristi trenutnu lokaciju"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-default cursor-pointer"
        >
          {loading || isLocating
            ? <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            : <svg className="w-4 h-4 text-[#00BF8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
          }
        </button>
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 z-50 overflow-hidden"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          {results.map((f, i) => {
            const main = formatMain(f.properties)
            const sub = formatSub(f.properties)
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(f)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-[#00BF8F] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{main || sub}</div>
                  {main && sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
