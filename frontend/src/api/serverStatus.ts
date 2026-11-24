/**
 * Praćenje „buđenja" backenda. Render Free plan uspava server posle ~15 min bez
 * saobraćaja; prvo buđenje traje 30–60 s. Kad zahtev traje duže od par sekundi,
 * prikazujemo poruku umesto da aplikacija izgleda zaglavljeno.
 */
type Listener = (waking: boolean) => void
const listeners = new Set<Listener>()
let slow = 0

export const SLOW_REQUEST_MS = 4000

export function onServerWaking(fn: Listener) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function markSlowStart() {
  slow += 1
  if (slow === 1) listeners.forEach(l => l(true))
}

export function markSlowEnd() {
  slow = Math.max(0, slow - 1)
  if (slow === 0) listeners.forEach(l => l(false))
}
