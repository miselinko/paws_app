import React from 'react'
import { RefreshControl } from 'react-native'
import { QueryKey } from '@tanstack/react-query'
import { usePullToRefresh, useRefreshOnFocus } from './useRefreshOnFocus'

/**
 * Pull-to-refresh + osvežavanje pri povratku na ekran za date upite.
 * Upotreba: const ptr = usePtrControl([['reservations']]); <FlatList refreshControl={ptr} />
 */
export function usePtrControl(queryKeys: QueryKey[], opts: { onFocus?: boolean } = {}) {
  const { refreshing, onRefresh } = usePullToRefresh(queryKeys)
  useRefreshOnFocus(opts.onFocus === false ? [] : queryKeys)
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00BF8F" colors={['#00BF8F']} />
}
