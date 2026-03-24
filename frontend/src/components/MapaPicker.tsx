import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom()) }, [lat, lng, map])
  return null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface Props {
  lat: number
  lng: number
  onConfirm: (address: string, lat: number, lng: number) => void
  onClose: () => void
  reverseGeocode: (lat: number, lng: number) => Promise<string>
}

export default function MapaPicker({ lat, lng, onConfirm, onClose, reverseGeocode }: Props) {
  const [marker, setMarker] = useState({ lat, lng })
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reverseGeocode(lat, lng).then(addr => {
      if (!cancelled) { setAddress(addr); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lat, lng, reverseGeocode])

  const handleClick = async (newLat: number, newLng: number) => {
    const roundedLat = parseFloat(newLat.toFixed(6))
    const roundedLng = parseFloat(newLng.toFixed(6))
    setMarker({ lat: roundedLat, lng: roundedLng })
    setLoading(true)
    try {
      const addr = await reverseGeocode(roundedLat, roundedLng)
      setAddress(addr)
    } catch {
      setAddress('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200" style={{ animation: 'slideDown 0.25s ease' }}>
      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-600">Klikni na mapu da označiš tačnu lokaciju</p>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div style={{ height: '220px' }}>
        <MapContainer center={[marker.lat, marker.lng]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[marker.lat, marker.lng]} icon={greenIcon} />
          <Recenter lat={marker.lat} lng={marker.lng} />
          <ClickHandler onClick={handleClick} />
        </MapContainer>
      </div>

      <div className="bg-white px-3 py-2.5 border-t border-gray-200 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500 truncate flex-1">
          {loading ? 'Učitavam adresu...' : address || 'Klikni na mapu'}
        </p>
        <button
          type="button"
          disabled={!address || loading}
          onClick={() => onConfirm(address, marker.lat, marker.lng)}
          className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-lg text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: '#00BF8F' }}
        >
          Potvrdi
        </button>
      </div>
    </div>
  )
}
