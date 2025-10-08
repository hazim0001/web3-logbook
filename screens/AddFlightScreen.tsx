import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  KeyboardTypeOptions,
} from "react-native";
import {
  Button,
  Card,
  Icon,
  Input,
  InputProps,
  Text,
} from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import database, {
  AdditionalFlightData,
  Airport,
  FlightEntry,
} from "../services/database";
import { showMessage } from "react-native-flash-message";
import AirportAutocomplete, {
  useAirportSelection,
} from "../components/AirportAutocomplete";
import { NightTimeCalculator } from "../utils/nightTimeCalculator";
import {
  calculateFlightDuration,
  decimalToHoursMinutes,
  formatTimeWithTimezone,
  getAirportTimezoneInfo,
  isValidTimeFormat,
  localTimeToUTC,
  parseTimeInput,
  utcToLocalTime,
} from "../utils/timezoneUtils";

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

const convertToMinutes = (hours: string, minutes: string) => {
  const h = parseInt(hours || "0", 10);
  const m = parseInt(minutes || "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return 0;
  }
  return h * 60 + m;
};

export default function AddFlightScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { theme } = useTheme();

  const params = route.params as RouteParams | undefined;
  const entryId = params?.entryId ?? params?.flightId;

  const {
    departureAirport,
    setDepartureAirport,
    arrivalAirport,
    setArrivalAirport,
    errors: airportErrors,
    validateAirports,
    clearErrors: clearAirportErrors,
  } = useAirportSelection();

  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [flightDate, setFlightDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [aircraftReg, setAircraftReg] = useState("");
  const [aircraftType, setAircraftType] = useState("");

  const [flightNumber, setFlightNumber] = useState("");
  const [scheduledOut, setScheduledOut] = useState("");
  const [scheduledIn, setScheduledIn] = useState("");
  const [actualOut, setActualOut] = useState("");
  const [actualIn, setActualIn] = useState("");

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

  const [autoCalculateNight, setAutoCalculateNight] = useState(true);
  const [nightTimeMethod, setNightTimeMethod] = useState<
    "manual" | "calculated" | "estimated"
  >("manual");

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

  const departureTimezoneInfo = useMemo(() => {
    if (!departureAirport) {
      return null;
    }
    return getAirportTimezoneInfo(departureAirport);
  }, [departureAirport]);

  const arrivalTimezoneInfo = useMemo(() => {
    if (!arrivalAirport) {
      return null;
    }
    return getAirportTimezoneInfo(arrivalAirport);
  }, [arrivalAirport]);

  const totalMinutes = useMemo(() => {
    const values = [
      convertToMinutes(picHours, picMinutes),
      convertToMinutes(sicHours, sicMinutes),
      convertToMinutes(dualHours, dualMinutes),
      convertToMinutes(nightHours, nightMinutes),
      convertToMinutes(instrumentHours, instrumentMinutes),
    ];
    return Math.max(...values);
  }, [
    picHours,
    picMinutes,
    sicHours,
    sicMinutes,
    dualHours,
    dualMinutes,
    nightHours,
    nightMinutes,
    instrumentHours,
    instrumentMinutes,
  ]);

  const totalLandings = useMemo(() => {
    const day = parseInt(landingsDay || "0", 10) || 0;
    const night = parseInt(landingsNight || "0", 10) || 0;
    return day + night;
  }, [landingsDay, landingsNight]);

  const routeLabel = useMemo(() => {
    if (departureAirport && arrivalAirport) {
      return `${departureAirport.icaoCode} → ${arrivalAirport.icaoCode}`;
    }
    if (departureAirport) {
      return `${departureAirport.icaoCode} → ???`;
    }
    if (arrivalAirport) {
      return `??? → ${arrivalAirport.icaoCode}`;
    }
    return "Route not set";
  }, [departureAirport, arrivalAirport]);

  const loadEntry = async (id: number) => {
    try {
      const entry = await database.getEntry(id);
      if (!entry) {
        throw new Error("Entry not found");
      }

      const depAirport: Airport | null = entry.departureAirportId
        ? await database.getAirport(entry.departureAirportId)
        : null;
      const arrAirport: Airport | null = entry.arrivalAirportId
        ? await database.getAirport(entry.arrivalAirportId)
        : null;

      setDepartureAirport(depAirport);
      setArrivalAirport(arrAirport);

      setFlightDate(new Date(entry.flightDate));
      setAircraftReg(entry.aircraftReg);
      setAircraftType(entry.aircraftType ?? "");

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
          const parsed: Attachment[] = JSON.parse(entry.attachments);
          setAttachments(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
          console.warn("Failed to parse attachments:", error);
          setAttachments([]);
        }
      }

      const additionalData: AdditionalFlightData | undefined = entry.additionalData
        ? (() => {
            try {
              return JSON.parse(entry.additionalData) as AdditionalFlightData;
            } catch (error) {
              console.warn("Failed to parse additional data:", error);
              return undefined;
            }
          })()
        : undefined;

      setFlightNumber(additionalData?.flightNumber ?? "");
      setScheduledOut(additionalData?.scheduledOut ?? "");
      setScheduledIn(additionalData?.scheduledIn ?? "");

      let actualOutValue = additionalData?.actualOut ?? "";
      let actualInValue = additionalData?.actualIn ?? "";

      if (!actualOutValue && entry.departureTimeUtc && depAirport?.timezone) {
        actualOutValue = utcToLocalTime(entry.departureTimeUtc, depAirport.timezone);
      }

      if (!actualInValue && entry.arrivalTimeUtc && arrAirport?.timezone) {
        actualInValue = utcToLocalTime(entry.arrivalTimeUtc, arrAirport.timezone);
      }

      setActualOut(actualOutValue);
      setActualIn(actualInValue);

      const shouldAutoCalc =
        entry.nightTimeMethod && entry.nightTimeMethod !== "manual";
      setAutoCalculateNight(shouldAutoCalc);
      setNightTimeMethod(entry.nightTimeMethod ?? (shouldAutoCalc ? "calculated" : "manual"));
    } catch (error) {
      console.error("Failed to load entry:", error);
      showMessage({ message: "Failed to load entry", type: "danger" });
      navigation.goBack();
    }
  };

  const calculateNightTime = useCallback(() => {
    if (
      !departureAirport ||
      !arrivalAirport ||
      !isValidTimeFormat(actualOut) ||
      !isValidTimeFormat(actualIn)
    ) {
      return;
    }

    try {
      const dateStr = flightDate.toISOString().split("T")[0];
      const depUtc = localTimeToUTC(
        dateStr,
        actualOut,
        departureAirport.timezone ?? "UTC"
      );
      let arrUtc = localTimeToUTC(
        dateStr,
        actualIn,
        arrivalAirport.timezone ?? "UTC"
      );

      let totalTime = calculateFlightDuration(depUtc, arrUtc);
      if (totalTime <= 0) {
        totalTime += 24;
      }

      const result = NightTimeCalculator.calculate(
        depUtc,
        arrUtc,
        departureAirport.latitude,
        departureAirport.longitude,
        arrivalAirport.latitude,
        arrivalAirport.longitude,
        totalTime
      );

      const { hours, minutes } = decimalToHoursMinutes(result.nightTime);
      setNightHours(hours.toString());
      setNightMinutes(minutes.toString());
      setNightTimeMethod(result.method);
    } catch (error) {
      console.error("Night time calculation error:", error);
    }
  }, [
    arrivalAirport,
    actualIn,
    actualOut,
    departureAirport,
    flightDate,
  ]);

  useEffect(() => {
    if (!autoCalculateNight) {
      setNightTimeMethod("manual");
      return;
    }

    if (
      departureAirport &&
      arrivalAirport &&
      isValidTimeFormat(actualOut) &&
      isValidTimeFormat(actualIn)
    ) {
      calculateNightTime();
    }
  }, [
    autoCalculateNight,
    calculateNightTime,
    departureAirport,
    arrivalAirport,
    actualOut,
    actualIn,
  ]);

  const validateForm = () => {
    if (!aircraftReg.trim()) {
      showMessage({
        message: "Aircraft registration is required",
        type: "warning",
      });
      return false;
    }

    if (!validateAirports()) {
      showMessage({
        message: "Please select both departure and arrival airports",
        type: "warning",
      });
      return false;
    }

    const timeFields = [
      { value: scheduledOut, label: "Scheduled Out" },
      { value: scheduledIn, label: "Scheduled In" },
      { value: actualOut, label: "Actual Out" },
      { value: actualIn, label: "Actual In" },
    ];

    for (const field of timeFields) {
      if (field.value && !isValidTimeFormat(field.value)) {
        showMessage({
          message: `${field.label} must be in HHmm format`,
          type: "warning",
        });
        return false;
      }
    }

    if (totalMinutes === 0) {
      showMessage({
        message: "Please enter flight time",
        type: "warning",
      });
      return false;
    }

    return true;
  };

  const handleTimeChange =
    (setter: (value: string) => void) => (text: string) => {
      const parsed = parseTimeInput(text);
      if (parsed) {
        setter(parsed);
      } else {
        setter(text);
      }
    };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showMessage({
        message: "Photo library access is required",
        type: "warning",
      });
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
      showMessage({
        message: "You must be logged in to log a flight",
        type: "danger",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const picTime = convertToMinutes(picHours, picMinutes);
      const sicTime = convertToMinutes(sicHours, sicMinutes);
      const dualTime = convertToMinutes(dualHours, dualMinutes);
      const nightTime = convertToMinutes(nightHours, nightMinutes);
      const instrumentTime = convertToMinutes(instrumentHours, instrumentMinutes);
      const totalTime = Math.max(
        picTime,
        sicTime,
        dualTime,
        nightTime,
        instrumentTime
      );

      const additionalData: AdditionalFlightData = {};

      if (flightNumber) {
        additionalData.flightNumber = flightNumber;
      }
      if (scheduledOut) {
        additionalData.scheduledOut = scheduledOut;
      }
      if (scheduledIn) {
        additionalData.scheduledIn = scheduledIn;
      }
      if (actualOut) {
        additionalData.actualOut = actualOut;
      }
      if (actualIn) {
        additionalData.actualIn = actualIn;
      }

      const dateStr = flightDate.toISOString().split("T")[0];

      let departureTimeUtc: string | undefined;
      let arrivalTimeUtc: string | undefined;

      if (actualOut && departureAirport?.timezone) {
        departureTimeUtc = localTimeToUTC(
          dateStr,
          actualOut,
          departureAirport.timezone
        );
        additionalData.actualOutUtc = departureTimeUtc;
      }

      if (actualIn && arrivalAirport?.timezone) {
        arrivalTimeUtc = localTimeToUTC(
          dateStr,
          actualIn,
          arrivalAirport.timezone
        );
        additionalData.actualInUtc = arrivalTimeUtc;
      }

      if (scheduledOut && departureAirport?.timezone) {
        additionalData.scheduledOutUtc = localTimeToUTC(
          dateStr,
          scheduledOut,
          departureAirport.timezone
        );
      }

      if (scheduledIn && arrivalAirport?.timezone) {
        additionalData.scheduledInUtc = localTimeToUTC(
          dateStr,
          scheduledIn,
          arrivalAirport.timezone
        );
      }

      const currentNightMethod = autoCalculateNight ? nightTimeMethod : "manual";

      const payload: Omit<FlightEntry, "id" | "createdAt" | "updatedAt"> = {
        pilotId: user.id,
        status: asDraft ? "draft" : "submitted",
        flightDate: dateStr,
        aircraftReg: aircraftReg.toUpperCase().trim(),
        aircraftType: aircraftType.trim() || undefined,
        routeFrom: departureAirport?.icaoCode,
        routeTo: arrivalAirport?.icaoCode,
        departureAirportId: departureAirport?.id,
        arrivalAirportId: arrivalAirport?.id,
        departureTimezone: departureAirport?.timezone,
        arrivalTimezone: arrivalAirport?.timezone,
        departureTimeUtc,
        arrivalTimeUtc,
        picTime,
        sicTime,
        dualTime,
        nightTime,
        instrumentTime,
        totalTime,
        landingsDay: parseInt(landingsDay || "0", 10),
        landingsNight: parseInt(landingsNight || "0", 10),
        remarks: remarks.trim() || undefined,
        attachments:
          attachments.length > 0 ? JSON.stringify(attachments) : undefined,
        nightTimeMethod: currentNightMethod,
        nightTimeCalculatedAt:
          currentNightMethod !== "manual" ? new Date().toISOString() : undefined,
        additionalData:
          Object.keys(additionalData).length > 0
            ? JSON.stringify(additionalData)
            : undefined,
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
          marginBottom: 12,
        },
        halfInput: {
          flex: 1,
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
        timezoneInfo: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        },
        timezoneText: {
          marginLeft: 6,
          fontSize: 12,
          color: theme.colors.textSecondary,
        },
        helpText: {
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginBottom: 12,
        },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        },
        switchLabel: {
          fontSize: 14,
          color: theme.colors.text,
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
    maxLength,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (text: string) => void;
    keyboardType?: KeyboardTypeOptions;
    containerStyle?: InputProps["containerStyle"];
    autoCapitalize?:
      | InputProps["autoCapitalize"]
      | "none"
      | "sentences"
      | "words"
      | "characters";
    placeholder?: string;
    maxLength?: number;
    disabled?: boolean;
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
      maxLength={maxLength}
      disabled={disabled}
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
          <Text style={styles.summarySubheading}>{routeLabel}</Text>
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
              <Text style={styles.summaryTotalValue}>{totalLandings}</Text>
            </View>
          </View>
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon
              name="airplane-outline"
              type="ionicon"
              color={theme.colors.primary}
            />
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
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setFlightDate(date);
              }}
            />
          ) : null}

          {renderInput({
            label: "Aircraft Registration *",
            value: aircraftReg,
            onChange: (text) => setAircraftReg(text.toUpperCase()),
            autoCapitalize: "characters",
          })}
          {renderInput({
            label: "Aircraft Type",
            value: aircraftType,
            onChange: (text) => setAircraftType(text.toUpperCase()),
            autoCapitalize: "characters",
          })}

          <AirportAutocomplete
            label="Departure Airport"
            placeholder="Search by ICAO, IATA, or name"
            value={departureAirport}
            onSelect={(airport) => {
              setDepartureAirport(airport);
              clearAirportErrors();
            }}
            error={airportErrors.departure}
            required
          />

          {departureTimezoneInfo ? (
            <View style={styles.timezoneInfo}>
              <Icon
                name="schedule"
                type="material"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.timezoneText}>
                {departureTimezoneInfo.abbreviation} (
                {departureTimezoneInfo.offset})
              </Text>
            </View>
          ) : null}

          <AirportAutocomplete
            label="Arrival Airport"
            placeholder="Search by ICAO, IATA, or name"
            value={arrivalAirport}
            onSelect={(airport) => {
              setArrivalAirport(airport);
              clearAirportErrors();
            }}
            error={airportErrors.arrival}
            required
          />

          {arrivalTimezoneInfo ? (
            <View style={styles.timezoneInfo}>
              <Icon
                name="schedule"
                type="material"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.timezoneText}>
                {arrivalTimezoneInfo.abbreviation} ({arrivalTimezoneInfo.offset})
              </Text>
            </View>
          ) : null}

          {renderInput({
            label: "Flight Number",
            value: flightNumber,
            onChange: (text) => setFlightNumber(text.toUpperCase()),
            autoCapitalize: "characters",
          })}
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon
              name="time-outline"
              type="ionicon"
              color={theme.colors.primary}
            />
            <Text style={styles.sectionTitle}>Schedule & Actual Times</Text>
          </View>

          <View style={styles.row}>
            {renderInput({
              label: "Scheduled Out",
              value: scheduledOut,
              onChange: handleTimeChange(setScheduledOut),
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "HHmm",
              maxLength: 4,
            })}
            {renderInput({
              label: "Actual Out",
              value: actualOut,
              onChange: handleTimeChange(setActualOut),
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "HHmm",
              maxLength: 4,
            })}
          </View>

          {actualOut && departureTimezoneInfo ? (
            <Text style={styles.helpText}>
              {formatTimeWithTimezone(actualOut, departureTimezoneInfo.timezone)}
            </Text>
          ) : null}

          <View style={styles.row}>
            {renderInput({
              label: "Scheduled In",
              value: scheduledIn,
              onChange: handleTimeChange(setScheduledIn),
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "HHmm",
              maxLength: 4,
            })}
            {renderInput({
              label: "Actual In",
              value: actualIn,
              onChange: handleTimeChange(setActualIn),
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "HHmm",
              maxLength: 4,
            })}
          </View>

          {actualIn && arrivalTimezoneInfo ? (
            <Text style={styles.helpText}>
              {formatTimeWithTimezone(actualIn, arrivalTimezoneInfo.timezone)}
            </Text>
          ) : null}
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon
              name="speedometer-outline"
              type="ionicon"
              color={theme.colors.primary}
            />
            <Text style={styles.sectionTitle}>Flight Time Breakdown</Text>
          </View>

          <View style={styles.row}>
            {renderInput({
              label: "PIC Hours",
              value: picHours,
              onChange: setPicHours,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "0",
            })}
            {renderInput({
              label: "PIC Minutes",
              value: picMinutes,
              onChange: setPicMinutes,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "00",
              maxLength: 2,
            })}
          </View>

          <View style={styles.row}>
            {renderInput({
              label: "SIC Hours",
              value: sicHours,
              onChange: setSicHours,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "0",
            })}
            {renderInput({
              label: "SIC Minutes",
              value: sicMinutes,
              onChange: setSicMinutes,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "00",
              maxLength: 2,
            })}
          </View>

          <View style={styles.row}>
            {renderInput({
              label: "Dual Hours",
              value: dualHours,
              onChange: setDualHours,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "0",
            })}
            {renderInput({
              label: "Dual Minutes",
              value: dualMinutes,
              onChange: setDualMinutes,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "00",
              maxLength: 2,
            })}
          </View>

          <View style={styles.row}>
            {renderInput({
              label: "Instrument Hours",
              value: instrumentHours,
              onChange: setInstrumentHours,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "0",
            })}
            {renderInput({
              label: "Instrument Minutes",
              value: instrumentMinutes,
              onChange: setInstrumentMinutes,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "00",
              maxLength: 2,
            })}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-calculate night time</Text>
            <Switch
              value={autoCalculateNight}
              onValueChange={(value) => {
                setAutoCalculateNight(value);
                if (!value) {
                  setNightTimeMethod("manual");
                }
              }}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.card}
            />
          </View>

          {autoCalculateNight && nightTimeMethod !== "manual" ? (
            <Text style={styles.helpText}>
              Night time calculated from sunrise/sunset data (
              {nightTimeMethod})
            </Text>
          ) : null}

          <View style={styles.row}>
            {renderInput({
              label: "Night Hours",
              value: nightHours,
              onChange: setNightHours,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "0",
              disabled: autoCalculateNight,
            })}
            {renderInput({
              label: "Night Minutes",
              value: nightMinutes,
              onChange: setNightMinutes,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
              placeholder: "00",
              maxLength: 2,
              disabled: autoCalculateNight,
            })}
          </View>
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon
              name="trail-sign-outline"
              type="ionicon"
              color={theme.colors.primary}
            />
            <Text style={styles.sectionTitle}>Landings</Text>
          </View>
          <View style={styles.row}>
            {renderInput({
              label: "Day",
              value: landingsDay,
              onChange: setLandingsDay,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
            })}
            {renderInput({
              label: "Night",
              value: landingsNight,
              onChange: setLandingsNight,
              keyboardType: "number-pad",
              containerStyle: styles.halfInput,
            })}
          </View>
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon
              name="images-outline"
              type="ionicon"
              color={theme.colors.primary}
            />
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
                <View
                  key={`${attachment.uri}-${index}`}
                  style={styles.attachmentItem}
                >
                  <Image
                    source={{ uri: attachment.uri }}
                    style={styles.attachmentImage}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeAttachment(index)}
                  >
                    <Icon
                      name="close-circle"
                      type="ionicon"
                      color={theme.colors.error}
                      size={24}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card containerStyle={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon
              name="create-outline"
              type="ionicon"
              color={theme.colors.primary}
            />
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
