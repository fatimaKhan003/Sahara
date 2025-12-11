import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_BASE } from "../../api";
import { useTranslation } from 'react-i18next';

export default function ScanPrescriptionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  // open camera to take picture
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(t('scan.permissionRequired'), t('scan.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;

      const formData = new FormData();
      formData.append("image", {
        uri: localUri,
        name: "prescription.jpg",
        type: "image/jpeg",
      });

      // Call OCR API in Node backend
      await new Promise((resolve) => setTimeout(resolve, 100));
      const resp = await fetch(`${API_BASE}/api/ocr/extract`, {
        method: "POST",
        body: formData,
      });

      const data = await resp.json();

      // Navigate with OCR result + uploaded image path from backend
      navigation.navigate("ConfirmMedicationScreen", {
        imageUri: localUri,
        backendImageUri: data.imageUri,
        detectedName: data.ocrText
      });
    }

  };

  // open gallery to select picture
  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(t('scan.permissionRequired'), t('scan.galleryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      
      const formData = new FormData();
      formData.append("image", {
        uri: localUri,
        name: "prescription.jpg",
        type: "image/jpeg",
      });

      // Call OCR API in Node backend
      await new Promise((resolve) => setTimeout(resolve, 100));
      const resp = await fetch(`${API_BASE}/api/ocr/extract`, {
        method: "POST",
        body: formData,
      });

      const data = await resp.json();

      // Navigate with OCR result + uploaded image path from backend
      navigation.navigate("ConfirmMedicationScreen", {
        imageUri: localUri,
        backendImageUri: data.imageUri,
        detectedName: data.ocrText
      });
    }

  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('scan.title')}</Text>
      <TouchableOpacity onPress={openCamera} style={styles.button}>
        <Ionicons name="camera" size={30} color="#fff" />
        <Text style={styles.buttonText}>{t('scan.takePicture')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={openGallery} style={styles.buttonSecondary}>
        <Ionicons name="images" size={30} color="#1E5AF2" />
        <Text style={styles.buttonTextSecondary}>{t('scan.chooseFromGallery')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  title: {
    fontSize: 24,
    marginBottom: 40,
    fontWeight: '600',
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E5AF2',
    padding: 15,
    borderRadius: 50,
    width: '80%',
    justifyContent: 'center',
    marginBottom: 20,
  },

  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#1E5AF2',
    borderWidth: 2,
    padding: 15,
    borderRadius: 50,
    width: '80%',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },

  buttonTextSecondary: {
    color: '#1E5AF2',
    fontSize: 18,
    marginLeft: 10,
  },
});