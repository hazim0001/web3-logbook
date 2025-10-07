import React, { useState, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Input, Button, Text } from "@rneui/themed";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { showMessage } from "react-native-flash-message";

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTotpInput, setShowTotpInput] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scrollContent: {
          flexGrow: 1,
          justifyContent: "center",
          padding: 20,
        },
        logoContainer: {
          alignItems: "center",
          marginBottom: 40,
        },
        logoCircle: {
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: theme.colors.primary,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        },
        logoText: {
          fontSize: 48,
        },
        title: {
          marginBottom: 5,
          fontWeight: "bold",
          color: theme.colors.text,
        },
        subtitle: {
          fontSize: 16,
          color: theme.colors.textSecondary,
        },
        formContainer: {
          width: "100%",
          backgroundColor: theme.colors.card,
          borderRadius: 16,
          padding: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 5,
        },
        inputContainer: {
          marginBottom: 15,
        },
        inputInner: {
          backgroundColor: theme.colors.inputBackground,
          borderBottomWidth: 0,
          borderRadius: 10,
          paddingHorizontal: 12,
        },
        inputStyle: {
          color: theme.colors.text,
        },
        loginButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: 10,
          paddingVertical: 15,
        },
        loginButtonContainer: {
          marginTop: 10,
          marginBottom: 20,
        },
        helperText: {
          textAlign: "center",
          color: theme.colors.textSecondary,
          fontSize: 14,
        },
        footer: {
          marginTop: 40,
          alignItems: "center",
        },
        footerText: {
          fontSize: 12,
          color: theme.colors.textSecondary,
        },
      }),
    [theme]
  );

  const handleLogin = async () => {
    if (!email || !password) {
      showMessage({ message: "Please enter email and password", type: "warning" });
      return;
    }

    setLoading(true);

    try {
      await login(email, password, totpCode || undefined);
      showMessage({ message: "Welcome back!", type: "success" });
    } catch (error: any) {
      if (typeof error.message === "string" && error.message.includes("2FA")) {
        setShowTotpInput(true);
        showMessage({ message: "Please enter your 2FA code", type: "info" });
      } else {
        showMessage({ message: error?.message || "Login failed", type: "danger" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>✈️</Text>
          </View>
          <Text h3 style={styles.title}>
            FlightLog
          </Text>
          <Text style={styles.subtitle}>Web3 Pilot Logbook</Text>
        </View>

        <View style={styles.formContainer}>
          <Input
            placeholder="Email"
            leftIcon={{
              type: "ionicon",
              name: "mail-outline",
              color: theme.colors.primary,
            }}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            containerStyle={styles.inputContainer}
            inputContainerStyle={styles.inputInner}
            inputStyle={styles.inputStyle}
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Input
            placeholder="Password"
            leftIcon={{
              type: "ionicon",
              name: "lock-closed-outline",
              color: theme.colors.primary,
            }}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            containerStyle={styles.inputContainer}
            inputContainerStyle={styles.inputInner}
            inputStyle={styles.inputStyle}
            placeholderTextColor={theme.colors.textSecondary}
          />

          {showTotpInput && (
            <Input
              placeholder="2FA Code"
              leftIcon={{
                type: "ionicon",
                name: "shield-checkmark-outline",
                color: theme.colors.primary,
              }}
              value={totpCode}
              onChangeText={setTotpCode}
              keyboardType="number-pad"
              maxLength={6}
              containerStyle={styles.inputContainer}
              inputContainerStyle={styles.inputInner}
              inputStyle={styles.inputStyle}
              placeholderTextColor={theme.colors.textSecondary}
            />
          )}

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            buttonStyle={styles.loginButton}
            containerStyle={styles.loginButtonContainer}
          />

          <Text style={styles.helperText}>
            Don&apos;t have an account? Contact your organization administrator.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Secured by blockchain technology</Text>
          <Text style={[styles.footerText, { marginTop: 8 }]}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
