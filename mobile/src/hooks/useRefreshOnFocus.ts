import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useQueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Kad se korisnik vrati na ekran, osveži njegove podatke — ali samo ako su
 * zastareli (staleTime), da brzo prebacivanje tabova ne pravi suvišne pozive.
 * Prvi fokus se preskače jer useQuery tada već učitava podatke.
 */
export function useRefreshOnFocus(queryKeys: QueryKey[]) {
  const qc = useQueryClient()
  const first = useRef(true)
  const keys = JSON.stringify(queryKeys)
  useFocusEffect(
    useCallback(() => {
      if (first.current) { first.current = false; return }
      for (const key of JSON.parse(keys) as QueryKey[]) {
        qc.refetchQueries({ queryKey: key, stale: true, type: 'active' })
      }
    }, [qc, keys])
  )
}

/** Pull-to-refresh: forsira osvežavanje navedenih upita i vraća stanje za RefreshControl. */
export function usePullToRefresh(queryKeys: QueryKey[]) {
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useStateSafe(false)
  const keys = JSON.stringify(queryKeys)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all((JSON.parse(keys) as QueryKey[]).map(key => qc.refetchQueries({ queryKey: key, type: 'active' })))
    } finally {
      setRefreshing(false)
    }
  }, [qc, keys, setRefreshing])
  return { refreshing, onRefresh }
}

function useStateSafe<T>(initial: T): [T, (v: T) => void] {
  const [v, setV] = useState(initial)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])
  const set = useCallback((nv: T) => { if (mounted.current) setV(nv) }, [])
  return [v, set]
}
