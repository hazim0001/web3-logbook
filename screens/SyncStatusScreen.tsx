import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, Button, Icon } from "@rneui/themed";
import { useSync } from "../contexts/SyncContext";

export default function SyncStatusScreen() {
  const {
    syncStatus: { isOnline, lastSyncTime, pendingChanges, syncing },
    syncNow,
  } = useSync();

  return (
    <View style={styles.container}>
      <Card>
        <Card.Title>Synchronization Status</Card.Title>
        <Card.Divider />

        <View style={styles.row}>
          <Icon
            name={isOnline ? "wifi" : "wifi-off"}
            type="feather"
            color={isOnline ? "#34C759" : "#FF3B30"}
          />
          <Text style={styles.value}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>

        <View style={styles.row}>
          <Icon name="time-outline" type="ionicon" color="#007AFF" />
          <Text style={styles.value}>
            {lastSyncTime
              ? `Last synced: ${lastSyncTime.toLocaleString()}`
              : "Not synced yet"}
          </Text>
        </View>

        <View style={styles.row}>
          <Icon name="cloud-upload-outline" type="ionicon" color="#FF9500" />
          <Text style={styles.value}>
            Pending changes: {pendingChanges}
          </Text>
        </View>

        <Button
          title={syncing ? "Syncing..." : "Sync Now"}
          onPress={syncNow}
          disabled={syncing || !isOnline || pendingChanges === 0}
          loading={syncing}
          buttonStyle={styles.syncButton}
          containerStyle={styles.syncContainer}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  value: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  syncContainer: {
    marginTop: 16,
  },
  syncButton: {
    backgroundColor: "#007AFF",
  },
});
