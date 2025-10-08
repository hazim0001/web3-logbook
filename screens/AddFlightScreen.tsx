import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import {
  Button,
  Card,
  Icon,
  Input,
  Text,
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

const formatTimeDisplay = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}`;
};

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
        card: {
          borderRadius: 16,
          marginHorizontal: 16,
          marginTop: 16,
          padding: 18,
          backgroundColor: theme.colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 18,
        },
        sectionTitle: {
          marginLeft: 12,
          fontSize: 16,
          fontWeight: "700",
          color: theme.colors.text,
          letterSpacing: 0.3,
        },
        row: {
          flexDirection: "row",
          gap: 12,
        },
        halfInput: {
          flex: 1,
        },
        attachmentButtons: {
          flexDirection: "row",
          gap: 12,
          marginBottom: 16,
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
          backgroundColor: theme.colors.inputBackground,
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
        summaryHeading: {
          fontSize: 22,
          fontWeight: "700",
          color: theme.colors.text,
        },
        summarySubheading: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginTop: 4,
        },
        summaryChip: {
          alignSelf: "flex-start",
          marginTop: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: theme.colors.inputBackground,
        },
        summaryChipText: {
          fontSize: 12,
          fontWeight: "600",
          color: theme.colors.textSecondary,
        },
        summaryTotals: {
          flexDirection: "row",
          marginTop: 16,
          gap: 12,
        },
        summaryTotalBox: {
          flex: 1,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          backgroundColor: theme.colors.inputBackground,
        },
        summaryTotalLabel: {
          fontSize: 12,
          color: theme.colors.textSecondary,
        },
        summaryTotalValue: {
          fontSize: 20,
          fontWeight: "700",
          color: theme.colors.text,
          marginTop: 4,
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

  const renderInput = ({
    label,
    value,
    onChange,
    keyboardType = "default",
    containerStyle,
    autoCapitalize,
    placeholder = "—",
  }: {
    label: string;
    value: string;
    onChange: (text: string) => void;
    keyboardType?: "default" | "numeric" | "email-address";
    containerStyle?: any;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    placeholder?: string;
  }) => (
    <Input
      label={label}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      containerStyle={[{ marginBottom: 16 }, containerStyle]}
      inputContainerStyle={{
        backgroundColor: theme.colors.inputBackground,
        borderBottomWidth: 0,
        borderRadius: 10,
        paddingHorizontal: 12,
      }}
      labelStyle={{ color: theme.colors.textSecondary, marginBottom: 6 }}
      inputStyle={{ color: theme.colors.text }}
      placeholderTextColor={theme.colors.textSecondary}
    />
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
        <Card containerStyle={styles.card}>
          <Text style={styles.summaryHeading}>
            {aircraftReg ? aircraftReg.toUpperCase() : "New Flight"}
          </Text>
          <Text style={styles.summarySubheading}>
            {flightDate.toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipText}>
              {isEditMode ? "Editing" : "Draft"}
            </Text>
          </View>
          <View style={styles.summaryTotals}>
            <View style={styles.summaryTotalBox}>
              <Text style={styles.summaryTotalLabel}>Total Time</Text>
              <Text style={styles.summaryTotalValue}>
                {totalMinutes > 0 ? formatTimeDisplay(totalMinutes) : "--:--"}
              </Text>
            </View>
            <View style={styles.summaryTotalBox}>
              <Text style={styles.summaryTotalLabel}>Landings</Text>
              <Text style={styles.summaryTotalValue}>
                {Number(landingsDay || 0) + Number(landingsNight || 0)}
              </Text>
            </View>
          </View>
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="airplane-outline" type="ionicon" color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Flight Details</Text>
          </View>

          <Button
            title={flightDate.toLocaleDateString()}
            type="outline"
            onPress={() => setShowDatePicker(true)}
          />
          {showDatePicker ? (
            <DateTimePicker
              value={flightDate}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setFlightDate(date);
              }}
            />
          ) : null}

          {renderInput({
            label: "Aircraft Registration *",
            value: aircraftReg,
            onChange: setAircraftReg,
            autoCapitalize: "characters",
          })}
          {renderInput({
            label: "Aircraft Type",
            value: aircraftType,
            onChange: setAircraftType,
            autoCapitalize: "characters",
          })}
          <View style={styles.row}>
            {renderInput({
              label: "From *",
              value: routeFrom,
              onChange: setRouteFrom,
              autoCapitalize: "characters",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "To *",
              value: routeTo,
              onChange: setRouteTo,
              autoCapitalize: "characters",
              containerStyle: styles.halfInput,
            })}
          </View>
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="time-outline" type="ionicon" color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Flight Time</Text>
          </View>

          <View style={styles.row}>
            {renderInput({
              label: "PIC Hours",
              value: picHours,
              onChange: setPicHours,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "PIC Minutes",
              value: picMinutes,
              onChange: setPicMinutes,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
          </View>
          <View style={styles.row}>
            {renderInput({
              label: "SIC Hours",
              value: sicHours,
              onChange: setSicHours,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "SIC Minutes",
              value: sicMinutes,
              onChange: setSicMinutes,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
          </View>
          <View style={styles.row}>
            {renderInput({
              label: "Dual Hours",
              value: dualHours,
              onChange: setDualHours,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "Dual Minutes",
              value: dualMinutes,
              onChange: setDualMinutes,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
          </View>
          <View style={styles.row}>
            {renderInput({
              label: "Night Hours",
              value: nightHours,
              onChange: setNightHours,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "Night Minutes",
              value: nightMinutes,
              onChange: setNightMinutes,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
          </View>
          <View style={styles.row}>
            {renderInput({
              label: "Instrument Hours",
              value: instrumentHours,
              onChange: setInstrumentHours,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "Instrument Minutes",
              value: instrumentMinutes,
              onChange: setInstrumentMinutes,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
          </View>
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="trail-sign-outline" type="ionicon" color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Landings</Text>
          </View>
          <View style={styles.row}>
            {renderInput({
              label: "Day",
              value: landingsDay,
              onChange: setLandingsDay,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "Night",
              value: landingsNight,
              onChange: setLandingsNight,
              keyboardType: "numeric",
              containerStyle: styles.halfInput,
            })}
          </View>
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="images-outline" type="ionicon" color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Attachments</Text>
          </View>
          <View style={styles.attachmentButtons}>
            <Button
              title="Take Photo"
              type="outline"
              onPress={takePhoto}
              containerStyle={styles.attachmentButton}
              titleStyle={{ color: theme.colors.primary }}
              buttonStyle={{ borderColor: theme.colors.primary }}
            />
            <Button
              title="Choose Photo"
              type="outline"
              onPress={pickImage}
              containerStyle={styles.attachmentButton}
              titleStyle={{ color: theme.colors.primary }}
              buttonStyle={{ borderColor: theme.colors.primary }}
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
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="create-outline" type="ionicon" color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Remarks</Text>
          </View>
          <Input
            placeholder="Additional notes..."
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
            inputContainerStyle={{
              backgroundColor: theme.colors.inputBackground,
              borderBottomWidth: 0,
              borderRadius: 10,
              paddingHorizontal: 12,
            }}
            inputStyle={{ color: theme.colors.text }}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </Card>

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
