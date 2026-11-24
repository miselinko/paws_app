import { QueryClient } from '@tanstack/react-query'

function isClientError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status != null && status >= 400 && status < 500 && status !== 408 && status !== 429
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx (npr. obrisan nalog, nema dozvole) se ne ponavlja; mrežne greške do 2 puta.
      retry: (count, error) => !isClientError(error) && count < 2,
      retryDelay: attempt => Math.min(2000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
})

export default queryClient
