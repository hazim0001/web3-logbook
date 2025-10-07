import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Input, Button, Text } from "@rneui/themed";
import { useDatabase } from "../contexts/DatabaseContext";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";

export default function AddFlightScreen() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [aircraftType, setAircraftType] = useState("");
  const [aircraftReg, setAircraftReg] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [totalTime, setTotalTime] = useState("");
  const [picTime, setPicTime] = useState("");
  const [sicTime, setSicTime] = useState("");
  const [dualTime, setDualTime] = useState("");
  const [nightTime, setNightTime] = useState("");
  const [instrumentTime, setInstrumentTime] = useState("");
  const [landingsDay, setLandingsDay] = useState("");
  const [landingsNight, setLandingsNight] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const { addFlight } = useDatabase();
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleSubmit = async () => {
    const pilotId = Number(user?.id);
    if (!pilotId) {
      Alert.alert("Error", "You must be logged in to log a flight.");
      return;
    }

    if (!aircraftType || !aircraftReg || !routeFrom || !routeTo || !totalTime) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const totalMinutes = parseFloat(totalTime) * 60;
    const picMinutes = picTime ? parseFloat(picTime) * 60 : undefined;
    const sicMinutes = sicTime ? parseFloat(sicTime) * 60 : 0;
    const dualMinutes = dualTime ? parseFloat(dualTime) * 60 : 0;
    const nightMinutes = nightTime ? parseFloat(nightTime) * 60 : 0;
    const instrumentMinutes = instrumentTime
      ? parseFloat(instrumentTime) * 60
      : 0;
    const dayLandings = landingsDay ? parseInt(landingsDay, 10) : 0;
    const nightLandings = landingsNight ? parseInt(landingsNight, 10) : 0;

    if (isNaN(totalMinutes)) {
      Alert.alert("Error", "Please enter valid time values");
      return;
    }

    setLoading(true);
    try {
      await addFlight({
        flightDate: date,
        aircraftType,
        aircraftReg,
        routeFrom,
        routeTo,
        totalTime: totalMinutes,
        picTime: picMinutes ?? 0,
        sicTime: sicMinutes,
        dualTime: dualMinutes,
        nightTime: nightMinutes,
        instrumentTime: instrumentMinutes,
        landingsDay: dayLandings,
        landingsNight: nightLandings,
        pilotId,
        remarks,
        attachments: undefined,
        serverId: undefined,
      });

      Alert.alert("Success", "Flight added successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to add flight");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text h4 style={styles.title}>
            Log New Flight
          </Text>

          <Input
            label="Date"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            leftIcon={{ type: "ionicon", name: "calendar-outline" }}
          />

          <Input
            label="Aircraft Type *"
            placeholder="e.g., B737, A320"
            value={aircraftType}
            onChangeText={setAircraftType}
            leftIcon={{ type: "ionicon", name: "airplane-outline" }}
          />

          <Input
            label="Registration *"
            placeholder="e.g., N12345"
            value={aircraftReg}
            onChangeText={setAircraftReg}
            autoCapitalize="characters"
            leftIcon={{ type: "ionicon", name: "pricetag-outline" }}
          />

          <Input
            label="From *"
            placeholder="e.g., JFK"
            value={routeFrom}
            onChangeText={setRouteFrom}
            autoCapitalize="characters"
            leftIcon={{ type: "ionicon", name: "location-outline" }}
          />

          <Input
            label="To *"
            placeholder="e.g., LAX"
            value={routeTo}
            onChangeText={setRouteTo}
            autoCapitalize="characters"
            leftIcon={{ type: "ionicon", name: "location-outline" }}
          />

          <Input
            label="Total Flight Time (hours) *"
            placeholder="e.g., 2.5"
            value={totalTime}
            onChangeText={setTotalTime}
            keyboardType="decimal-pad"
            leftIcon={{ type: "ionicon", name: "time-outline" }}
          />

          <Input
            label="PIC Time (hours)"
            placeholder="e.g., 2.5"
            value={picTime}
            onChangeText={setPicTime}
            keyboardType="decimal-pad"
            leftIcon={{ type: "ionicon", name: "person-outline" }}
          />

          <Input
            label="SIC Time (hours)"
            placeholder="Optional"
            value={sicTime}
            onChangeText={setSicTime}
            keyboardType="decimal-pad"
            leftIcon={{ type: "ionicon", name: "people-outline" }}
          />

          <Input
            label="Dual Time (hours)"
            placeholder="Optional"
            value={dualTime}
            onChangeText={setDualTime}
            keyboardType="decimal-pad"
            leftIcon={{ type: "ionicon", name: "sync-outline" }}
          />

          <Input
            label="Night Time (hours)"
            placeholder="Optional"
            value={nightTime}
            onChangeText={setNightTime}
            keyboardType="decimal-pad"
            leftIcon={{ type: "ionicon", name: "moon-outline" }}
          />

          <Input
            label="Instrument Time (hours)"
            placeholder="Optional"
            value={instrumentTime}
            onChangeText={setInstrumentTime}
            keyboardType="decimal-pad"
            leftIcon={{ type: "ionicon", name: "speedometer-outline" }}
          />

          <Input
            label="Day Landings"
            placeholder="0"
            value={landingsDay}
            onChangeText={setLandingsDay}
            keyboardType="number-pad"
            leftIcon={{ type: "ionicon", name: "sunny-outline" }}
          />

          <Input
            label="Night Landings"
            placeholder="0"
            value={landingsNight}
            onChangeText={setLandingsNight}
            keyboardType="number-pad"
            leftIcon={{ type: "ionicon", name: "moon-outline" }}
          />

          <Input
            label="Remarks"
            placeholder="Optional notes"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={3}
            leftIcon={{ type: "ionicon", name: "document-text-outline" }}
          />

          <Button
            title="Add Flight"
            onPress={handleSubmit}
            loading={loading}
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
    color: "#333",
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
  },
});
