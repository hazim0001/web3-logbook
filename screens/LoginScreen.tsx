import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Input, Button, Text } from "@rneui/themed";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert("Login Failed", "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text h2 style={styles.title}>
          ✈️ Pilot Logbook
        </Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          leftIcon={{ type: "ionicon", name: "mail-outline" }}
          containerStyle={styles.inputContainer}
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={{ type: "ionicon", name: "lock-closed-outline" }}
          containerStyle={styles.inputContainer}
        />

        <Button
          title="Login"
          onPress={handleLogin}
          loading={loading}
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />

        <Text style={styles.demoText}>
          Demo credentials:{"\n"}
          Email: any@email.com{"\n"}
          Password: any password
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
    color: "#007AFF",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 15,
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
  },
  demoText: {
    textAlign: "center",
    marginTop: 30,
    color: "#999",
    fontSize: 12,
  },
});
