import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { OCR_BASE } from "../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRESCRIPTIONS_KEY = "saved_prescriptions";
export const savePrescription = async (imageUri: string) => {
  try {
    const existing = await AsyncStorage.getItem(PRESCRIPTIONS_KEY);
    const list = existing ? JSON.parse(existing) : [];
    const newEntry = {
      id: Date.now().toString(),
      imageUri,
      date: new Date().toISOString(),
    };
    list.unshift(newEntry);
    await AsyncStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save prescription:", err);
  }
};
export default function ScanPrescriptionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Shared OCR + navigate logic ───────────────────────────
  const processImage = async (localUri: string) => {
    setIsProcessing(true);
    await savePrescription(localUri);
    try {
      const formData = new FormData();
      formData.append("file", {
        // "file" for Python FastApi
        uri: localUri,
        name: "prescription.jpg",
        type: "image/jpeg",
      } as any);

      const resp = await fetch(`${OCR_BASE}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(`OCR server error: ${resp.status}`);
      }

      const data = await resp.json();

      console.log("OCR Response:", JSON.stringify(data, null, 2));

      if (!data.medicines || data.medicines.length === 0) {
        Alert.alert(
          t("scan.noMedsFound") || "No medications found",
          t("scan.noMedsFoundDesc") ||
            "Could not detect any medications. You can enter them manually.",
        );
      }

      navigation.navigate("ConfirmMedicationScreen", {
        imageUri: localUri,
        backendImageUri: "",
        detectedName: data.medicines?.[0]?.name || "",
        ocrMedicines: data.medicines || [],
      });
    } catch (err) {
      console.error("OCR failed:", err);
      Alert.alert(
        t("common.error") || "Error",
        t("scan.ocrError") ||
          "Failed to process image. Please try again or enter manually.",
      );

      navigation.navigate("ConfirmMedicationScreen", {
        imageUri: localUri,
        backendImageUri: "",
        detectedName: "",
        ocrMedicines: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Camera ────────────────────────────────────────────────
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("scan.permissionRequired"), t("scan.cameraPermission"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      await processImage(result.assets[0].uri);
    }
  };

  // ── Gallery ───────────────────────────────────────────────
  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("scan.permissionRequired"), t("scan.galleryPermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      await processImage(result.assets[0].uri);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("scan.title")}</Text>

      {isProcessing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E5AF2" />
          <Text style={styles.loadingText}>
            {t("scan.processing") || "Reading prescription..."}
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity onPress={openCamera} style={styles.button}>
            <Ionicons name="camera" size={30} color="#fff" />
            <Text style={styles.buttonText}>{t("scan.takePicture")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openGallery}
            style={styles.buttonSecondary}
          >
            <Ionicons name="images" size={30} color="#1E5AF2" />
            <Text style={styles.buttonTextSecondary}>
              {t("scan.chooseFromGallery")}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 40,
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E5AF2",
    padding: 15,
    borderRadius: 50,
    width: "80%",
    justifyContent: "center",
    marginBottom: 20,
  },
  buttonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#1E5AF2",
    borderWidth: 2,
    padding: 15,
    borderRadius: 50,
    width: "80%",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 10,
  },
  buttonTextSecondary: {
    color: "#1E5AF2",
    fontSize: 18,
    marginLeft: 10,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#555",
    marginTop: 12,
  },
});
