import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, Button } from "@rneui/themed";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Card>
        <Card.Title>Pilot Profile</Card.Title>
        <Card.Divider />

        {user ? (
          <>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{user.name}</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>

            {user.licenseNumber && (
              <>
                <Text style={styles.label}>License Number</Text>
                <Text style={styles.value}>{user.licenseNumber}</Text>
              </>
            )}
          </>
        ) : (
          <Text style={styles.value}>No profile information available.</Text>
        )}
      </Card>

      <Button
        title="Logout"
        onPress={logout}
        buttonStyle={styles.logoutButton}
        containerStyle={styles.logoutContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },
  value: {
    fontSize: 18,
    color: "#333",
    marginTop: 4,
  },
  logoutContainer: {
    marginTop: 24,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
  },
});
