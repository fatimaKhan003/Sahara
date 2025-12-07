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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";

const ConfirmMedicationScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri } = route.params;
  const [meds, setMeds] = useState([
    { name: "", dose: "", frequency: "", time: "", isActive: true, status: "pending" }
  ]);

  const [user, setUser] = useState(null);

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
  if (!user) {
    Alert.alert(t("common.error"), t("errors.userNotFoundError"));
    return;
  }

  const validMeds = meds.filter((m) => m.name.trim() !== "");
  if (validMeds.length === 0) {
    Alert.alert(t("common.error"), t("errors.enterAtLeastOne"));
    return;
  }
  validMeds.forEach((med, idx) => {
    console.log(`Medication ${idx + 1} Time:`, med.time);
  });

  try {
    const formData = new FormData();
    formData.append("userId", user._id);
    formData.append("medicines", JSON.stringify(validMeds));

    formData.append("image", {
      uri: imageUri,
      name: "prescription.jpg",
      type: "image/jpeg",
    });

    const response = await fetch(
      `${API_BASE}/api/medications/save-medications`,
      {
        method: "POST",
        body: formData
      }
    );

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

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Image
        source={{ uri: imageUri }}
        style={{ width: "100%", height: 200, marginBottom: 20 }}
      />

      {meds.map((med, idx) => (
        <View key={idx} style={styles.medContainer}>
          <Text style={styles.label}>{t("medication.medicationNumber", { number: idx + 1 })}</Text>

          <TextInput
            placeholder={t("common.name")}
            style={styles.input}
            value={med.name}
            onChangeText={(text) => updateMed(idx, "name", text)}
          />

          <TextInput
            placeholder={t("medication.dose")}
            style={styles.input}
            value={med.dose}
            onChangeText={(text) => updateMed(idx, "dose", text)}
          />

          <TextInput
            placeholder={t("medication.frequency")}
            style={styles.input}
            value={med.frequency}
            onChangeText={(text) => updateMed(idx, "frequency", text)}
          />

          <TextInput
            placeholder={t("medication.timePlaceholder")}
            style={styles.input}
            value={med.time}
            onChangeText={(text) => updateMed(idx, "time", text)}
          />

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
            <Text>{t("medication.active")}</Text>
            <Switch
              value={med.isActive}
              onValueChange={(val) => updateMed(idx, "isActive", val)}
            />
          </View>
        </View>
      ))}

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={handleAddMore} style={styles.addButton}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>{t("medication.addMore")}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSave} style={styles.addButton}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>{t("common.done")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  medContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  label: { fontWeight: "700", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#1E5AF2",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    flex: 0.48,
    marginBottom: 20,
  },
});

export default ConfirmMedicationScreen;


