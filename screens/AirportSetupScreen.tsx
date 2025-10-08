import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Text } from "@rneui/themed";
import { useTheme } from "../contexts/ThemeContext";
import AirportSeeder from "../utils/airportSeeder";
import { showMessage } from "react-native-flash-message";

const AIRPORT_SETUP_KEY = "airport_database_seeded";

export default function AirportSetupScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [isComplete, setIsComplete] = useState(false);
  const usingMockData = __DEV__;

  useEffect(() => {
    checkIfAlreadySeeded();
  }, []);

  const checkIfAlreadySeeded = async () => {
    try {
      const seeded = await AsyncStorage.getItem(AIRPORT_SETUP_KEY);
      if (seeded === "true") {
        navigation.replace("MainTabs");
      }
    } catch (error) {
      console.error("Error checking airport setup:", error);
    }
  };

  const handleSetup = async (options?: { forceDownload?: boolean }) => {
    const forceDownload = options?.forceDownload ?? false;
    setIsSeeding(true);
    setProgress(forceDownload ? "Downloading full dataset..." : "Preparing...");

    try {
      await AirportSeeder.seedAirports({
        forceDownload,
        onProgress: (status) => setProgress(status),
      });

      await AsyncStorage.setItem(AIRPORT_SETUP_KEY, "true");
      setIsComplete(true);
      setProgress("Setup complete!");

      showMessage({
        message: "Airport database ready",
        description: "You can now search airports offline",
        type: "success",
        duration: 3000,
      });

      setTimeout(() => {
        navigation.replace("MainTabs");
      }, 2000);
    } catch (error) {
      console.error("Airport seeding error:", error);
      setIsSeeding(false);
      setProgress("");
      showMessage({
        message: "Setup failed",
        description: "Please check your internet connection and try again",
        type: "danger",
      });
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(AIRPORT_SETUP_KEY, "true");
    showMessage({
      message: "Setup skipped",
      description: "You can download airports later from Settings",
      type: "info",
    });
    navigation.replace("MainTabs");
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        },
        icon: {
          fontSize: 80,
          marginBottom: 24,
        },
        title: {
          fontSize: 24,
          fontWeight: "bold",
          color: theme.colors.text,
          marginBottom: 12,
          textAlign: "center",
        },
        description: {
          fontSize: 16,
          color: theme.colors.textSecondary,
          textAlign: "center",
          marginBottom: 32,
          lineHeight: 24,
        },
        progressText: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginTop: 16,
          textAlign: "center",
        },
        buttonContainer: {
          width: "100%",
          marginTop: 24,
        },
        button: {
          borderRadius: 8,
          paddingVertical: 14,
          marginBottom: 12,
        },
        skipButton: {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        skipButtonText: {
          color: theme.colors.textSecondary,
        },
        feature: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
          width: "100%",
        },
        featureText: {
          fontSize: 14,
          color: theme.colors.text,
          marginLeft: 12,
          flex: 1,
        },
        featuresContainer: {
          width: "100%",
          marginBottom: 24,
        },
      }),
    [theme]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✈️</Text>

      {!isSeeding && !isComplete ? (
        <>
          <Text style={styles.title}>Airport Database Setup</Text>
          <Text style={styles.description}>
            Download a comprehensive airport database (~10MB) for offline autocomplete and timezone
            calculations.
          </Text>

          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Text style={{ fontSize: 20 }}>🔍</Text>
              <Text style={styles.featureText}>
                Search 10,000+ airports by ICAO, IATA, or name
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={{ fontSize: 20 }}>🌍</Text>
              <Text style={styles.featureText}>
                Automatic timezone detection and conversion
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={{ fontSize: 20 }}>🌙</Text>
              <Text style={styles.featureText}>
                Auto-calculate night time based on sunrise/sunset
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={{ fontSize: 20 }}>📱</Text>
              <Text style={styles.featureText}>
                Works completely offline after download
              </Text>
            </View>
          </View>

          {usingMockData ? (
            <Text style={[styles.description, { fontSize: 14, marginTop: 8 }]}>
              Development build detected: seeding with bundled mock data. Use the production build
              to download the full airport database.
            </Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <Button
              title={usingMockData ? "Seed Mock Airport Database" : "Download Airport Database"}
              onPress={() => handleSetup()}
              buttonStyle={styles.button}
            />
            {usingMockData ? (
              <Button
                title="Download Full Airport Database (~10MB)"
                type="outline"
                onPress={() => handleSetup({ forceDownload: true })}
                buttonStyle={styles.button}
              />
            ) : null}
            <Button
              title="Skip for Now"
              onPress={handleSkip}
              buttonStyle={[styles.button, styles.skipButton]}
              titleStyle={styles.skipButtonText}
            />
          </View>
        </>
      ) : null}

      {isSeeding && !isComplete ? (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.progressText}>{progress}</Text>
          <Text style={[styles.description, { marginTop: 16, fontSize: 14 }]}>
            This may take a minute. Please keep the app open.
          </Text>
        </>
      ) : null}

      {isComplete ? (
        <>
          <Text style={styles.icon}>✅</Text>
          <Text style={styles.title}>All Set!</Text>
          <Text style={styles.description}>
            Airport database is ready. Launching app...
          </Text>
        </>
      ) : null}
    </View>
  );
}
