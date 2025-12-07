import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";

const ConfirmMedicationScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri, backendImageUri, detectedName } = route.params;

  const [meds, setMeds] = useState([
    { 
      name: detectedName || "", 
      dose: "", 
      frequency: "", 
      time: "", 
      isActive: true, 
      status: "pending" 
    }
  ]);

  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) setUser(JSON.parse(userData));
    };
    fetchUser();
  }, []);

  const handleAddMore = () => {
    setMeds([
      ...meds,
      { name: "", dose: "", frequency: "", time: "", isActive: true, status: "pending" }
    ]);
  };

  const handleSave = async () => {
    if (!user) return Alert.alert(t("common.error"), t("errors.userNotFoundError"));

    const validMeds = meds.filter((m) => m.name.trim() !== "");
    if (validMeds.length === 0) return Alert.alert(t("common.error"), t("errors.enterAtLeastOne"));

<<<<<<< HEAD
    try {
      const formData = new FormData();
      formData.append("userId", user._id);
      formData.append("medicines", JSON.stringify(validMeds));

      if (imageUri) {
        formData.append("image", {
          uri: imageUri,
          name: "med.jpg",
          type: "image/jpeg",
        });
=======
  try {
    const payload = {
      userId: user._id,
      medicines: validMeds,
      imageUri: backendImageUri,
    };

    const response = await fetch(
      `${API_BASE}/api/medications/save-medications`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
>>>>>>> development
      }

      const response = await fetch(`${API_BASE}/api/medications/save-medications`, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(t("common.success") || "Success", t("medication.saveSuccess"));
        navigation.navigate("HomeScreen");
      } else {
        Alert.alert(t("common.error"), data.message || t("medication.saveError"));
      }
    } catch (err) {
      console.log(err);
      Alert.alert(t("common.error"), t("medication.saveError"));
    }
  };

  const updateMed = (index, field, value) => {
    const updated = [...meds];
    updated[index][field] = value;
    setMeds(updated);
  };

  // Dynamic styles based on dark/light mode
  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: isDarkMode ? "#121212" : "#fff" },
    medContainer: {
      borderWidth: 1,
      borderColor: isDarkMode ? "#444" : "#ccc",
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      backgroundColor: isDarkMode ? "#1E1E1E" : "#fff",
    },
    label: { fontWeight: "700", marginBottom: 5, color: isDarkMode ? "#fff" : "#000" },
    input: {
      borderWidth: 1,
      borderColor: isDarkMode ? "#666" : "#ccc",
      padding: 8,
      borderRadius: 8,
      marginBottom: 8,
      color: isDarkMode ? "#fff" : "#000",
      backgroundColor: isDarkMode ? "#2C2C2C" : "#fff",
    },
    addButton: {
      backgroundColor: "#1E5AF2",
      padding: 15,
      borderRadius: 15,
      alignItems: "center",
      flex: 0.48,
      marginBottom: 20,
    },
    switchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
    switchLabel: { color: isDarkMode ? "#fff" : "#000", marginRight: 10 },
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={dynamicStyles.container}>
        {/* Dark Mode Toggle */}
        <View style={dynamicStyles.switchContainer}>
          <Text style={dynamicStyles.switchLabel}>{isDarkMode ? "Dark Mode" : "Light Mode"}</Text>
          <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
        </View>

        <Image
          source={{ uri: imageUri }}
          style={{ width: "100%", height: 200, marginBottom: 20, borderRadius: 10 }}
        />

        {meds.map((med, idx) => (
          <View key={idx} style={dynamicStyles.medContainer}>
            <Text style={dynamicStyles.label}>{t("medication.medicationNumber", { number: idx + 1 })}</Text>

            <TextInput
              placeholder={t("common.name")}
              placeholderTextColor={isDarkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.name}
              onChangeText={(text) => updateMed(idx, "name", text)}
            />

            <TextInput
              placeholder={t("medication.dose")}
              placeholderTextColor={isDarkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.dose}
              onChangeText={(text) => updateMed(idx, "dose", text)}
            />

            <TextInput
              placeholder={t("medication.frequency")}
              placeholderTextColor={isDarkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.frequency}
              onChangeText={(text) => updateMed(idx, "frequency", text)}
            />

            <TextInput
              placeholder={t("medication.timePlaceholder")}
              placeholderTextColor={isDarkMode ? "#aaa" : "#888"}
              style={dynamicStyles.input}
              value={med.time}
              onChangeText={(text) => updateMed(idx, "time", text)}
            />

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
              <Text style={{ color: isDarkMode ? "#fff" : "#000" }}>{t("medication.active")}</Text>
              <Switch
                value={med.isActive}
                onValueChange={(val) => updateMed(idx, "isActive", val)}
              />
            </View>
          </View>
        ))}

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={handleAddMore} style={dynamicStyles.addButton}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>{t("medication.addMore")}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={dynamicStyles.addButton}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>{t("common.done")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfirmMedicationScreen;
