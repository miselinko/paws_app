import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ProfileScreen from '../screens/ProfileScreen'

export type ProfileStackParamList = {
  Profile: undefined
}

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export default function ProfileNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  )
}
