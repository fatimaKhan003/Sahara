import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_BASE } from "../../api";
import { useTranslation } from 'react-i18next';

export default function ScanPrescriptionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
<<<<<<< HEAD
  const [isDarkMode, setIsDarkMode] = useState(false);

=======
  
>>>>>>> development
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
<<<<<<< HEAD
=======

>>>>>>> development
      const formData = new FormData();
      formData.append("image", {
        uri: localUri,
        name: "prescription.jpg",
        type: "image/jpeg",
      });

<<<<<<< HEAD
=======
      // Call OCR API in Node backend
      await new Promise((resolve) => setTimeout(resolve, 100));
>>>>>>> development
      const resp = await fetch(`${API_BASE}/api/ocr/extract`, {
        method: "POST",
        body: formData,
      });
<<<<<<< HEAD
      const data = await resp.json();

=======

      const data = await resp.json();

      // Navigate with OCR result + uploaded image path from backend
>>>>>>> development
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
<<<<<<< HEAD
=======
      
>>>>>>> development
      const formData = new FormData();
      formData.append("image", {
        uri: localUri,
        name: "prescription.jpg",
        type: "image/jpeg",
      });

<<<<<<< HEAD
=======
      // Call OCR API in Node backend
      await new Promise((resolve) => setTimeout(resolve, 100));
>>>>>>> development
      const resp = await fetch(`${API_BASE}/api/ocr/extract`, {
        method: "POST",
        body: formData,
      });
<<<<<<< HEAD
      const data = await resp.json();

=======

      const data = await resp.json();

      // Navigate with OCR result + uploaded image path from backend
>>>>>>> development
      navigation.navigate("ConfirmMedicationScreen", {
        imageUri: localUri,
        backendImageUri: data.imageUri,
        detectedName: data.ocrText
      });
    }

  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: isDarkMode ? '#121212' : '#fff',
    },
    title: {
      fontSize: 24,
      marginBottom: 40,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#000',
      textAlign: 'center',
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
      marginBottom: 20,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
    },
    buttonText: { color: '#fff', fontSize: 18, marginLeft: 10 },
    buttonTextSecondary: { color: '#1E5AF2', fontSize: 18, marginLeft: 10 },
    toggleContainer: {
      position: 'absolute',
      top: 20,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#f0f0f0',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    toggleText: {
      color: isDarkMode ? '#fff' : '#000',
      marginRight: 5,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={dynamicStyles.container}>
        {/* Dark Mode Toggle at Top-Right */}
        <View style={dynamicStyles.toggleContainer}>
          <Text style={dynamicStyles.toggleText}>{isDarkMode ? 'Dark' : 'Light'}</Text>
          <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
        </View>

        <Text style={dynamicStyles.title}>{t('scan.title')}</Text>

        <TouchableOpacity onPress={openCamera} style={dynamicStyles.button}>
          <Ionicons name="camera" size={30} color="#fff" />
          <Text style={dynamicStyles.buttonText}>{t('scan.takePicture')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={openGallery} style={dynamicStyles.buttonSecondary}>
          <Ionicons name="images" size={30} color="#1E5AF2" />
          <Text style={dynamicStyles.buttonTextSecondary}>{t('scan.chooseFromGallery')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
