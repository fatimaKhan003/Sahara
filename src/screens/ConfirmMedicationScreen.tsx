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
  ActivityIndicator, // Added for save loading state
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";
import { ThemeContext } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

// Define the expected route parameters for type safety
type ConfirmMedicationRouteParams = {
    imageUri: string;
    backendImageUri: string;
    detectedName: string;
};
type ConfirmMedicationRouteProp = RouteProp<Record<string, ConfirmMedicationRouteParams>, 'ConfirmMedicationScreen'>;


const ConfirmMedicationScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<ConfirmMedicationRouteProp>();
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";

  const { imageUri, backendImageUri, detectedName } = route.params;

  const [meds, setMeds] = useState([
    {
      name: detectedName || "",
      dose: "",
      frequency: "",
      time: "",
      isActive: true,
      status: "pending",
    },
  ]);

  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false); // New state for saving indicator

  // 1. Fetch User Data
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) setUser(JSON.parse(userData));
    };
    fetchUser();
  }, []);

  // 2. Add More Medication Slot
  const handleAddMore = () => {
    setMeds([
      ...meds,
      { name: "", dose: "", frequency: "", time: "", isActive: true, status: "pending" },
    ]);
  };

  // 3. Save Medication
  const handleSave = async () => {
    if (isSaving) return;
    if (!user) return Alert.alert(t("common.error") || "Error", t("errors.userNotFoundError") || "User data not found. Please log in.");

    const validMeds = meds.filter((m) => m.name.trim() !== "");
    if (validMeds.length === 0) return Alert.alert(t("common.error") || "Error", t("errors.enterAtLeastOne") || "Please enter at least one medication name.");
    
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("userId", user._id);
      formData.append("medicines", JSON.stringify(validMeds));

      // Append image data for the backend
      // NOTE: Using the local URI to create a proper blob for multipart/form-data
      if (imageUri) {
        const localResponse = await fetch(imageUri);
        const blob = await localResponse.blob();
        formData.append("image", blob, "med.jpg");
      } else if (backendImageUri) {
        // If image was already uploaded in OCR step and only the backend URI is needed
        formData.append("backendImageUri", backendImageUri);
      }

      const response = await fetch(
        `${API_BASE}/api/medications/save-medications`,
        {
          method: "POST",
          body: formData,
          // Removed manual 'Content-Type' as 'multipart/form-data' is typically set automatically when using FormData
          // You may need to adjust based on your specific backend requirements
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert(t("common.success") || "Success", t("medication.saveSuccess") || "Medications saved successfully!");
        navigation.navigate("HomeScreen");
      } else {
        Alert.alert(t("common.error") || "Error", data.message || t("medication.saveError") || "Failed to save medications.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t("common.error") || "Error", t("medication.saveError") || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };


  // 4. Update Medication Field
  const updateMed = (index: number, field: string, value: any) => {
    const updated = [...meds];
    updated[index] = { ...updated[index], [field]: value };
    setMeds(updated);
  };

  // 5. Dynamic Styles
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
      backgroundColor: darkMode ? "#2C2C2C" : "#fff", // Card background
      // Subtle shadow for lift
      shadowColor: darkMode ? "#000" : "#000",
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
      backgroundColor: darkMode ? "#1E1E1E" : "#fff", // Input background
      fontSize: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 20,
      color: darkMode ? '#E5E5E5' : '#333',
    },
    // Primary Button Style (for Done/Save)
    primaryButton: {
      backgroundColor: "#007AFF", // Primary blue accent
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    // Secondary Button Style (for Add More)
    secondaryButton: {
      backgroundColor: darkMode ? "#3A3A3A" : "#E5E5E5",
      borderColor: "#007AFF",
      borderWidth: 1,
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    secondaryButtonText: { color: darkMode ? "#fff" : "#007AFF", fontWeight: "600" },
    switchContainer: { 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: 'space-between',
        marginTop: 5,
        marginBottom: 10,
        paddingHorizontal: 5
    },
    switchLabel: { 
        color: darkMode ? "#fff" : "#000", 
        fontSize: 14, 
        fontWeight: '500'
    },
  });

  // 6. Header Configuration
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('medication.confirmTitle') || 'Confirm Medication Details',
      headerStyle: {
        backgroundColor: dynamicStyles.container.backgroundColor,
        shadowOpacity: 0, // Remove header border
        elevation: 0,
      },
      headerTintColor: dynamicStyles.label.color,
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
          <Ionicons name="close-outline" size={30} color={dynamicStyles.label.color} />
        </TouchableOpacity>
      ),
      headerRight: () => null, // Ensure no buttons appear here
    });
  }, [navigation, darkMode, dynamicStyles.label.color, t]);


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dynamicStyles.container.backgroundColor }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} style={dynamicStyles.container}>
        
        {/* Removed the manual Dark Mode switch */}
        
        <Text style={[dynamicStyles.title, { textAlign: 'center' }]}>
            {t('medication.reviewTitle') || 'Review and Edit Details'}
        </Text>

        {/* Image Preview */}
        <Image
          source={{ uri: imageUri }}
          style={{ width: "100%", height: 200, marginBottom: 25, borderRadius: 12, resizeMode: 'cover' }}
        />

        {meds.map((med, idx) => (
          <View key={idx} style={dynamicStyles.medContainer}>
            <Text style={[dynamicStyles.label, { fontSize: 16, marginBottom: 15 }]}>
              {t("medication.medicationNumber", { number: idx + 1 }) || `Medication ${idx + 1}`}
            </Text>

            {/* Name Input */}
            <Text style={dynamicStyles.label}>{t("common.name") || 'Name'}</Text>
            <TextInput
              placeholder={t("common.name") || "e.g., Panadol"}
              placeholderTextColor={darkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.name}
              onChangeText={(text) => updateMed(idx, "name", text)}
            />

            {/* Dose Input */}
            <Text style={dynamicStyles.label}>{t("medication.dose") || 'Dose'}</Text>
            <TextInput
              placeholder={t("medication.dosePlaceholder") || "e.g., 500mg"}
              placeholderTextColor={darkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.dose}
              onChangeText={(text) => updateMed(idx, "dose", text)}
            />

            {/* Frequency Input */}
            <Text style={dynamicStyles.label}>{t("medication.frequency") || 'Frequency'}</Text>
            <TextInput
              placeholder={t("medication.frequencyPlaceholder") || "e.g., Daily, Twice a day"}
              placeholderTextColor={darkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.frequency}
              onChangeText={(text) => updateMed(idx, "frequency", text)}
            />

            {/* Time Input */}
            <Text style={dynamicStyles.label}>{t("medication.timePlaceholder") || 'Time'}</Text>
            <TextInput
              placeholder={t("medication.timePlaceholder") || "e.g., 8:00 AM, 6:00 PM"}
              placeholderTextColor={darkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.time}
              onChangeText={(text) => updateMed(idx, "time", text)}
            />

            {/* Active Switch */}
            <View style={dynamicStyles.switchContainer}>
                <Text style={dynamicStyles.switchLabel}>
                    {t("medication.active") || 'Active Schedule'}
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

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
          {/* Add More Button (Secondary) */}
          <TouchableOpacity onPress={handleAddMore} style={dynamicStyles.secondaryButton}>
            <Text style={dynamicStyles.secondaryButtonText}>
              {t("medication.addMore") || 'Add More'}
            </Text>
          </TouchableOpacity>

          {/* Done/Save Button (Primary) */}
          <TouchableOpacity onPress={handleSave} style={dynamicStyles.primaryButton} disabled={isSaving}>
            {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            )}
            <Text style={dynamicStyles.saveButtonText}>
              {isSaving ? (t("common.saving") || 'Saving...') : (t("common.done") || 'Done')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfirmMedicationScreen;