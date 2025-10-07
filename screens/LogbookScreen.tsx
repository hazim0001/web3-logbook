import React, { useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { ListItem, Text, FAB } from "@rneui/themed";
import { useDatabase } from "../contexts/DatabaseContext";
import { FlightEntry } from "../services/database";
import { useNavigation } from "@react-navigation/native";

export default function LogbookScreen() {
  const { flights, loading, refreshFlights } = useDatabase();
  const navigation = useNavigation<any>();

  useEffect(() => {
    refreshFlights();
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  };

  const calculateTotalTime = () => {
    return flights.reduce((sum, flight) => sum + flight.totalTime, 0);
  };

  const renderFlight = ({ item }: { item: FlightEntry }) => (
    <ListItem
      bottomDivider
      onPress={() =>
        navigation.navigate("FlightDetail", { flightId: item.id })
      }
    >
      <ListItem.Content>
        <ListItem.Title>
          {item.routeFrom || "N/A"} → {item.routeTo || "N/A"}
        </ListItem.Title>
        <ListItem.Subtitle>
          {new Date(item.flightDate).toLocaleDateString()} •{" "}
          {item.aircraftType || item.aircraftReg} •{" "}
          {formatTime(item.totalTime)}
        </ListItem.Subtitle>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text h4>Total Flight Time</Text>
        <Text h3 style={styles.totalTime}>
          {formatTime(calculateTotalTime())} hrs
        </Text>
        <Text style={styles.flightCount}>
          {flights.length} entries logged
        </Text>
      </View>

      <FlatList
        data={flights}
        renderItem={renderFlight}
        keyExtractor={(item) =>
          item.id
            ? `flight-${item.id}`
            : `temp-${item.createdAt || `${item.flightDate}-${item.aircraftReg}`}`
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshFlights} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No flights logged yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first flight
            </Text>
          </View>
        }
      />

      <FAB
        icon={{ name: "add", color: "white" }}
        color="#007AFF"
        placement="right"
        onPress={() => navigation.navigate("AddFlight")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  totalTime: {
    color: "#007AFF",
    marginTop: 5,
  },
  flightCount: {
    color: "#666",
    marginTop: 5,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
