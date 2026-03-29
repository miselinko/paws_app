import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer, LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'
import ResetPasswordScreen from '../screens/ResetPasswordScreen'
import VerifyEmailScreen from '../screens/VerifyEmailScreen'
import MainTabs from './MainTabs'

export type RootStackParamList = {
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  ResetPassword: { token: string }
  VerifyEmail: { token: string }
  Main: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['paws://', 'https://paws.rs'],
  config: {
    screens: {
      Main: {
        screens: {
          Reservations: 'rezervacije',
          Chat: 'poruke',
          Profile: 'profil',
          Walkers: 'setaci',
        },
      },
      Login: 'prijava',
      Register: 'registracija',
      ForgotPassword: 'zaboravljena-lozinka',
      ResetPassword: 'reset-lozinka',
      VerifyEmail: 'verify-email',
    },
  },
}

export default function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00BF8F" />
      </View>
    )
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
