import "react-native-gesture-handler";
import React, { useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FlashMessage from "react-native-flash-message";
import { Icon } from "@rneui/themed";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SyncProvider } from "./contexts/SyncContext";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useTheme } from "./contexts/ThemeContext";
import LoginScreen from "./screens/LoginScreen";
import LogbookScreen from "./screens/LogbookScreen";
import AddFlightScreen from "./screens/AddFlightScreen";
import FlightDetailScreen from "./screens/FlightDetailScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SyncStatusScreen from "./screens/SyncStatusScreen";
import AirportSetupScreen from "./screens/AirportSetupScreen";
import { shouldShowAirportSetup } from "./utils/checkAirportSetup";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LogbookStack() {
  const { theme } = useTheme();
  // AsyncStorage.clear();

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="Logbook"
        component={LogbookScreen}
        options={{ title: "My Logbook" }}
      />
      <Stack.Screen
        name="FlightDetail"
        component={FlightDetailScreen}
        options={{ title: "Flight Details" }}
      />
      <Stack.Screen
        name="AddFlight"
        component={AddFlightScreen}
        options={{
          title: "Add Flight",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = "book";

          if (route.name === "LogbookTab") {
            iconName = "book";
          } else if (route.name === "Add") {
            iconName = "add-circle";
          } else if (route.name === "Sync") {
            iconName = "sync";
          } else {
            iconName = "person";
          }

          return (
            <Icon name={iconName} type="ionicon" size={size} color={color} />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
      })}
    >
      <Tab.Screen
        name="LogbookTab"
        component={LogbookStack}
        options={{ title: "Logbook" }}
      />
      <Tab.Screen
        name="Add"
        component={AddFlightScreen}
        options={{
          title: "Add Flight",
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncStatusScreen}
        options={{
          title: "Sync",
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();
  const [setupChecked, setSetupChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const navigationTheme = useMemo(() => {
    const base = theme.dark ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.card,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.info,
      },
    };
  }, [theme]);

  useEffect(() => {
    let isMounted = true;

    const checkSetup = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setNeedsSetup(false);
          setSetupChecked(true);
        }
        return;
      }

      if (isMounted) {
        setSetupChecked(false);
      }

      try {
        const required = await shouldShowAirportSetup();
        if (isMounted) {
          setNeedsSetup(required);
        }
      } catch (error) {
        console.error("Failed to determine airport setup:", error);
        if (isMounted) {
          setNeedsSetup(true);
        }
      } finally {
        if (isMounted) {
          setSetupChecked(true);
        }
      }
    };

    checkSetup();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (loading || (isAuthenticated && !setupChecked)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? (
        <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
          {needsSetup ? (
            <Stack.Screen name="AirportSetup" component={AirportSetupScreen} />
          ) : null}
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <AuthProvider>
        <SyncProvider>
          <ThemeProvider>
            <AppNavigator />
            <FlashMessage position="top" />
          </ThemeProvider>
        </SyncProvider>
      </AuthProvider>
    </DatabaseProvider>
  );
}
