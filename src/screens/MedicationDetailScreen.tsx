import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState, useContext, useLayoutEffect } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";
import { ThemeContext } from "../context/ThemeContext";

const MedicationDetailScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const { theme } = useContext(ThemeContext); 
  const darkMode = theme === 'dark';

  const medParam = route.params?.med;
  const onUpdate = route.params?.onUpdate ?? (() => {});

  const med = useMemo(
    () =>
      medParam || {
        _id: null,
        name: t('medication.sampleName') || "Sample Medication",
        dose: t('medication.sampleDose') || "1 tab",
        frequency: t('medication.sampleFrequency') || "Once daily",
        time: t('medication.sampleTime') || "08:00 AM",
        status: "pending",
        imageUri: null,
      },
    [medParam, t]
  );

  
  const [name, setName] = useState(med.name);
  const [dose, setDose] = useState(med.dose);
  const [frequency, setFrequency] = useState(med.frequency);
  const [time, setTime] = useState(med.time);
  const [status, setStatus] = useState(med.status);
  const [imageUri, setImageUri] = useState(
    med.imageUri ? `${API_BASE}${med.imageUri}` : null
  );
  const [loading, setLoading] = useState(false);

  
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
        Alert.alert(t('scan.permissionRequired') || "Permission Required", t('scan.galleryPermission') || "Please grant gallery permission.");
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  
  const updateMedication = async () => {
    if (!med?._id) {
      Alert.alert(t("common.info") || "Info", t("medication.updateError") || "Update not available for this entry.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("dose", dose);
      formData.append("frequency", frequency);
      formData.append("time", time);
      formData.append("status", status);

      if (imageUri && !imageUri.startsWith("http")) {
        const localResponse = await fetch(imageUri);
        const blob = await localResponse.blob();
        formData.append("image", blob, "med.jpg");
      }

      const res = await fetch(`${API_BASE}/api/medications/${med._id}`, {
        method: "PATCH",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update medication");

      const updated = await res.json();
      if (onUpdate) onUpdate(updated);

      Alert.alert(t("common.success") || "Success", t("medication.updateSuccess") || "Medication updated successfully!", [
        { text: t("common.ok") || "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(t("common.error") || "Error", t("medication.updateError") || "Failed to update medication.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  
  const deleteMedication = async () => {
    if (!med?._id) {
      Alert.alert(t("common.info") || "Info", t("medication.deleteError") || "Delete not available for this entry.");
      return;
    }
    Alert.alert(t("medication.deleteConfirm") || "Confirm Deletion", t("medication.deleteMessage") || "Are you sure you want to delete this medication?", [
      { text: t("common.cancel") || "Cancel", style: "cancel" },
      {
        text: t("common.delete") || "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/api/medications/${med._id}`, { method: "DELETE" });
            if (onUpdate) onUpdate(null); 
            Alert.alert(t("common.success") || "Success", t("medication.deleteSuccess") || "Medication deleted successfully!", [
              { text: t("common.ok") || "OK", onPress: () => navigation.goBack() },
            ]);
          } catch (err) {
            Alert.alert(t("common.error") || "Error", t("medication.deleteError") || "Failed to delete medication.");
            console.error(err);
          }
        },
      },
    ]);
  };

  
  const dynamicStyles = StyleSheet.create({
    container: { 
        flex: 1, 
        paddingHorizontal: 20, 
        backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" 
    },
    
    card: {
        backgroundColor: darkMode ? "#2C2C2C" : "#fff",
        borderRadius: 15,
        padding: 20,
        marginBottom: 25,
        shadowColor: darkMode ? "#000" : "#A0A0A0",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    medImage: { 
        width: 160, 
        height: 160, 
        borderRadius: 80,
        borderColor: darkMode ? "#555" : "#ddd",
        borderWidth: 2, 
    },
    changeImageText: { 
        textAlign: "center", 
        color: "#007AFF", 
        marginTop: 10,
        fontWeight: '700', 
        fontSize: 14,
    },
    imagePickerContainer: { 
        alignItems: "center", 
        marginBottom: 30, 
        paddingTop: 10,
        paddingBottom: 10,
    },
    label: { 
        fontSize: 14, 
        fontWeight: "600", 
        marginBottom: 5, 
        color: darkMode ? "#E5E5E5" : "#333" 
    },
    input: {
      backgroundColor: darkMode ? "#1E1E1E" : "#F0F0F0", 
      padding: 14, 
      borderRadius: 10,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: darkMode ? "#444" : "#E0E0E0",
      color: darkMode ? "#fff" : "#000",
      fontSize: 14,
    },
    
    updateButton: {
      backgroundColor: "#007AFF", 
      padding: 18, 
      borderRadius: 12,
      alignItems: "center",
      marginTop: 20,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    updateButtonText: { 
        color: "#fff", 
        fontWeight: "bold",
        fontSize: 16 
    },
    
    deleteButton: {
      backgroundColor: darkMode ? "#3A3A3A" : "#EAEAEA", 
      padding: 18,
      borderRadius: 12,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#FF3B30", 
    },
    deleteButtonText: {
        color: "#FF3B30", 
        fontWeight: "bold", 
        marginLeft: 5,
        fontSize: 16
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 5,
        color: darkMode ? "#A0A0A0" : "#666" 
    },
    statusText: {
      fontSize: 16, 
      fontWeight: "bold",
      marginBottom: 0,
      color: status === "missed" ? "#FF3B30" : status === "taken" ? "#34C759" : darkMode ? "#E5E5E5" : "#000",
    },
  });


  useLayoutEffect(() => {
    navigation.setOptions({
        headerTitle: t('medication.detailsTitle') || 'Medication Details',
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
        headerRight: () => (
            <TouchableOpacity onPress={updateMedication} disabled={loading} style={{ paddingLeft: 10 }}>
                {loading ? (
                    <ActivityIndicator size="small" color={dynamicStyles.label.color} />
                ) : (
                    <Ionicons name="save-outline" size={26} color={dynamicStyles.label.color} />
                )}
            </TouchableOpacity>
        ),
    });
  }, [navigation, darkMode, loading, name, dose, frequency, time, status, imageUri, t]);


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dynamicStyles.container.backgroundColor }}>
      <ScrollView style={dynamicStyles.container} contentContainerStyle={{ paddingBottom: 30 }}>
        
        
        <TouchableOpacity onPress={pickImage} style={dynamicStyles.imagePickerContainer} activeOpacity={0.7}>
          <Image
            source={{ uri: imageUri || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBm1yFTdVh7W4eAWd4nrod_KffW-IIv6k82g&s" }}
            style={dynamicStyles.medImage}
          />
          <Text style={dynamicStyles.changeImageText}>{t("medication.changeImage") || "Change Image"}</Text>
        </TouchableOpacity>

        
        <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.label}>{t("common.name") || 'Name'}</Text>
            <TextInput 
                style={dynamicStyles.input} 
                value={name} 
                onChangeText={setName} 
                placeholderTextColor={darkMode ? "#aaa" : "#888"} 
            />

            <Text style={dynamicStyles.label}>{t("medication.dose") || 'Dose'}</Text>
            <TextInput 
                style={dynamicStyles.input} 
                value={dose} 
                onChangeText={setDose} 
                placeholderTextColor={darkMode ? "#aaa" : "#888"} 
            />

            <Text style={dynamicStyles.label}>{t("medication.frequency") || 'Frequency'}</Text>
            <TextInput 
                style={dynamicStyles.input} 
                value={frequency} 
                onChangeText={setFrequency} 
                placeholderTextColor={darkMode ? "#aaa" : "#888"} 
            />

            <Text style={dynamicStyles.label}>{t("medication.time") || 'Time'}</Text>
            <TextInput 
                style={dynamicStyles.input} 
                value={time} 
                onChangeText={setTime} 
                placeholderTextColor={darkMode ? "#aaa" : "#888"} 
            />

            
            <View style={{ marginBottom: 5 }}>
                <Text style={dynamicStyles.statusLabel}>{t("medication.status") || 'Current Status'}</Text>
                <Text style={dynamicStyles.statusText}>{status.toUpperCase()}</Text>
            </View>
        </View>


        
        <View style={{ marginVertical: 10 }}>
            
            <TouchableOpacity style={dynamicStyles.updateButton} onPress={updateMedication} disabled={loading}>
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                )}
                <Text style={dynamicStyles.updateButtonText}>
                    {loading ? (t("common.saving") || "Saving...") : (t("medication.updateMedication") || "Update Medication")}
                </Text>
            </TouchableOpacity>

            
            <TouchableOpacity style={dynamicStyles.deleteButton} onPress={deleteMedication}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={dynamicStyles.deleteButtonText}>{t("common.delete") || "Delete Medication"}</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default MedicationDetailScreen;