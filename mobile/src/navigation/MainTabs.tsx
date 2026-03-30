import React, { useRef, useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, StyleSheet, Platform, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import WalkersNavigator from './WalkersNavigator'
import ReservationsNavigator from './ReservationsNavigator'
import ProfileNavigator from './ProfileNavigator'
import MojiPsiScreen from '../screens/MojiPsiScreen'
import PorukeScreen from '../screens/PorukeScreen'
import AdminScreen from '../screens/AdminScreen'
import { useAuth } from '../context/AuthContext'
import { getUnreadCount } from '../api/chat'
import { getPendingCount } from '../api/reservations'

const Tab = createBottomTabNavigator()
const GREEN = '#00BF8F'

function TabIcon({ icon, focused, badge }: { icon: string; focused: boolean; badge?: number }) {
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
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  )
}

export default function MainTabs() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const isOwner = user?.role === 'owner'
  const isAdmin = user?.role === 'admin'

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: getUnreadCount,
    refetchInterval: 15000,
  })

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pendingCount'],
    queryFn: getPendingCount,
    refetchInterval: 15000,
  })

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
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} badge={pendingCount} />,
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
          tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} badge={unreadCount} />,
          headerShown: false,
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminScreen}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ focused }) => <TabIcon icon="🛡️" focused={focused} />,
            headerShown: false,
          }}
        />
      )}
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
    width: 32,
  },
  iconEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
})
