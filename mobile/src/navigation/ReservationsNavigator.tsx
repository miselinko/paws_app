import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ReservationsScreen from '../screens/ReservationsScreen'
import ReservationDetailScreen from '../screens/ReservationDetailScreen'
import DogProfileScreen from '../screens/DogProfileScreen'

export type ReservationsStackParamList = {
  Reservations: undefined
  ReservationDetail: { reservationId: number }
  DogProfile: { dogId: number }
}

const Stack = createNativeStackNavigator<ReservationsStackParamList>()

const HEADER_OPTS = {
  headerStyle: { backgroundColor: '#fff' },
  headerTintColor: '#00BF8F',
  headerTitleStyle: { fontWeight: '900' as const, fontSize: 20, color: '#111', letterSpacing: -0.3 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  headerLargeTitleStyle: { fontWeight: '900' as const, fontSize: 32, color: '#111' },
}

export default function ReservationsNavigator() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Moje rezervacije 📅' }} />
      <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: 'Detalji rezervacije' }} />
      <Stack.Screen name="DogProfile" component={DogProfileScreen} options={{ title: 'Profil psa' }} />
    </Stack.Navigator>
  )
}
