import { useEffect, useState } from 'react'
import { onServerWaking } from '../api/serverStatus'

/** Diskretna poruka dok se server budi (Render Free plan). */
export default function ServerWakeBanner() {
  const [waking, setWaking] = useState(false)
  useEffect(() => onServerWaking(setWaking), [])
  if (!waking) return null
  return (
    <div role="status" aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full bg-gray-900/90 text-white text-sm font-medium px-4 py-2 shadow-lg">
      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
      Server se pokreće, sačekaj nekoliko sekundi…
    </div>
  )
}
