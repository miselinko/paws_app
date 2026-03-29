import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDogProfile } from '../api/dogs'
import { imgUrl } from '../config'
import type { Dog } from '../types'

const SIZE_LABELS: Record<string, string> = {
  small: 'Mali (do 10kg)',
  medium: 'Srednji (10-25kg)',
  large: 'Veliki (25kg+)',
}

const SIZE_COLORS: Record<string, { bg: string; color: string }> = {
  small:  { bg: '#f0fdf9', color: '#059669' },
  medium: { bg: '#fffbeb', color: '#92400e' },
  large:  { bg: '#eff6ff', color: '#1d4ed8' },
}

export default function PasProfilPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: dog, isLoading, error } = useQuery<Dog>({
    queryKey: ['dogProfile', id],
    queryFn: () => getDogProfile(Number(id)),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden"
            style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>
            <div className="h-56 bg-gray-100" />
            <div className="p-6 space-y-4">
              <div className="h-6 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="grid grid-cols-4 gap-3">
                <div className="h-16 bg-gray-100 rounded-xl" />
                <div className="h-16 bg-gray-100 rounded-xl" />
                <div className="h-16 bg-gray-100 rounded-xl" />
                <div className="h-16 bg-gray-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !dog) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Nema pristupa</h3>
            <p className="text-gray-400 text-sm mb-6">Nemate dozvolu da vidite profil ovog psa.</p>
            <button onClick={() => navigate(-1)}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#1f2937' }}>
              Nazad
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sc = SIZE_COLORS[dog.size] || SIZE_COLORS.medium
  const photo = imgUrl(dog.image)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">
            ←
          </button>
          <h1 className="text-lg font-black text-gray-900">Profil psa</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 2px 11px rgba(71,71,71,0.08)' }}>

          {/* Photo */}
          {photo ? (
            <div className="relative h-56 sm:h-72 bg-gray-100">
              <img src={photo} alt={dog.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-44 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
              <span className="text-7xl">🐕</span>
            </div>
          )}

          {/* Info */}
          <div className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-black text-gray-900">{dog.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{dog.breed}</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2.5 mb-5">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <div className="text-lg font-black text-gray-900">{dog.age}</div>
                <div className="text-xs text-gray-400 mt-0.5">god.</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <div className="text-lg font-black text-gray-900">{dog.weight}kg</div>
                <div className="text-xs text-gray-400 mt-0.5">Težina</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <div className="text-lg font-black text-gray-900">{dog.gender === 'male' ? '♂' : '♀'}</div>
                <div className="text-xs text-gray-400 mt-0.5">{dog.gender === 'male' ? 'Muški' : 'Ženski'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <div className="text-lg font-black text-gray-900">{dog.neutered ? '✓' : '✗'}</div>
                <div className="text-xs text-gray-400 mt-0.5">{dog.neutered ? 'Kastr.' : 'Nije'}</div>
              </div>
            </div>

            {/* Size badge */}
            <div className="mb-4">
              <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: sc.bg, color: sc.color }}>
                {SIZE_LABELS[dog.size] || dog.size}
              </span>
            </div>

            {/* Temperament */}
            {dog.temperament && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Temperament</h3>
                <div className="flex flex-wrap gap-1.5">
                  {dog.temperament.split(',').map((t, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {dog.notes && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Napomene</h3>
                <div className="text-sm rounded-xl px-4 py-3 border"
                  style={{ backgroundColor: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }}>
                  {dog.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
