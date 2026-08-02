import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { palette } from '@/src/theme/palette';

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(active: Glyph, inactive: Glyph) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <MaterialCommunityIcons name={focused ? active : inactive} size={size} color={color as string} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.brass,
        tabBarInactiveTintColor: palette.textMute,
        tabBarLabelStyle: { fontSize: 13 },
        tabBarStyle: {
          backgroundColor: palette.bg,
          borderTopColor: palette.line,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home-variant', 'home-variant-outline'),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: tabIcon('chart-box', 'chart-box-outline'),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Circle',
          tabBarIcon: tabIcon('account-group', 'account-group-outline'),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: tabIcon('timer', 'timer-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

