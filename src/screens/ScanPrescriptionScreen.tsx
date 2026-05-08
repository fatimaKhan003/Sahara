import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native";
import ImageCropPicker from "react-native-image-crop-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { API_BASE, OCR_BASE } from "../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getPersonalKey = (userId: string) => `prescriptions_${userId}`;
const getCaregiverKey = (userId: string) => `prescriptions_caregiver_${userId}`;

export const savePrescription = async (
  imageUri: string,
  forDependentId?: string,
  forDependentName?: string,
) => {
  try {
    const storedUser = await AsyncStorage.getItem("user");
    if (!storedUser) return;
    const parsedUser = JSON.parse(storedUser);

    const newEntry = {
      id: Date.now().toString(),
      imageUri,
      date: new Date().toISOString(),
      dependentId: forDependentId || null,
      dependentName: forDependentName || "Me",
      addedBy: forDependentId ? "caregiver" : "self",
    };

    if (forDependentId) {
      const caregiverKey = getCaregiverKey(parsedUser._id);
      const caregiverRaw = await AsyncStorage.getItem(caregiverKey);
      const caregiverList = caregiverRaw ? JSON.parse(caregiverRaw) : [];
      caregiverList.unshift(newEntry);
      await AsyncStorage.setItem(caregiverKey, JSON.stringify(caregiverList));

      const dependentPersonalKey = getPersonalKey(forDependentId);
      const dependentRaw = await AsyncStorage.getItem(dependentPersonalKey);
      const dependentList = dependentRaw ? JSON.parse(dependentRaw) : [];

      const alreadyExists = dependentList.some(
        (p: any) => p.id === newEntry.id,
      );
      if (!alreadyExists) {
        dependentList.unshift(newEntry);
        await AsyncStorage.setItem(
          dependentPersonalKey,
          JSON.stringify(dependentList),
        );
      }
    } else {
      const personalKey = getPersonalKey(parsedUser._id);
      const personalRaw = await AsyncStorage.getItem(personalKey);
      const personalList = personalRaw ? JSON.parse(personalRaw) : [];
      personalList.unshift(newEntry);
      await AsyncStorage.setItem(personalKey, JSON.stringify(personalList));
    }
  } catch (err) {
    console.error("Failed to save prescription:", err);
  }
};

export default function ScanPrescriptionScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const btn1Scale = useRef(new Animated.Value(1)).current;
  const btn2Scale = useRef(new Animated.Value(1)).current;
  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150],
  });
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [isProcessing, setIsProcessing] = useState(false);

  const forDependentId = route.params?.forDependentId || null;
  const forDependentName = route.params?.forDependentName || null;

  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      Animated.loop(
        Animated.timing(scanLineAnim, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      pulseAnim.setValue(1);
      scanLineAnim.setValue(0);
    }
  }, [isProcessing]);

  /**
   * fullUri  — original uncropped image (saved to AsyncStorage + sent to server)
   * croppedUri — tightly cropped version sent to OCR for faster processing
   */
  const processImage = async (fullUri: string, croppedUri: string) => {
    setIsProcessing(true);
    // Save the FULL image locally (AsyncStorage)
    await savePrescription(fullUri, forDependentId, forDependentName);

    try {
      // Send only the CROPPED image to OCR for speed
      const ocrFormData = new FormData();
      ocrFormData.append("image", {
        uri: croppedUri,
        name: "prescription_crop.jpg",
        type: "image/jpeg",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 100));
      const resp = await fetch(`${API_BASE}/api/ocr/extract`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: ocrFormData,
      });

      if (!resp.ok) throw new Error(`OCR server error: ${resp.status}`);

      const data = await resp.json();
      console.log("OCR Response:", JSON.stringify(data, null, 2));

      if (!data.medicines || data.medicines.length === 0) {
        Alert.alert(
          "No medications found",
          "Could not detect any medications. You can enter them manually.",
        );
      }

      // Pass the FULL image to ConfirmMedicationScreen for display + server upload
      navigation.navigate("ConfirmMedicationScreen", {
        imageUri: fullUri,
        backendImageUri: "",
        detectedName: data.medicines?.[0]?.name || "",
        ocrMedicines: data.medicines || [],
        forDependentId,
        forDependentName,
      });
    } catch (err) {
      console.error("OCR failed:", err);
      Alert.alert(
        "Error",
        "Failed to process image. Please try again or enter manually.",
      );
      navigation.navigate("ConfirmMedicationScreen", {
        imageUri: fullUri,
        backendImageUri: "",
        detectedName: "",
        ocrMedicines: [],
        forDependentId,
        forDependentName,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openCamera = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(t("scan.permissionRequired"), t("scan.cameraPermission"));
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: true,   // ✅ built-in cropper — no native module needed
    aspect: [3, 2],
  });
  if (result.canceled) return;

  const uri = result.assets[0].uri;
  await processImage(uri, uri);
};

const openGallery = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(t("scan.permissionRequired"), t("scan.galleryPermission"));
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
    allowsEditing: true,   // ✅ built-in cropper — no native module needed
    aspect: [3, 2],
  });
  if (result.canceled) return;

  const uri = result.assets[0].uri;
  await processImage(uri, uri);
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1256DB" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Scan Prescription</Text>
      </View>

      {forDependentName && (
        <View style={styles.dependentBanner}>
          <Ionicons name="person-outline" size={16} color="#1256DB" />
          <Text style={styles.dependentText}>{forDependentName}</Text>
        </View>
      )}

      {isProcessing ? (
        <Animated.View
          style={[styles.scanner, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />

          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineY }] },
            ]}
          />

          <ActivityIndicator size="large" color="#1256DB" />
          <Text style={styles.processingText}>Scanning...</Text>
        </Animated.View>
      ) : (
        <View style={styles.scanner}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />

          <Ionicons name="document-text-outline" size={40} color="#1256DB" />
        </View>
      )}

      {!isProcessing && (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={openCamera}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.primaryText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={openGallery}>
            <Ionicons name="images" size={20} color="#1256DB" />
            <Text style={styles.secondaryText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const PRIMARY = "#1256DB";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  header: {
    fontSize: 18,
    fontWeight: "600",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1256DB",
  },

  dependentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0FE",
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },

  dependentText: {
    marginLeft: 8,
    color: PRIMARY,
    fontWeight: "600",
  },

  scanner: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    backgroundColor: "#F5F9FF",
    shadowColor: "#1256DB",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  scanLine: {
    position: "absolute",
    height: 2,
    width: "90%",
    backgroundColor: PRIMARY,
  },

  cornerTL: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: PRIMARY,
  },

  cornerTR: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: PRIMARY,
  },

  cornerBL: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: PRIMARY,
  },

  cornerBR: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: PRIMARY,
  },

  processingText: {
    marginTop: 10,
    color: "#555",
  },

  buttons: {
    gap: 12,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    padding: 14,
    borderRadius: 12,
  },

  primaryText: {
    color: "#fff",
    marginLeft: 10,
    fontWeight: "600",
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderColor: PRIMARY,
    borderWidth: 1.5,
    padding: 14,
    borderRadius: 12,
  },

  secondaryText: {
    color: PRIMARY,
    marginLeft: 10,
    fontWeight: "600",
  },
});
