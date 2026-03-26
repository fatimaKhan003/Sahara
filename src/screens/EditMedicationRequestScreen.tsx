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
import { Ionicons } from '@expo/vector-icons';
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
    }))
  );

  const updateField = (index: number, field: string, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: "", dose: "", frequency: "" }]);
  };

  const removeMedicine = (index: number) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated);
  };

  const approveRequest = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/medications/approve/${request._id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicines: medicines.map((m) => ({
              name: m.name,
              dose: m.dose,
              schedule: { times: [new Date().toISOString()] },
              isActive: true,
            })),
          }),
        }
      );

      if (!res.ok) throw new Error("Failed");

      Alert.alert("Success", "Request approved with changes");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to approve request");
    }
  };

  const rejectRequest = async () => {
    try {
      await fetch(`${API_BASE}/api/medications/reject/${request._id}`, {
        method: "POST",
      });
      Alert.alert("Rejected", "Request has been rejected");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to reject");
    }
  };

  return (

   <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
    <Ionicons name="arrow-back" size={20} color="#fff" />
  </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Medication Request</Text>
      <Text style={styles.subTitle}>Dependent: {request.dependent.name}</Text>

      {medicines.map((med, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.medLabel}>Medicine {index + 1}</Text>
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
            <Text style={styles.removeBtnText}>Remove Medicine</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity onPress={addMedicine} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ Add Medicine</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={approveRequest} style={styles.approveBtn}>
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={rejectRequest} style={styles.rejectBtn}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default EditMedicationRequestScreen;

const PRIMARY = '#1256DB';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 5,
  },

  subTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#F5F9FF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E3EDFF',
  },

  medLabel: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 10,
    color: PRIMARY,
  },

  input: {
    borderWidth: 1,
    borderColor: '#DCE6F9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },

  addBtn: {
    backgroundColor: '#E8F0FE',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCE6F9',
  },

  addBtnText: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 15,
  },

  approveBtn: {
    backgroundColor: PRIMARY,
    flex: 0.48,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  approveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  rejectBtn: {
    flex: 0.48,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },

  rejectBtnText: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 15,
  },

  removeBtn: {
    backgroundColor: '#FFF4F4',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },

  removeBtnText: {
    color: '#D9534F',
    fontWeight: '600',
    fontSize: 13,
  },
});
