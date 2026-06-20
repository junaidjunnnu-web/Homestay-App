import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

function NativeTabLayout() {
  const { user } = useAuth();
  const isHost = user?.role === "host";

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "safari", selected: "safari.fill" }} />
        <Label>Explore</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="bookings">
        <Icon sf={{ default: "calendar", selected: "calendar.badge.checkmark" }} />
        <Label>Bookings</Label>
      </NativeTabs.Trigger>

      {isHost && (
        <NativeTabs.Trigger name="dashboard">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>Dashboard</Label>
        </NativeTabs.Trigger>
      )}

      {isHost && (
        <NativeTabs.Trigger name="manage">
          <Icon sf={{ default: "slider.horizontal.3", selected: "slider.horizontal.3" }} />
          <Label>Manage</Label>
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();
  const isHost = user?.role === "host";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="safari" tintColor={color} size={24} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: isHost ? "/dashboard" : null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={24} />
            ) : (
              <Feather name="bar-chart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: "Manage",
          href: isHost ? "/manage" : null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="slider.horizontal.3" tintColor={color} size={24} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
