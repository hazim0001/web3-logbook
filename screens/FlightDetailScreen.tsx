import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { Card, Text, Button } from "@rneui/themed";
import { useDatabase } from "../contexts/DatabaseContext";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function FlightDetailScreen() {
  const { getFlightById, deleteFlight } = useDatabase();
  const navigation = useNavigation();
  const route = useRoute();
  const flightId = (route.params as any)?.flightId;

  const flight = getFlightById(flightId);

  useEffect(() => {
    if (!flight) {
      Alert.alert("Error", "Flight not found", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [flight]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Flight",
      "Are you sure you want to delete this flight?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFlight(flightId);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to delete flight");
            }
          },
        },
      ]
    );
  };

  if (!flight) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Title>Flight Details</Card.Title>
        <Card.Divider />

        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>
            {new Date(flight.flightDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Route:</Text>
          <Text style={styles.value}>
            {flight.routeFrom || "N/A"} → {flight.routeTo || "N/A"}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Aircraft:</Text>
          <Text style={styles.value}>
            {flight.aircraftType || "Unknown Type"}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{flight.aircraftReg}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>PIC Time:</Text>
          <Text style={styles.value}>{formatTime(flight.picTime)} hrs</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>SIC Time:</Text>
          <Text style={styles.value}>{formatTime(flight.sicTime)} hrs</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Dual Time:</Text>
          <Text style={styles.value}>{formatTime(flight.dualTime)} hrs</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Night Time:</Text>
          <Text style={styles.value}>{formatTime(flight.nightTime)} hrs</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Instrument Time:</Text>
          <Text style={styles.value}>
            {formatTime(flight.instrumentTime)} hrs
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Total Time:</Text>
          <Text style={styles.value}>{formatTime(flight.totalTime)} hrs</Text>
        </View>

        {flight.remarks && (
          <View style={styles.row}>
            <Text style={styles.label}>Remarks:</Text>
            <Text style={styles.value}>{flight.remarks}</Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Day Landings:</Text>
          <Text style={styles.value}>{flight.landingsDay}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Night Landings:</Text>
          <Text style={styles.value}>{flight.landingsNight}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Sync Status:</Text>
          <Text style={styles.value}>
            {flight.syncStatus === "synced" ? "✓ Synced" : "⏳ Pending"}
          </Text>
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="Delete Flight"
          onPress={handleDelete}
          buttonStyle={styles.deleteButton}
          containerStyle={styles.button}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  value: {
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
});
