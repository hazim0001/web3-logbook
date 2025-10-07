import React, { useMemo } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  ListItem,
  Text,
} from "@rneui/themed";
import { useAuth } from "../contexts/AuthContext";
import { useSync } from "../contexts/SyncContext";
import { useTheme } from "../contexts/ThemeContext";

const SUPPORT_EMAIL = "support@flightlog.example.com";
const PRIVACY_URL = "https://flightlog.example.com/privacy";
const TERMS_URL = "https://flightlog.example.com/terms";
const APP_VERSION = "1.0.0";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { syncStats } = useSync();
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        cardBase: {
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
        profileHeader: {
          alignItems: "center",
          paddingVertical: 20,
        },
        avatar: {
          marginBottom: 15,
        },
        userName: {
          fontSize: 24,
          fontWeight: "bold",
          color: theme.colors.text,
          marginBottom: 4,
        },
        userEmail: {
          fontSize: 16,
          color: theme.colors.textSecondary,
          marginBottom: 4,
        },
        licenseNo: {
          fontSize: 14,
          color: theme.colors.primary,
          fontWeight: "600",
        },
        cardTitle: {
          fontSize: 12,
          fontWeight: "bold",
          color: theme.colors.textSecondary,
          textAlign: "left",
          letterSpacing: 1,
        },
        divider: {
          marginVertical: 10,
          backgroundColor: theme.colors.border,
        },
        statsRow: {
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 10,
        },
        statBox: {
          alignItems: "center",
        },
        statValue: {
          fontSize: 28,
          fontWeight: "bold",
          color: theme.colors.primary,
        },
        statLabel: {
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginTop: 4,
        },
        listItem: {
          backgroundColor: theme.colors.card,
          paddingVertical: 14,
        },
        listItemTitle: {
          color: theme.colors.text,
          fontSize: 16,
        },
        listItemSubtitle: {
          color: theme.colors.textSecondary,
          fontSize: 13,
          marginTop: 2,
        },
        blockchainCard: {
          borderRadius: 12,
          marginTop: 16,
          marginHorizontal: 16,
          backgroundColor: theme.dark ? theme.colors.card : "#F0F7FF",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.primary,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        blockchainHeader: {
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
        },
        blockchainIcon: {
          fontSize: 36,
          marginRight: 16,
        },
        blockchainText: {
          flex: 1,
        },
        blockchainTitle: {
          fontSize: 16,
          fontWeight: "bold",
          color: theme.colors.primary,
          marginBottom: 4,
        },
        blockchainSubtitle: {
          fontSize: 13,
          color: theme.colors.primary,
          opacity: 0.8,
        },
        blockchainLinkButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 16,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: theme.dark
            ? "rgba(10, 132, 255, 0.15)"
            : "rgba(0, 122, 255, 0.08)",
          borderRadius: 10,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.primary,
        },
        blockchainLinkText: {
          fontSize: 14,
          fontWeight: "600",
          color: theme.colors.primary,
          marginHorizontal: 8,
        },
        logoutButton: {
          backgroundColor: theme.colors.error,
          borderRadius: 10,
          paddingVertical: 14,
        },
        logoutButtonContainer: {
          marginHorizontal: 16,
          marginTop: 32,
        },
        logoutButtonTitle: {
          fontWeight: "600",
        },
        bottomPadding: {
          height: 40,
        },
      }),
    [theme]
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleSupport = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  const handlePrivacy = () => Linking.openURL(PRIVACY_URL);
  const handleTerms = () => Linking.openURL(TERMS_URL);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.cardBase}>
        <View style={styles.profileHeader}>
          <Avatar
            size="large"
            rounded
            title={user ? getInitials(user.name) : "U"}
            containerStyle={styles.avatar}
            overlayContainerStyle={{ backgroundColor: theme.colors.primary }}
            titleStyle={{ fontSize: 32 }}
          />
          <Text style={styles.userName}>{user?.name ?? "Unknown Pilot"}</Text>
          <Text style={styles.userEmail}>{user?.email ?? "No email"}</Text>
          {user?.license_no ? (
            <Text style={styles.licenseNo}>License: {user.license_no}</Text>
          ) : null}
        </View>
      </Card>

      <Card containerStyle={styles.cardBase}>
        <Card.Title style={styles.cardTitle}>YOUR STATISTICS</Card.Title>
        <Divider style={styles.divider} />
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{syncStats?.total ?? 0}</Text>
            <Text style={styles.statLabel}>Total Flights</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {syncStats?.synced ?? 0}
            </Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              {syncStats?.pending ?? 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </Card>

      <Card containerStyle={styles.cardBase}>
        <Card.Title style={styles.cardTitle}>ACCOUNT</Card.Title>
        <Divider style={styles.divider} />
        <ListItem bottomDivider containerStyle={styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>
              Edit Profile
            </ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron color={theme.colors.textSecondary} />
        </ListItem>
        <ListItem bottomDivider containerStyle={styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>
              Change Password
            </ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron color={theme.colors.textSecondary} />
        </ListItem>
        <ListItem containerStyle={styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>
              Notification Settings
            </ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron color={theme.colors.textSecondary} />
        </ListItem>
      </Card>

      <Card containerStyle={styles.cardBase}>
        <Card.Title style={styles.cardTitle}>ABOUT</Card.Title>
        <Divider style={styles.divider} />
        <ListItem bottomDivider onPress={handleSupport} containerStyle={styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>Support</ListItem.Title>
            <ListItem.Subtitle style={styles.listItemSubtitle}>
              {SUPPORT_EMAIL}
            </ListItem.Subtitle>
          </ListItem.Content>
          <ListItem.Chevron color={theme.colors.textSecondary} />
        </ListItem>
        <ListItem bottomDivider onPress={handlePrivacy} containerStyle={styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>Privacy Policy</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron color={theme.colors.textSecondary} />
        </ListItem>
        <ListItem bottomDivider onPress={handleTerms} containerStyle={styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>Terms of Service</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron color={theme.colors.textSecondary} />
        </ListItem>
        <ListItem containerStyle={styles.listItem}>
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>Version</ListItem.Title>
            <ListItem.Subtitle style={styles.listItemSubtitle}>
              {APP_VERSION}
            </ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
      </Card>

      <Card containerStyle={styles.blockchainCard}>
        <View style={styles.blockchainHeader}>
          <Text style={styles.blockchainIcon}>🔗</Text>
          <View style={styles.blockchainText}>
            <Text style={styles.blockchainTitle}>Blockchain Verified</Text>
            <Text style={styles.blockchainSubtitle}>
              Your flights are cryptographically secured on Polygon blockchain
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.blockchainLinkButton}
          onPress={() => Linking.openURL("https://polygonscan.com")}
        >
          <Icon
            name="link-outline"
            type="ionicon"
            color={theme.colors.primary}
            size={18}
          />
          <Text style={styles.blockchainLinkText}>View on Polygonscan</Text>
          <Icon
            name="open-outline"
            type="ionicon"
            color={theme.colors.primary}
            size={16}
          />
        </TouchableOpacity>
      </Card>

      <Button
        title="Logout"
        onPress={handleLogout}
        buttonStyle={styles.logoutButton}
        containerStyle={styles.logoutButtonContainer}
        titleStyle={styles.logoutButtonTitle}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}
