import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  Icon,
  Text,
} from "@rneui/themed";
import { format } from "date-fns";
import { useNavigation, useRoute } from "@react-navigation/native";
import database, { FlightEntry } from "../services/database";
import { useTheme } from "../contexts/ThemeContext";
import { showMessage } from "react-native-flash-message";

export default function FlightDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const entryId = route.params?.entryId ?? route.params?.flightId;

  const [entry, setEntry] = useState<FlightEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const data = await database.getEntry(entryId);
        if (!data) {
          throw new Error("Entry not found");
        }
        setEntry(data);
      } catch (error) {
        console.error("Failed to load entry:", error);
        showMessage({ message: "Failed to load entry", type: "danger" });
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [entryId, navigation]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        },
        errorContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        },
        errorText: {
          color: theme.colors.text,
        },
        statusBanner: {
          padding: 12,
          alignItems: "center",
        },
        statusText: {
          color: "#FFFFFF",
          fontSize: 14,
          fontWeight: "bold",
          letterSpacing: 1,
        },
        card: {
          borderRadius: 12,
          marginHorizontal: 16,
          marginTop: 16,
          backgroundColor: theme.colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        cardTitle: {
          fontSize: 12,
          fontWeight: "bold",
          color: theme.colors.textSecondary,
          letterSpacing: 1,
        },
        divider: {
          marginVertical: 10,
          backgroundColor: theme.colors.border,
        },
        infoRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          paddingVertical: 8,
        },
        label: {
          fontSize: 14,
          color: theme.colors.textSecondary,
        },
        value: {
          fontSize: 14,
          fontWeight: "600",
          color: theme.colors.text,
        },
        hashValue: {
          fontSize: 11,
          fontWeight: "600",
          color: theme.colors.text,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
          flex: 1,
          textAlign: "right",
        },
        timeGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        },
        timeBox: {
          width: "48%",
          padding: 12,
          backgroundColor: theme.colors.background,
          borderRadius: 8,
          marginBottom: 12,
        },
        timeLabel: {
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginBottom: 4,
        },
        timeValue: {
          fontSize: 18,
          fontWeight: "bold",
          color: theme.colors.text,
        },
        landingsRow: {
          flexDirection: "row",
          justifyContent: "space-around",
        },
        landingBox: {
          alignItems: "center",
          padding: 20,
        },
        landingValue: {
          fontSize: 28,
          fontWeight: "bold",
          color: theme.colors.text,
          marginTop: 8,
        },
        landingLabel: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginTop: 4,
        },
        remarksText: {
          fontSize: 14,
          color: theme.colors.text,
          lineHeight: 20,
        },
        buttonContainer: {
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingTop: 20,
        },
        button: {
          flex: 1,
          marginHorizontal: 6,
        },
        editButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: 8,
          paddingVertical: 12,
        },
        deleteButton: {
          backgroundColor: theme.colors.error,
          borderRadius: 8,
          paddingVertical: 12,
        },
        bottomPadding: {
          height: 40,
        },
      }),
    [theme]
  );

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const statusColor = useMemo(() => {
    switch (entry?.status) {
      case "submitted":
        return theme.colors.primary;
      case "approved":
        return theme.colors.success;
      case "anchored":
        return theme.colors.info;
      case "draft":
      default:
        return theme.colors.textSecondary;
    }
  }, [entry?.status, theme.colors]);

  const handleEdit = () => {
    if (!entry) {
      return;
    }

    if (entry.status === "draft" || entry.status === "submitted") {
      navigation.navigate("AddFlight", { entryId: entry.id });
    } else {
      Alert.alert(
        "Cannot Edit",
        "Approved and anchored entries cannot be edited.",
        [{ text: "OK" }]
      );
    }
  };

  const handleDelete = () => {
    if (!entry) {
      return;
    }

    if (entry.status !== "draft") {
      Alert.alert("Cannot Delete", "Only draft entries can be deleted.", [
        { text: "OK" },
      ]);
      return;
    }

    Alert.alert("Delete Entry", "Are you sure you want to delete this flight entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await database.deleteEntry(entryId);
            showMessage({ message: "Entry deleted", type: "success" });
            navigation.goBack();
          } catch (error) {
            console.error("Delete error:", error);
            showMessage({ message: "Failed to delete entry", type: "danger" });
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Entry not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.statusBanner, { backgroundColor: statusColor }]}
      >
        <Text style={styles.statusText}>
          {entry.status.toUpperCase()}
          {entry.syncStatus === "pending" ? " • PENDING SYNC" : ""}
        </Text>
      </View>

      <Card containerStyle={styles.card}>
        <Card.Title style={styles.cardTitle}>FLIGHT INFORMATION</Card.Title>
        <Divider style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>
            {format(new Date(entry.flightDate), "MMMM dd, yyyy")}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Aircraft Registration</Text>
          <Text style={styles.value}>{entry.aircraftReg}</Text>
        </View>
        {entry.aircraftType ? (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Aircraft Type</Text>
            <Text style={styles.value}>{entry.aircraftType}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Route</Text>
          <Text style={styles.value}>
            {entry.routeFrom} → {entry.routeTo}
          </Text>
        </View>
      </Card>

      <Card containerStyle={styles.card}>
        <Card.Title style={styles.cardTitle}>FLIGHT TIME</Card.Title>
        <Divider style={styles.divider} />
        <View style={styles.timeGrid}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Total Time</Text>
            <Text style={styles.timeValue}>{formatTime(entry.totalTime)}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>PIC Time</Text>
            <Text style={styles.timeValue}>{formatTime(entry.picTime)}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>SIC Time</Text>
            <Text style={styles.timeValue}>{formatTime(entry.sicTime)}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Dual Time</Text>
            <Text style={styles.timeValue}>{formatTime(entry.dualTime)}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Night Time</Text>
            <Text style={styles.timeValue}>{formatTime(entry.nightTime)}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Instrument</Text>
            <Text style={styles.timeValue}>{formatTime(entry.instrumentTime)}</Text>
          </View>
        </View>
      </Card>

      <Card containerStyle={styles.card}>
        <Card.Title style={styles.cardTitle}>LANDINGS</Card.Title>
        <Divider style={styles.divider} />
        <View style={styles.landingsRow}>
          <View style={styles.landingBox}>
            <Icon name="sunny-outline" type="ionicon" color={theme.colors.warning} size={32} />
            <Text style={styles.landingValue}>{entry.landingsDay}</Text>
            <Text style={styles.landingLabel}>Day</Text>
          </View>
          <View style={styles.landingBox}>
            <Icon name="moon-outline" type="ionicon" color={theme.colors.info} size={32} />
            <Text style={styles.landingValue}>{entry.landingsNight}</Text>
            <Text style={styles.landingLabel}>Night</Text>
          </View>
        </View>
      </Card>

      {entry.remarks ? (
        <Card containerStyle={styles.card}>
          <Card.Title style={styles.cardTitle}>REMARKS</Card.Title>
          <Divider style={styles.divider} />
          <Text style={styles.remarksText}>{entry.remarks}</Text>
        </Card>
      ) : null}

      {entry.entryHash ? (
        <Card containerStyle={styles.card}>
          <Card.Title style={styles.cardTitle}>VERIFICATION</Card.Title>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>Entry Hash</Text>
            <Text style={styles.hashValue} numberOfLines={1} ellipsizeMode="middle">
              {entry.entryHash}
            </Text>
          </View>
          {entry.batchId ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Batch ID</Text>
              <Text style={styles.value}>#{entry.batchId}</Text>
            </View>
          ) : null}
          {entry.version ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.value}>{entry.version}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      <View style={styles.buttonContainer}>
        <Button
          title="Edit"
          onPress={handleEdit}
          buttonStyle={styles.editButton}
          containerStyle={styles.button}
          disabled={entry.status === "approved" || entry.status === "anchored"}
        />
        <Button
          title="Delete"
          onPress={handleDelete}
          buttonStyle={styles.deleteButton}
          containerStyle={styles.button}
          loading={deleting}
          disabled={entry.status !== "draft"}
        />
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}
