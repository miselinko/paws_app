/** Praćenje sporih zahteva dok se Render server budi (Free plan). */
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

/** Zove se kad refresh token više ne važi (nalog obrisan/deaktiviran) — AuthContext odjavljuje korisnika. */
type AuthLostListener = () => void
const authLost = new Set<AuthLostListener>()
export function onAuthLost(fn: AuthLostListener) {
  authLost.add(fn)
  return () => { authLost.delete(fn) }
}
export function emitAuthLost() {
  authLost.forEach(l => l())
}
