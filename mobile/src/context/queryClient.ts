import { AppState, AppStateStatus, Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query'

function isClientError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status != null && status >= 400 && status < 500 && status !== 408 && status !== 429
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Podaci se smatraju svežim 30 s: prelazak između ekrana ne pravi nove pozive,
      // a vraćanje u aplikaciju / ekran posle toga osvežava ih.
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (count, error) => !isClientError(error) && count < 2,
      retryDelay: attempt => Math.min(2000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
})

let wired = false

/**
 * Povezuje TanStack Query sa životnim ciklusom aplikacije:
 * - APK se vrati u prvi plan → focusManager → osvežavaju se zastareli upiti,
 *   a refetchInterval (poruke, bedževi) staje dok je aplikacija u pozadini (štedi bateriju).
 * - internet se vrati → onlineManager → pauzirani upiti se ponovo šalju.
 */
export function wireQueryLifecycle() {
  if (wired) return
  wired = true

  onlineManager.setEventListener(setOnline =>
    NetInfo.addEventListener(state => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false)
    })
  )

  if (Platform.OS !== 'web') {
    focusManager.setEventListener(handleFocus => {
      const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
        handleFocus(status === 'active')
      })
      return () => sub.remove()
    })
  }
}
