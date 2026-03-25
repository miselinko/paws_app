import React, { useRef, useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, StyleSheet, Platform, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import WalkersNavigator from './WalkersNavigator'
import ReservationsNavigator from './ReservationsNavigator'
import ProfileNavigator from './ProfileNavigator'
import MojiPsiScreen from '../screens/MojiPsiScreen'
import PorukeScreen from '../screens/PorukeScreen'
import { useAuth } from '../context/AuthContext'

const Tab = createBottomTabNavigator()
const GREEN = '#00BF8F'

// Koristimo View + Text — ne Animated.Text direktno kao tabBarIcon
// jer Animated.Text kao root element narušava height merenje tab bara
function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      tension: 180,
      friction: 8,
    }).start()
  }, [focused])

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text style={[styles.iconEmoji, { opacity: focused ? 1 : 0.45 }]}>
          {icon}
        </Text>
      </Animated.View>
    </View>
  )
}

export default function MainTabs() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const isOwner = user?.role === 'owner'

  // Visina tab bara: fiksna + sistem navigation bar inset
  // Math.max osigurava minimum padding čak i kad insets.bottom = 0
  const tabBarHeight = Platform.OS === 'ios' ? 84 : 62 + Math.max(insets.bottom, 24)
  const tabBarPaddingBottom = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom + 12, 36)

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: [styles.tabBar, {
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
        }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="WalkersTab"
        component={WalkersNavigator}
        options={{
          tabBarLabel: 'Šetači',
          tabBarIcon: ({ focused }) => <TabIcon icon="🐕" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ReservationsTab"
        component={ReservationsNavigator}
        options={{
          tabBarLabel: 'Rezervacije',
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
        }}
      />
      {isOwner && (
        <Tab.Screen
          name="MojiPsiTab"
          component={MojiPsiScreen}
          options={{
            tabBarLabel: 'Moji psi',
            tabBarIcon: ({ focused }) => <TabIcon icon="🦴" focused={focused} />,
            headerShown: false,
          }}
        />
      )}
      <Tab.Screen
        name="PorukeTab"
        component={PorukeScreen}
        options={{
          tabBarLabel: 'Poruke',
          tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    paddingTop: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  iconEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
})
