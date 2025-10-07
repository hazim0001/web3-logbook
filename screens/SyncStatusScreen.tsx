import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  LinearProgress,
  Icon,
  Text,
  Button,
} from "@rneui/themed";
import { useNetInfo } from "@react-native-community/netinfo";
import { format } from "date-fns";
import { useSync } from "../contexts/SyncContext";
import { useTheme } from "../contexts/ThemeContext";

export default function SyncStatusScreen() {
  const { syncStatus, syncStats, isSyncing, syncNow, refreshStats } = useSync();
  const { theme } = useTheme();
  const netInfo = useNetInfo();

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        statusCard: {
          borderRadius: 12,
          marginTop: 16,
          marginHorizontal: 16,
          backgroundColor: theme.colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        statusHeader: {
          alignItems: "center",
          paddingVertical: 20,
        },
        statusText: {
          fontSize: 20,
          fontWeight: "bold",
          marginTop: 12,
          color: theme.colors.text,
        },
        progressContainer: {
          marginVertical: 20,
        },
        progressBar: {
          height: 8,
          borderRadius: 4,
        },
        progressText: {
          textAlign: "center",
          marginTop: 8,
          fontSize: 14,
          color: theme.colors.textSecondary,
        },
        lastSyncText: {
          textAlign: "center",
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginBottom: 15,
        },
        syncButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: 8,
          paddingVertical: 12,
        },
        syncButtonContainer: {
          marginTop: 10,
        },
        statsGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          marginTop: 12,
        },
        statCard: {
          width: "31%",
          borderRadius: 12,
          padding: 12,
          marginHorizontal: 0,
          backgroundColor: theme.colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        statContent: {
          alignItems: "center",
        },
        statValue: {
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 8,
          color: theme.colors.primary,
        },
        statValueWarning: {
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 8,
          color: theme.colors.warning,
        },
        statValueSuccess: {
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 8,
          color: theme.colors.success,
        },
        statLabel: {
          fontSize: 11,
          color: theme.colors.textSecondary,
          marginTop: 4,
          textAlign: "center",
        },
        infoCard: {
          borderRadius: 12,
          marginTop: 16,
          marginHorizontal: 16,
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
          textAlign: "left",
          letterSpacing: 1,
          marginBottom: 15,
        },
        infoText: {
          fontSize: 14,
          color: theme.colors.text,
          lineHeight: 22,
          marginBottom: 10,
        },
        networkCard: {
          borderRadius: 12,
          marginTop: 16,
          marginHorizontal: 16,
          marginBottom: 32,
          backgroundColor: theme.colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        networkRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
        },
        networkInfo: {
          marginLeft: 15,
          flex: 1,
        },
        networkLabel: {
          fontSize: 12,
          color: theme.colors.textSecondary,
        },
        networkValue: {
          fontSize: 16,
          fontWeight: "600",
          color: theme.colors.text,
          marginTop: 2,
        },
      }),
    [theme]
  );

  const statusColor = useMemo(() => {
    switch (syncStatus.status) {
      case "syncing":
        return theme.colors.primary;
      case "error":
        return theme.colors.error;
      default:
        return theme.colors.success;
    }
  }, [syncStatus.status, theme.colors]);

  const statusText = useMemo(() => {
    switch (syncStatus.status) {
      case "syncing":
        return "Syncing...";
      case "error":
        return syncStatus.message || "Sync Error";
      case "success":
        return "Sync Complete";
      default:
        return "All Synced";
    }
  }, [syncStatus.status, syncStatus.message]);

  const lastSyncDisplay = useMemo(() => {
    const value = syncStats?.lastSyncedAt;
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return format(parsed, "MMM dd, yyyy hh:mm a");
  }, [syncStats?.lastSyncedAt]);

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Icon
            name={isSyncing ? "sync" : "checkmark-circle"}
            type="ionicon"
            color={statusColor}
            size={48}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>

        {isSyncing && (
          <View style={styles.progressContainer}>
            <LinearProgress
              color={theme.colors.primary}
              value={Math.min(Math.max(syncStatus.progress / 100, 0), 1)}
              variant="determinate"
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              {Math.round(syncStatus.progress)}%
            </Text>
          </View>
        )}

        {lastSyncDisplay ? (
          <Text style={styles.lastSyncText}>
            Last synced: {lastSyncDisplay}
          </Text>
        ) : null}

        <Button
          title="Sync Now"
          onPress={syncNow}
          loading={isSyncing}
          disabled={isSyncing}
          buttonStyle={styles.syncButton}
          containerStyle={styles.syncButtonContainer}
          icon={{
            name: "sync",
            type: "ionicon",
            color: "white",
            size: 20,
          }}
        />
      </Card>

      <View style={styles.statsGrid}>
        <Card containerStyle={styles.statCard}>
          <View style={styles.statContent}>
            <Icon
              name="document-text"
              type="ionicon"
              color={theme.colors.primary}
              size={32}
            />
            <Text style={styles.statValue}>{syncStats?.total ?? 0}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
        </Card>

        <Card containerStyle={styles.statCard}>
          <View style={styles.statContent}>
            <Icon
              name="hourglass"
              type="ionicon"
              color={theme.colors.warning}
              size={32}
            />
            <Text style={styles.statValueWarning}>
              {syncStats?.pending ?? 0}
            </Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
        </Card>

        <Card containerStyle={styles.statCard}>
          <View style={styles.statContent}>
            <Icon
              name="checkmark-done"
              type="ionicon"
              color={theme.colors.success}
              size={32}
            />
            <Text style={styles.statValueSuccess}>
              {syncStats?.synced ?? 0}
            </Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
        </Card>
      </View>

      <Card containerStyle={styles.infoCard}>
        <Card.Title style={styles.cardTitle}>ABOUT SYNC</Card.Title>
        <Text style={styles.infoText}>
          • Entries are automatically synced in the background when a stable
          connection is available.
        </Text>
        <Text style={styles.infoText}>
          • Tap "Sync Now" to trigger an immediate sync cycle.
        </Text>
        <Text style={styles.infoText}>
          • Draft entries remain on device and sync once you reconnect.
        </Text>
        <Text style={styles.infoText}>
          • After syncing, submit entries to your organization for verification.
        </Text>
      </Card>

      <Card containerStyle={styles.networkCard}>
        <Card.Title style={styles.cardTitle}>NETWORK STATUS</Card.Title>
        <View style={styles.networkRow}>
          <Icon
            name={netInfo.isConnected ? "wifi" : "wifi-outline"}
            type="ionicon"
            color={netInfo.isConnected ? theme.colors.success : theme.colors.error}
            size={24}
          />
          <View style={styles.networkInfo}>
            <Text style={styles.networkLabel}>Connection</Text>
            <Text style={styles.networkValue}>
              {netInfo.isConnected ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
        <View style={styles.networkRow}>
          <Icon
            name="cloud"
            type="ionicon"
            color={theme.colors.primary}
            size={24}
          />
          <View style={styles.networkInfo}>
            <Text style={styles.networkLabel}>Sync Status</Text>
            <Text style={styles.networkValue}>
              {isSyncing ? "Syncing" : "Ready"}
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}
