import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import {
  Text,
  Badge,
  SearchBar,
  ButtonGroup,
} from "@rneui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import Database, { FlightEntry } from "../services/database";
import { useSync } from "../contexts/SyncContext";
import { useTheme } from "../contexts/ThemeContext";

const filters = ["All", "Draft", "Submitted", "Approved", "Anchored"];
const statusMap: Record<number, FlightEntry["status"] | undefined> = {
  0: undefined,
  1: "draft",
  2: "submitted",
  3: "approved",
  4: "anchored",
};

export default function LogbookScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { syncNow, isSyncing, syncStats } = useSync();

  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<FlightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterIndex, setFilterIndex] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        statsHeader: {
          flexDirection: "row",
          padding: 15,
          backgroundColor: theme.colors.card,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        statCard: {
          flex: 1,
          alignItems: "center",
        },
        statValue: {
          fontSize: 24,
          fontWeight: "bold",
          color: theme.colors.primary,
        },
        statValueWarning: {
          fontSize: 24,
          fontWeight: "bold",
          color: theme.colors.warning,
        },
        statValueSuccess: {
          fontSize: 24,
          fontWeight: "bold",
          color: theme.colors.success,
        },
        statLabel: {
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginTop: 4,
        },
        searchContainer: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,
          borderBottomWidth: 0,
          paddingHorizontal: 15,
        },
        searchInputContainer: {
          backgroundColor: theme.colors.card,
          borderRadius: 12,
        },
        searchInput: {
          color: theme.colors.text,
        },
        filterContainer: {
          marginHorizontal: 15,
          marginVertical: 10,
          height: 35,
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        listContent: {
          padding: 15,
          paddingBottom: 80,
        },
        entryCard: {
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          padding: 15,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        entryHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        },
        entryDate: {
          fontSize: 16,
          fontWeight: "600",
          color: theme.colors.text,
        },
        entryAircraft: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginTop: 2,
        },
        entryRoute: {
          marginBottom: 10,
        },
        routeText: {
          fontSize: 15,
          color: theme.colors.primary,
          fontWeight: "500",
        },
        entryFooter: {
          flexDirection: "row",
          justifyContent: "space-between",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          paddingTop: 10,
        },
        timeContainer: {
          flex: 1,
        },
        timeLabel: {
          fontSize: 11,
          color: theme.colors.textSecondary,
          marginBottom: 2,
        },
        timeValue: {
          fontSize: 15,
          fontWeight: "600",
          color: theme.colors.text,
        },
        syncIcon: {
          justifyContent: "center",
          alignItems: "center",
        },
        syncIconText: {
          fontSize: 20,
          color: theme.colors.warning,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        emptyContainer: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 60,
        },
        emptyIcon: {
          fontSize: 64,
          marginBottom: 15,
        },
        emptyText: {
          fontSize: 18,
          fontWeight: "600",
          color: theme.colors.text,
          marginBottom: 8,
        },
        emptySubtext: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          textAlign: "center",
        },
        fab: {
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: theme.colors.primary,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        fabIcon: {
          fontSize: 32,
          color: "#FFFFFF",
          fontWeight: "300",
        },
      }),
    [theme]
  );

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const status = statusMap[filterIndex];
      const data = await Database.getAllEntries(
        status ? { status } : undefined
      );
      setEntries(data);
      setFilteredEntries(data);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  }, [filterIndex]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  useEffect(() => {
    if (!search) {
      setFilteredEntries(entries);
      return;
    }

    const searchTerm = search.toLowerCase();
    const filtered = entries.filter((entry) => {
      return (
        entry.aircraftReg.toLowerCase().includes(searchTerm) ||
        (entry.routeFrom?.toLowerCase().includes(searchTerm) ?? false) ||
        (entry.routeTo?.toLowerCase().includes(searchTerm) ?? false)
      );
    });
    setFilteredEntries(filtered);
  }, [search, entries]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await syncNow();
      await loadEntries();
    } finally {
      setRefreshing(false);
    }
  }, [syncNow, loadEntries]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (
    status: FlightEntry["status"],
    syncStatus: FlightEntry["syncStatus"]
  ) => {
    let text = status.charAt(0).toUpperCase() + status.slice(1);
    let color = theme.colors.textSecondary;

    if (syncStatus === "pending") {
      text = "Pending Sync";
      color = theme.colors.warning;
    } else if (status === "submitted") {
      color = theme.colors.primary;
    } else if (status === "approved") {
      color = theme.colors.success;
    } else if (status === "anchored") {
      color = theme.colors.info;
    }

    return { text, color };
  };

  const renderEntry = ({ item }: { item: FlightEntry }) => {
    const badge = getStatusBadge(item.status, item.syncStatus);

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() =>
          navigation.navigate("FlightDetail", {
            entryId: item.id,
          })
        }
      >
        <View style={styles.entryHeader}>
          <View>
            <Text style={styles.entryDate}>
              {format(new Date(item.flightDate), "MMM dd, yyyy")}
            </Text>
            <Text style={styles.entryAircraft}>
              {item.aircraftReg} • {item.aircraftType || "N/A"}
            </Text>
          </View>
          <Badge
            value={badge.text}
            badgeStyle={{ backgroundColor: badge.color }}
            textStyle={{ fontSize: 11 }}
          />
        </View>

        <View style={styles.entryRoute}>
          <Text style={styles.routeText}>
            {item.routeFrom || "???"} → {item.routeTo || "???"}
          </Text>
        </View>

        <View style={styles.entryFooter}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Total</Text>
            <Text style={styles.timeValue}>
              {formatTime(item.totalTime)}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>PIC</Text>
            <Text style={styles.timeValue}>
              {formatTime(item.picTime)}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Landings</Text>
            <Text style={styles.timeValue}>
              {item.landingsDay + item.landingsNight}
            </Text>
          </View>
          {item.syncStatus === "pending" && (
            <View style={styles.syncIcon}>
              <Text style={styles.syncIconText}>⟳</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{syncStats?.total ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValueWarning}>
            {syncStats?.pending ?? 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValueSuccess}>
            {syncStats?.synced ?? 0}
          </Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
      </View>

      <SearchBar
        placeholder="Search flights..."
        value={search}
        onChangeText={setSearch}
        platform="ios"
        containerStyle={styles.searchContainer}
        inputContainerStyle={styles.searchInputContainer}
        inputStyle={styles.searchInput}
      />

      <ButtonGroup
        buttons={filters}
        selectedIndex={filterIndex}
        onPress={setFilterIndex}
        containerStyle={styles.filterContainer}
        selectedButtonStyle={{ backgroundColor: theme.colors.primary }}
        textStyle={{ color: theme.colors.textSecondary, fontSize: 12 }}
        selectedTextStyle={{ color: "#FFFFFF", fontWeight: "600" }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          renderItem={renderEntry}
          keyExtractor={(item) =>
            item.id ? item.id.toString() : `${item.flightDate}-${item.aircraftReg}`
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isSyncing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No flight entries yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add your first flight
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddFlight")}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
