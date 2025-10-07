import React, { createContext, useState, useContext, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiClient from "../services/apiClient";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  license_no?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_EMAIL = "12345@gamil.com";
const DEMO_PASSWORD = "12345";
const DEMO_USER: User = {
  id: 0,
  email: DEMO_EMAIL,
  name: "Demo Pilot",
  role: "demo",
  license_no: "DEMO-0000",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");
      const storedUser = await AsyncStorage.getItem("user");

      if (accessToken && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load stored auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, totpCode?: string) => {
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      await ApiClient.setTokens("demo-access-token", "demo-refresh-token");
      await AsyncStorage.setItem("user", JSON.stringify(DEMO_USER));
      setUser(DEMO_USER);
      return;
    }

    try {
      const response = await ApiClient.login(email, password, totpCode);
      const { access_token, refresh_token, user: userData } = response;

      await ApiClient.setTokens(access_token, refresh_token);
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.response?.data?.error || "Login failed");
    }
  };

  const logout = async () => {
    try {
      if (user?.email === DEMO_EMAIL) {
        await ApiClient.clearTokens();
      } else {
        await ApiClient.logout();
      }
      await AsyncStorage.removeItem("user");
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
