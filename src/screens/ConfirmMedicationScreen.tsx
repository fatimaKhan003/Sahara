import React, { useState, useEffect, useContext, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";
import { ThemeContext } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

// ── TYPES ─────────────────────────────────────────────────────
type OcrMedicine = {
  name: string;
  dose: string;
  frequency: string;
  times_per_day: string;
};

type RootParamList = {
  ConfirmMedicationScreen: {
    imageUri: string;
    backendImageUri: string;
    detectedName: string;
    ocrMedicines?: OcrMedicine[];
  };
};

type MedEntry = {
  name: string;
  dose: string;
  schedule: {
    times: string[];
    repeat: string;
  };
  isActive: boolean;
  doseLogs: {
    status: string;
    scheduledAt: null;
    takenAt: null;
  }[];
  showPickerIndex: number;
};

// ── HELPERS ───────────────────────────────────────────────────
const mapFrequencyToRepeat = (times_per_day: string): string => {
  switch (times_per_day) {
    case "Once a day":        return "daily";
    case "Twice a day":       return "twiceDaily";
    case "Three times a day": return "threeTimesDaily";
    default:                  return "daily";
  }
};

const blankMed = (name = "", dose = "", repeat = "daily"): MedEntry => ({
  name,
  dose,
  schedule: { times: [], repeat },
  isActive: true,
  doseLogs: [{ status: "pending", scheduledAt: null, takenAt: null }],
  showPickerIndex: -1,
});

// ── COMPONENT ─────────────────────────────────────────────────
const ConfirmMedicationScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootParamList, "ConfirmMedicationScreen">>();
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";

  const { imageUri, backendImageUri, detectedName, ocrMedicines } = route.params;

  // ── INIT MEDS FROM OCR OR FALLBACK ───────────────────────────
  const buildInitialMeds = (): MedEntry[] => {
    if (ocrMedicines && ocrMedicines.length > 0) {
      return ocrMedicines.map((m) =>
        blankMed(
          m.name || "",
          m.dose || "",
          mapFrequencyToRepeat(m.times_per_day),
        ),
      );
    }
    return [blankMed(detectedName || "")];
  };

  const [meds, setMeds] = useState<MedEntry[]>(buildInitialMeds);
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) setUser(JSON.parse(userData));
    };
    fetchUser();
  }, []);

  // ── HANDLERS ──────────────────────────────────────────────────
  const updateMed = (index: number, field: string, value: any) => {
    setMeds((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddMore = () => {
    setMeds((prev) => [...prev, blankMed()]);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!user)
      return Alert.alert(
        t("common.error") || "Error",
        t("errors.userNotFoundError") || "User data not found. Please log in.",
      );

    const validMeds = meds.filter((m) => m.name.trim() !== "");
    if (validMeds.length === 0)
      return Alert.alert(
        t("common.error") || "Error",
        t("errors.enterAtLeastOne") || "Please enter at least one medication name.",
      );

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("userId", user._id);
      formData.append("medicines", JSON.stringify(validMeds));

      console.log("SENDING DATA:", { userId: user._id, medicines: validMeds });

      if (imageUri) {
        formData.append("image", {
          uri: imageUri,
          name: "med.jpg",
          type: "image/jpeg",
        } as any);
      } else if (backendImageUri) {
        formData.append("backendImageUri", backendImageUri);
      }

      const response = await fetch(`${API_BASE}/api/medications/save-medications`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresApproval) {
          Alert.alert(
            "Pending Approval",
            "Your medication will be added once your caregiver confirms it.",
          );
          navigation.navigate("HomeScreen");
          return;
        }

        await fetch(`${API_BASE}/api/medications/sync-missed/${user._id}`, {
          method: "POST",
        });

        Alert.alert(
          t("common.success") || "Success",
          t("medication.saveSuccess") || "Medications saved successfully!",
        );
        navigation.navigate("HomeScreen");
      } else {
        Alert.alert(
          t("common.error") || "Error",
          data.message || t("medication.saveError") || "Failed to save medications.",
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        t("common.error") || "Error",
        t("medication.saveError") || "An unexpected error occurred while saving.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── STYLES ────────────────────────────────────────────────────
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF",
    },
    medContainer: {
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
      backgroundColor: darkMode ? "#2C2C2C" : "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    label: {
      fontWeight: "600",
      marginBottom: 5,
      fontSize: 14,
      color: darkMode ? "#E5E5E5" : "#333",
    },
    input: {
      borderWidth: 1,
      borderColor: darkMode ? "#555" : "#ddd",
      padding: 12,
      borderRadius: 8,
      marginBottom: 15,
      color: darkMode ? "#fff" : "#000",
      backgroundColor: darkMode ? "#1E1E1E" : "#fff",
      fontSize: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 20,
      color: darkMode ? "#E5E5E5" : "#333",
    },
    primaryButton: {
      backgroundColor: "#007AFF",
      padding: 15,
      borderRadius: 12,
      alignItems: "center" as const,
      flex: 1,
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      gap: 10,
    },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },
    secondaryButton: {
      backgroundColor: darkMode ? "#3A3A3A" : "#E5E5E5",
      borderColor: "#007AFF",
      borderWidth: 1,
      padding: 15,
      borderRadius: 12,
      alignItems: "center" as const,
      flex: 1,
      marginRight: 10,
    },
    secondaryButtonText: {
      color: darkMode ? "#fff" : "#007AFF",
      fontWeight: "600",
    },
    switchContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: 5,
      marginBottom: 10,
      paddingHorizontal: 5,
    },
    switchLabel: {
      color: darkMode ? "#fff" : "#000",
      fontSize: 14,
      fontWeight: "500",
    },
    ocrBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: darkMode ? "#1a3a1a" : "#e8f5e9",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 15,
      gap: 6,
    },
    ocrBadgeText: {
      color: darkMode ? "#81c784" : "#2e7d32",
      fontSize: 12,
      fontWeight: "600",
    },
  });

  // ── HEADER ────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("medication.confirmTitle") || "Confirm Medication Details",
      headerStyle: {
        backgroundColor: dynamicStyles.container.backgroundColor,
        shadowOpacity: 0,
        elevation: 0,
      },
      headerTintColor: dynamicStyles.label.color,
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
          <Ionicons name="close-outline" size={30} color={dynamicStyles.label.color} />
        </TouchableOpacity>
      ),
      headerRight: () => null,
    });
  }, [navigation, darkMode, dynamicStyles.label.color, t]);

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dynamicStyles.container.backgroundColor }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} style={dynamicStyles.container}>

        <Text style={[dynamicStyles.title, { textAlign: "center" }]}>
          {t("medication.reviewTitle") || "Review and Edit Details"}
        </Text>

        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 200, marginBottom: 25, borderRadius: 12, resizeMode: "cover" }}
          />
        ) : null}

        {/* OCR auto-fill notice */}
        {ocrMedicines && ocrMedicines.length > 0 && (
          <View style={dynamicStyles.ocrBadge}>
            <Ionicons name="checkmark-circle" size={16} color={darkMode ? "#81c784" : "#2e7d32"} />
            <Text style={dynamicStyles.ocrBadgeText}>
              {ocrMedicines.length} medication{ocrMedicines.length > 1 ? "s" : ""} detected and auto-filled from prescription
            </Text>
          </View>
        )}

        {meds.map((med, idx) => (
          <View key={idx} style={dynamicStyles.medContainer}>

            <Text style={[dynamicStyles.label, { fontSize: 16, marginBottom: 15 }]}>
              {t("medication.medicationNumber", { number: idx + 1 }) || `Medication ${idx + 1}`}
            </Text>

            {/* Name */}
            <Text style={dynamicStyles.label}>{t("common.name") || "Name"}</Text>
            <TextInput
              placeholder={t("common.name") || "e.g., Panadol"}
              placeholderTextColor={darkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.name}
              onChangeText={(text) => updateMed(idx, "name", text)}
            />

            {/* Dose */}
            <Text style={dynamicStyles.label}>{t("medication.dose") || "Dose"}</Text>
            <TextInput
              placeholder={t("medication.dosePlaceholder") || "e.g., 500mg"}
              placeholderTextColor={darkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.dose}
              onChangeText={(text) => updateMed(idx, "dose", text)}
            />

            {/* Frequency */}
            <Text style={dynamicStyles.label}>{t("medication.frequency") || "Frequency"}</Text>
            <Picker
              selectedValue={med.schedule.repeat}
              onValueChange={(value) =>
                updateMed(idx, "schedule", { ...med.schedule, repeat: value })
              }
              style={{ marginBottom: 15, color: darkMode ? "#fff" : "#000" }}
            >
              <Picker.Item label="Once a day"         value="daily" />
              <Picker.Item label="Twice a day"        value="twiceDaily" />
              <Picker.Item label="Three times a day"  value="threeTimesDaily" />
              <Picker.Item label="Weekly"             value="weekly" />
            </Picker>

            {/* Times */}
            <Text style={dynamicStyles.label}>{t("medication.timePlaceholder") || "Time"}</Text>

            {med.schedule.times.map((time, tIdx) => (
              <View key={tIdx} style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  style={[dynamicStyles.input, { justifyContent: "center" }]}
                  onPress={() => updateMed(idx, "showPickerIndex", tIdx)}
                >
                  <Text style={{ color: time ? (darkMode ? "#fff" : "#000") : "#888" }}>
                    {time
                      ? new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Select Time"}
                  </Text>
                </TouchableOpacity>

                {med.showPickerIndex === tIdx && (
                  <DateTimePicker
                    value={time ? new Date(time) : new Date()}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      updateMed(idx, "showPickerIndex", -1);
                      if (event.type === "set" && selectedDate) {
                        const now = new Date();
                        now.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                        const updatedTimes = [...med.schedule.times];
                        updatedTimes[tIdx] = now.toISOString();
                        updateMed(idx, "schedule", { ...med.schedule, times: updatedTimes });
                      }
                    }}
                  />
                )}
              </View>
            ))}

            <TouchableOpacity
              onPress={() =>
                updateMed(idx, "schedule", { ...med.schedule, times: [...med.schedule.times, ""] })
              }
              style={{ marginBottom: 15 }}
            >
              <Text style={{ color: "#007AFF" }}>+ Add Time</Text>
            </TouchableOpacity>

            {/* Active Switch */}
            <View style={dynamicStyles.switchContainer}>
              <Text style={dynamicStyles.switchLabel}>
                {t("medication.active") || "Active Schedule"}
              </Text>
              <Switch
                trackColor={{ false: darkMode ? "#767577" : "#A0A0A0", true: "#007AFF" }}
                thumbColor={med.isActive ? "#fff" : "#f4f3f4"}
                ios_backgroundColor={darkMode ? "#767577" : "#EAEAEA"}
                value={med.isActive}
                onValueChange={(val) => updateMed(idx, "isActive", val)}
              />
            </View>

          </View>
        ))}

        {/* Bottom Buttons */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
          <TouchableOpacity onPress={handleAddMore} style={dynamicStyles.secondaryButton}>
            <Text style={dynamicStyles.secondaryButtonText}>
              {t("medication.addMore") || "Add More"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={dynamicStyles.primaryButton} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            )}
            <Text style={dynamicStyles.primaryButtonText}>
              {isSaving ? t("common.saving") || "Saving..." : t("common.done") || "Done"}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfirmMedicationScreen;