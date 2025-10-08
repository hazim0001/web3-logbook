import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, Text } from "@rneui/themed";
import { useTheme } from "../contexts/ThemeContext";
import database, { Airport } from "../services/database";

interface AirportAutocompleteProps {
  value?: Airport | null;
  onSelect: (airport: Airport | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function AirportAutocomplete({
  value,
  onSelect,
  placeholder = "Search airport...",
  label,
  error,
  disabled = false,
  required = false,
}: AirportAutocompleteProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const displayValue = value
    ? `${value.icaoCode}${value.iataCode ? ` / ${value.iataCode}` : ""} - ${value.name}`
    : query;

  useEffect(() => {
    if (query.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    setIsSearching(true);
    try {
      const airports = await database.searchAirports(searchTerm, 20);
      setResults(airports);
      setShowResults(true);
    } catch (searchError) {
      console.error("Airport search error:", searchError);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (airport: Airport) => {
    onSelect(airport);
    setQuery("");
    setShowResults(false);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (value) {
      onSelect(null);
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 15,
    },
    labelContainer: {
      flexDirection: "row",
      marginBottom: 5,
    },
    labelText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    required: {
      color: theme.colors.error,
      marginLeft: 4,
    },
    inputWrapper: {
      position: "relative",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: error ? theme.colors.error : theme.colors.border,
      borderRadius: 10,
      backgroundColor: disabled ? theme.colors.card : theme.colors.inputBackground,
      paddingHorizontal: 12,
      minHeight: 50,
    },
    inputFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      paddingVertical: 8,
    },
    selectedValue: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
    },
    clearButton: {
      padding: 4,
      marginLeft: 6,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
    resultsContainer: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      maxHeight: 250,
      zIndex: 1000,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    resultItem: {
      padding: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    resultPrimary: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    resultSecondary: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    resultCodes: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    emptyStateContainer: {
      padding: 16,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    loadingContainer: {
      padding: 16,
      alignItems: "center",
    },
  });

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{label}</Text>
          {required ? <Text style={styles.required}>*</Text> : null}
        </View>
      ) : null}

      <View style={styles.inputWrapper}>
        <View
          style={[
            styles.inputContainer,
            showResults && results.length > 0 ? styles.inputFocused : null,
          ]}
        >
          <Icon name="airplane-outline" type="ionicon" size={20} color={theme.colors.textSecondary} />
          {value ? (
            <Text style={styles.selectedValue} numberOfLines={1}>
              {displayValue}
            </Text>
          ) : (
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={handleChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              editable={!disabled}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          )}

          {(value || query) && !disabled ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" type="ionicon" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}

          {isSearching ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />
          ) : null}
        </View>

        {showResults && results.length > 0 ? (
          <View style={styles.resultsContainer}>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                  <Text style={styles.resultPrimary}>{item.name}</Text>
                  {item.city ? (
                    <Text style={styles.resultSecondary}>
                      {item.city}
                      {item.country ? `, ${item.country}` : ""}
                    </Text>
                  ) : null}
                  <Text style={styles.resultCodes}>
                    {item.icaoCode}
                    {item.iataCode ? ` / ${item.iataCode}` : ""}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null}

        {showResults && !isSearching && query.length >= 2 && results.length === 0 ? (
          <View style={[styles.resultsContainer, styles.emptyStateContainer]}>
            <Text style={styles.emptyStateText}>No airports found.</Text>
            <Text style={[styles.emptyStateText, { fontSize: 12, marginTop: 6 }]}>
              Try searching by ICAO, IATA, or airport name.
            </Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function useAirportSelection() {
  const [departureAirport, setDepartureAirport] = useState<Airport | null>(null);
  const [arrivalAirport, setArrivalAirport] = useState<Airport | null>(null);
  const [errors, setErrors] = useState<{ departure?: string; arrival?: string }>({});

  const validateAirports = (): boolean => {
    const nextErrors: typeof errors = {};

    if (!departureAirport) {
      nextErrors.departure = "Departure airport is required";
    }

    if (!arrivalAirport) {
      nextErrors.arrival = "Arrival airport is required";
    } else if (departureAirport && arrivalAirport.id === departureAirport.id) {
      nextErrors.arrival = "Arrival must be different from departure";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const clearErrors = () => {
    setErrors({});
  };

  return {
    departureAirport,
    setDepartureAirport,
    arrivalAirport,
    setArrivalAirport,
    errors,
    validateAirports,
    clearErrors,
  };
}
