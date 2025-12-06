import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { API_BASE } from "../../api";

const MedicationDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { med, onUpdate } = route.params;

  const [name, setName] = useState(med.name);
  const [dose, setDose] = useState(med.dose);
  const [frequency, setFrequency] = useState(med.frequency);
  const [time, setTime] = useState(med.time);
  const [status, setStatus] = useState(med.status);
  const [imageUri, setImageUri] = useState(
    med.imageUri ? `${API_BASE}${med.imageUri}` : null
  );
  const [loading, setLoading] = useState(false);

  /* ================= IMAGE PICKER ================= */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ================= UPDATing Medication ================= 
  const updateMedication = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("dose", dose);
      formData.append("frequency", frequency);
      formData.append("time", time);
      formData.append("status", status);

      // to Add image if picked from gallery
      if (imageUri && !imageUri.startsWith("http")) {
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename ?? "");
        const type = match ? `image/${match[1]}` : `image`;
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      const res = await fetch(`${API_BASE}/api/medications/${med._id}`, {
        method: "PATCH",
        headers: {
          "Accept": "application/json",
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Update failed:", text);
        throw new Error("Failed to update medication");
      }

      const updated = await res.json();

      if (onUpdate) onUpdate(updated);

      Alert.alert("Success", "Medication updated successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to update medication");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  //================= DELETE MED ================= 
  const deleteMedication = async () => {
    Alert.alert("Delete Medication", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(
              `${API_BASE}/api/medications/${med._id}`,
              { method: "DELETE" }
            );

            if (onUpdate) onUpdate(null);

            Alert.alert("Deleted", "Medication deleted successfully", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          } catch (err) {
            Alert.alert("Error", "Failed to delete medication");
            console.error(err);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        onPress={pickImage}
        style={styles.imagePickerContainer}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: imageUri || "https://cdn-icons-png.flaticon.com/512/2907/2907763.png",
          }}
          style={styles.medImage}
        />
        <Text style={styles.changeImageText}>Change Image</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Dose</Text>
      <TextInput style={styles.input} value={dose} onChangeText={setDose} />

      <Text style={styles.label}>Frequency</Text>
      <TextInput style={styles.input} value={frequency} onChangeText={setFrequency} />

      <Text style={styles.label}>Time</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} />

      <Text style={styles.label}>Status</Text>
      <TextInput style={styles.input} value={status} onChangeText={setStatus} />

      <TouchableOpacity style={styles.updateButton} onPress={updateMedication}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Update Medication</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={deleteMedication}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "bold", marginLeft: 5 }}>Delete</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default MedicationDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F6F8FF" },
  medImage: { width: 150, height: 150, borderRadius: 75 },
  changeImageText: { textAlign: "center", color: "#007AFF", marginTop: 5 },
  imagePickerContainer: { alignItems: "center", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginVertical: 5 },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  updateButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
});
