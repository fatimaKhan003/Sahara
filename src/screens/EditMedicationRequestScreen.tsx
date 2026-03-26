import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { API_BASE } from "../../api";

const EditMedicationRequestScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { request } = route.params;

  const [medicines, setMedicines] = useState(
    request.medicines.map((m: any) => ({
      name: m.name || "",
      dose: m.dose || "",
      frequency: m.frequency || "",
    })),
  );

  // ── HANDLE INPUT CHANGE ─────────────────────────
  const updateField = (index: number, field: string, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // ── ADD NEW MEDICINE ───────────────────────────
  const addMedicine = () => {
    setMedicines([...medicines, { name: "", dose: "", frequency: "" }]);
  };

  // ── REMOVE MEDICINE ────────────────────────────
  const removeMedicine = (index: number) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated);
  };

  // ── APPROVE WITH EDITS ─────────────────────────
  const approveRequest = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/medications/approve/${request._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            medicines: medicines.map((m) => ({
              name: m.name,
              dose: m.dose,
              schedule: {
                times: [new Date().toISOString()],
              },
              isActive: true,
            })),
          }),
        },
      );

      if (!res.ok) throw new Error("Failed");

      Alert.alert("Approved with changes");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to approve request");
    }
  };

  // ── REJECT ─────────────────────────────────────
  const rejectRequest = async () => {
    try {
      await fetch(`${API_BASE}/api/medications/reject/${request._id}`, {
        method: "POST",
      });

      Alert.alert("Rejected");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to reject");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Edit Request</Text>

      <Text style={styles.subTitle}>Dependent: {request.dependent.name}</Text>

      {medicines.map((med, index) => (
        <View key={index} style={styles.card}>
          <TextInput
            placeholder="Medicine Name"
            value={med.name}
            onChangeText={(text) => updateField(index, "name", text)}
            style={styles.input}
          />

          <TextInput
            placeholder="Dose (e.g. 1 tablet)"
            value={med.dose}
            onChangeText={(text) => updateField(index, "dose", text)}
            style={styles.input}
          />

          <TextInput
            placeholder="Frequency (e.g. 2 times/day)"
            value={med.frequency}
            onChangeText={(text) => updateField(index, "frequency", text)}
            style={styles.input}
          />

          <TouchableOpacity
            onPress={() => removeMedicine(index)}
            style={styles.removeBtn}
          >
            <Text style={{ color: "white" }}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity onPress={addMedicine} style={styles.addBtn}>
        <Text style={{ color: "#fff" }}>+ Add Medicine</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={approveRequest} style={styles.approveBtn}>
        <Text style={{ color: "#fff" }}>Approve with Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={rejectRequest} style={styles.rejectBtn}>
        <Text style={{ color: "#fff" }}>Reject</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditMedicationRequestScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  subTitle: { fontSize: 16, marginBottom: 20 },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },

  addBtn: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },

  approveBtn: {
    backgroundColor: "green",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  rejectBtn: {
    backgroundColor: "red",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  removeBtn: {
    backgroundColor: "#FF3B30",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 5,
  },
});
