import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Input,
  Button,
  Text,
  Icon,
} from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import database, { FlightEntry } from "../services/database";
import { showMessage } from "react-native-flash-message";

interface Attachment {
  uri: string;
  filename: string;
  size: number;
}

interface RouteParams {
  entryId?: number;
  flightId?: number;
}

export default function AddFlightScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { theme } = useTheme();

  const params = route.params as RouteParams | undefined;
  const entryId = params?.entryId ?? params?.flightId;

  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [flightDate, setFlightDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [aircraftReg, setAircraftReg] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [picHours, setPicHours] = useState("");
  const [picMinutes, setPicMinutes] = useState("");
  const [sicHours, setSicHours] = useState("");
  const [sicMinutes, setSicMinutes] = useState("");
  const [dualHours, setDualHours] = useState("");
  const [dualMinutes, setDualMinutes] = useState("");
  const [nightHours, setNightHours] = useState("");
  const [nightMinutes, setNightMinutes] = useState("");
  const [instrumentHours, setInstrumentHours] = useState("");
  const [instrumentMinutes, setInstrumentMinutes] = useState("");
  const [landingsDay, setLandingsDay] = useState("");
  const [landingsNight, setLandingsNight] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (entryId) {
      setIsEditMode(true);
      loadEntry(entryId);
    }
  }, [entryId]);

  const loadEntry = async (id: number) => {
    try {
      const entry = await database.getEntry(id);
      if (!entry) {
        throw new Error("Entry not found");
      }

      setFlightDate(new Date(entry.flightDate));
      setAircraftReg(entry.aircraftReg);
      setAircraftType(entry.aircraftType ?? "");
      setRouteFrom(entry.routeFrom ?? "");
      setRouteTo(entry.routeTo ?? "");
      setPicHours(Math.floor(entry.picTime / 60).toString());
      setPicMinutes((entry.picTime % 60).toString());
      setSicHours(Math.floor(entry.sicTime / 60).toString());
      setSicMinutes((entry.sicTime % 60).toString());
      setDualHours(Math.floor(entry.dualTime / 60).toString());
      setDualMinutes((entry.dualTime % 60).toString());
      setNightHours(Math.floor(entry.nightTime / 60).toString());
      setNightMinutes((entry.nightTime % 60).toString());
      setInstrumentHours(Math.floor(entry.instrumentTime / 60).toString());
      setInstrumentMinutes((entry.instrumentTime % 60).toString());
      setLandingsDay(entry.landingsDay.toString());
      setLandingsNight(entry.landingsNight.toString());
      setRemarks(entry.remarks ?? "");

      if (entry.attachments) {
        try {
          setAttachments(JSON.parse(entry.attachments));
        } catch {
          setAttachments([]);
        }
      }
    } catch (error) {
      console.error("Failed to load entry:", error);
      showMessage({ message: "Failed to load entry", type: "danger" });
      navigation.goBack();
    }
  };

  const convertToMinutes = (hours: string, minutes: string) => {
    const h = parseInt(hours || "0", 10);
    const m = parseInt(minutes || "0", 10);
    return h * 60 + m;
  };

  const totalMinutes = useMemo(() => {
    const pic = convertToMinutes(picHours, picMinutes);
    const sic = convertToMinutes(sicHours, sicMinutes);
    const dual = convertToMinutes(dualHours, dualMinutes);
    return Math.max(pic, sic, dual);
  }, [picHours, picMinutes, sicHours, sicMinutes, dualHours, dualMinutes]);

  const validateForm = () => {
    if (!aircraftReg.trim()) {
      showMessage({ message: "Aircraft registration is required", type: "warning" });
      return false;
    }

    if (!routeFrom.trim() || !routeTo.trim()) {
      showMessage({ message: "Route is required", type: "warning" });
      return false;
    }

    if (totalMinutes === 0) {
      showMessage({ message: "Please enter flight time", type: "warning" });
      return false;
    }

    return true;
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showMessage({ message: "Photo library access is required", type: "warning" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const newAttachment: Attachment = {
        uri: asset.uri,
        filename: asset.fileName ?? `photo_${Date.now()}.jpg`,
        size: asset.fileSize ?? 0,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showMessage({ message: "Camera access is required", type: "warning" });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const newAttachment: Attachment = {
        uri: asset.uri,
        filename: asset.fileName ?? `photo_${Date.now()}.jpg`,
        size: asset.fileSize ?? 0,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (asDraft = true) => {
    if (!user) {
      showMessage({ message: "You must be logged in to log a flight", type: "danger" });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const payload: Omit<FlightEntry, "id" | "createdAt" | "updatedAt"> = {
        pilotId: user.id,
        status: asDraft ? "draft" : "submitted",
        flightDate: flightDate.toISOString().split("T")[0],
        aircraftReg: aircraftReg.toUpperCase().trim(),
        aircraftType: aircraftType.trim() || undefined,
        routeFrom: routeFrom.toUpperCase().trim(),
        routeTo: routeTo.toUpperCase().trim(),
        picTime: convertToMinutes(picHours, picMinutes),
        sicTime: convertToMinutes(sicHours, sicMinutes),
        dualTime: convertToMinutes(dualHours, dualMinutes),
        nightTime: convertToMinutes(nightHours, nightMinutes),
        instrumentTime: convertToMinutes(instrumentHours, instrumentMinutes),
        totalTime: totalMinutes,
        landingsDay: parseInt(landingsDay || "0", 10),
        landingsNight: parseInt(landingsNight || "0", 10),
        remarks: remarks.trim() || undefined,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : undefined,
        syncStatus: "pending",
      };

      if (isEditMode && entryId) {
        await database.updateEntry(entryId, payload);
        showMessage({ message: "Flight entry updated", type: "success" });
      } else {
        await database.createEntry(payload);
        showMessage({
          message: `Flight entry ${asDraft ? "saved as draft" : "saved"}`,
          type: "success",
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error("Save error:", error);
      showMessage({ message: "Failed to save flight entry", type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scrollView: {
          flex: 1,
        },
        section: {
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: "600",
          color: theme.colors.text,
          marginBottom: 16,
        },
        row: {
          flexDirection: "row",
          gap: 12,
        },
        halfInput: {
          flex: 1,
        },
        label: {
          fontSize: 13,
          fontWeight: "500",
          color: theme.colors.textSecondary,
          marginLeft: 4,
          marginBottom: 4,
        },
        dateButton: {
          marginBottom: 16,
        },
        attachmentButtons: {
          flexDirection: "row",
          gap: 12,
          marginBottom: 12,
        },
        attachmentButton: {
          flex: 1,
        },
        attachmentsList: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        },
        attachmentItem: {
          width: 100,
          height: 100,
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
        },
        attachmentImage: {
          width: "100%",
          height: "100%",
        },
        removeButton: {
          position: "absolute",
          top: -8,
          right: -8,
          backgroundColor: theme.colors.card,
          borderRadius: 12,
        },
        buttonContainer: {
          padding: 16,
          gap: 12,
        },
        draftButton: {
          backgroundColor: theme.colors.textSecondary,
          borderRadius: 12,
          paddingVertical: 14,
        },
        saveButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: 12,
          paddingVertical: 14,
        },
        bottomPadding: {
          height: 40,
        },
      }),
    [theme]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Details</Text>
          <Button
            title={flightDate.toLocaleDateString()}
            type="outline"
            onPress={() => setShowDatePicker(true)}
            containerStyle={styles.dateButton}
            icon={{ name: "calendar-outline", type: "ionicon", color: theme.colors.primary }}
            titleStyle={{ color: theme.colors.primary }}
            buttonStyle={{ borderColor: theme.colors.primary }}
          />

          {showDatePicker ? (
            <DateTimePicker
              value={flightDate}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) {
                  setFlightDate(date);
                }
              }}
            />
          ) : null}

          <Input
            label="Aircraft Registration *"
            placeholder="N12345"
            value={aircraftReg}
            onChangeText={setAircraftReg}
            autoCapitalize="characters"
            autoCorrect={false}
            leftIcon={{ type: "ionicon", name: "airplane-outline", color: theme.colors.primary }}
          />

          <Input
            label="Aircraft Type"
            placeholder="C172, B737, A320, etc."
            value={aircraftType}
            onChangeText={setAircraftType}
            autoCapitalize="characters"
            leftIcon={{ type: "ionicon", name: "information-circle-outline", color: theme.colors.primary }}
          />

          <View style={styles.row}>
            <Input
              label="From *"
              placeholder="KJFK"
              value={routeFrom}
              onChangeText={setRouteFrom}
              autoCapitalize="characters"
              containerStyle={styles.halfInput}
            />
            <Input
              label="To *"
              placeholder="KLAX"
              value={routeTo}
              onChangeText={setRouteTo}
              autoCapitalize="characters"
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Time</Text>

          <Text style={styles.label}>PIC Time</Text>
          <View style={styles.row}>
            <Input
              placeholder="Hours"
              value={picHours}
              onChangeText={setPicHours}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              placeholder="Minutes"
              value={picMinutes}
              onChangeText={setPicMinutes}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>

          <Text style={styles.label}>SIC Time</Text>
          <View style={styles.row}>
            <Input
              placeholder="Hours"
              value={sicHours}
              onChangeText={setSicHours}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              placeholder="Minutes"
              value={sicMinutes}
              onChangeText={setSicMinutes}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>

          <Text style={styles.label}>Dual Time</Text>
          <View style={styles.row}>
            <Input
              placeholder="Hours"
              value={dualHours}
              onChangeText={setDualHours}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              placeholder="Minutes"
              value={dualMinutes}
              onChangeText={setDualMinutes}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>

          <Text style={styles.label}>Night Time</Text>
          <View style={styles.row}>
            <Input
              placeholder="Hours"
              value={nightHours}
              onChangeText={setNightHours}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              placeholder="Minutes"
              value={nightMinutes}
              onChangeText={setNightMinutes}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>

          <Text style={styles.label}>Instrument Time</Text>
          <View style={styles.row}>
            <Input
              placeholder="Hours"
              value={instrumentHours}
              onChangeText={setInstrumentHours}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              placeholder="Minutes"
              value={instrumentMinutes}
              onChangeText={setInstrumentMinutes}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Landings</Text>
          <View style={styles.row}>
            <Input
              label="Day"
              placeholder="0"
              value={landingsDay}
              onChangeText={setLandingsDay}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              label="Night"
              placeholder="0"
              value={landingsNight}
              onChangeText={setLandingsNight}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          <View style={styles.attachmentButtons}>
            <Button
              title="Take Photo"
              type="outline"
              onPress={takePhoto}
              icon={{ name: "camera-outline", type: "ionicon", color: theme.colors.primary }}
              titleStyle={{ color: theme.colors.primary }}
              buttonStyle={{ borderColor: theme.colors.primary }}
              containerStyle={styles.attachmentButton}
            />
            <Button
              title="Choose Photo"
              type="outline"
              onPress={pickImage}
              icon={{ name: "images-outline", type: "ionicon", color: theme.colors.primary }}
              titleStyle={{ color: theme.colors.primary }}
              buttonStyle={{ borderColor: theme.colors.primary }}
              containerStyle={styles.attachmentButton}
            />
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {attachments.map((attachment, index) => (
                <View key={`${attachment.uri}-${index}`} style={styles.attachmentItem}>
                  <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeAttachment(index)}
                  >
                    <Icon name="close-circle" type="ionicon" color={theme.colors.error} size={24} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks</Text>
          <Input
            placeholder="Additional notes..."
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Save as Draft"
            onPress={() => handleSave(true)}
            loading={saving}
            buttonStyle={styles.draftButton}
          />
          <Button
            title={isEditMode ? "Update" : "Save"}
            onPress={() => handleSave(false)}
            loading={saving}
            buttonStyle={styles.saveButton}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
