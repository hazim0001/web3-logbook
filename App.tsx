import "react-native-gesture-handler";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Icon } from "@rneui/themed";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SyncProvider } from "./contexts/SyncContext";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import LoginScreen from "./screens/LoginScreen";
import LogbookScreen from "./screens/LogbookScreen";
import AddFlightScreen from "./screens/AddFlightScreen";
import FlightDetailScreen from "./screens/FlightDetailScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SyncStatusScreen from "./screens/SyncStatusScreen";

type LogbookStackParamList = {
  Logbook: undefined;
  FlightDetail: { flightId: number | undefined };
  AddFlight: undefined;
};

type MainTabParamList = {
  LogbookTab: undefined;
  Add: undefined;
  Sync: undefined;
  Profile: undefined;
};

type AuthStackParamList = {
  Login: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const LogbookStack = createNativeStackNavigator<LogbookStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function LogbookStackNavigator() {
  return (
    <LogbookStack.Navigator id={undefined}>
      <LogbookStack.Screen
        name="Logbook"
        component={LogbookScreen}
        options={{ title: "My Logbook" }}
      />
      <LogbookStack.Screen
        name="FlightDetail"
        component={FlightDetailScreen}
        options={{ title: "Flight Details" }}
      />
      <LogbookStack.Screen
        name="AddFlight"
        component={AddFlightScreen}
        options={{ title: "Add Flight", presentation: "modal" }}
      />
    </LogbookStack.Navigator>
  );
}

function MainTabs() {
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
          } else if (route.name === "Profile") {
            iconName = "person";
          } else {
            iconName = "sync";
          }

          return <Icon name={iconName} type="ionicon" size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen
        name="LogbookTab"
        component={LogbookStackNavigator}
        options={{ title: "Logbook", headerShown: false }}
      />
      <Tab.Screen
        name="Add"
        component={AddFlightScreen}
        options={{ title: "Add Flight" }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncStatusScreen}
        options={{ title: "Sync" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainTabs />
      ) : (
        <AuthStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <AuthProvider>
        <SyncProvider>
          <AppNavigator />
        </SyncProvider>
      </AuthProvider>
    </DatabaseProvider>
  );
}
