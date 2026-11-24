import { registerRootComponent } from 'expo'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/context/AuthContext'
import { queryClient, wireQueryLifecycle } from './src/context/queryClient'
import * as Updates from 'expo-updates'
import { API_URL } from './src/api/config'
import RootNavigator from './src/navigation/RootNavigator'
import OfflineBanner from './src/components/OfflineBanner'
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

wireQueryLifecycle()

/** OTA: preuzmi novu JS verziju u pozadini; primenjuje se pri sledećem pokretanju aplikacije. */
async function fetchOtaUpdate() {
  if (__DEV__ || !Updates.isEnabled) return
  try {
    const res = await Updates.checkForUpdateAsync()
    if (res.isAvailable) await Updates.fetchUpdateAsync()
  } catch {
    // bez interneta ili bez update servera — nije kritično
  }
}

function App() {
  useEffect(() => {
    // Probudi backend odmah pri otvaranju (Render Free plan spava posle 15 min).
    fetch(`${API_URL}/health/`).catch(() => {})
    fetchOtaUpdate()
  }, [])
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar hidden />
          <OfflineBanner />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

registerRootComponent(App)
