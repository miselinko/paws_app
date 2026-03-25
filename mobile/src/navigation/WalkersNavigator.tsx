import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import WalkersScreen from '../screens/WalkersScreen'
import WalkerDetailScreen from '../screens/WalkerDetailScreen'
import CreateReservationScreen from '../screens/CreateReservationScreen'

export type WalkersStackParamList = {
  Walkers: undefined
  WalkerDetail: { walkerId: number }
  CreateReservation: { walkerId: number; walkerName: string }
}

const Stack = createNativeStackNavigator<WalkersStackParamList>()

const HEADER_OPTS = {
  headerStyle: { backgroundColor: '#fff' },
  headerTintColor: '#00BF8F',
  headerTitleStyle: { fontWeight: '900' as const, fontSize: 20, color: '#111', letterSpacing: -0.3 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
}

export default function WalkersNavigator() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="Walkers" component={WalkersScreen} options={{ title: 'Pronađi šetača 🐕' }} />
      <Stack.Screen name="WalkerDetail" component={WalkerDetailScreen} options={{ title: 'Profil šetača' }} />
      <Stack.Screen name="CreateReservation" component={CreateReservationScreen} options={{ title: 'Nova rezervacija' }} />
    </Stack.Navigator>
  )
}
