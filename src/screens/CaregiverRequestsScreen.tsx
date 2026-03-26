import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../api";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
const CaregiverRequestsScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [requests, setRequests] = useState<any[]>([]);
  const [medDeleteRequests, setMedDeleteRequests] = useState<any[]>([]);
  const [themeRequests, setThemeRequests] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused) fetchUser();
  }, [isFocused]);

  const fetchUser = async () => {
    const data = await AsyncStorage.getItem("user");
    const parsed = JSON.parse(data || "{}");
    setUser(parsed);

    fetchRequests(parsed._id);
    fetchMedDeleteRequests(parsed._id);
    fetchThemeRequests(parsed._id).then(setThemeRequests);
  };

  const fetchRequests = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/medications/requests/${id}`);
    const data = await res.json();
    setRequests(data);
  };

  const fetchMedDeleteRequests = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/medications/delete-requests/${id}`);
      const data = await res.json();
      setMedDeleteRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchThemeRequests = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/caregiver/theme-requests/${id}`);
    const data = await res.json();
    return data;
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  };

  const handleApproveRequest = async (req: any) => {
    try {
      const medicines = Array.isArray(req.medicines) ? req.medicines : [];
      const res = await fetch(`${API_BASE}/api/medications/approve/${req._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: medicines.map((m: any) => ({
            name: m.name,
            dose: m.dose,
            schedule: { times: [new Date().toISOString()] },
            isActive: true,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to approve");

      Alert.alert("Success", "Request approved");
      refreshAll();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to approve request");
    }
  };

  const handleRejectRequest = async (id: string) => {
    await fetch(`${API_BASE}/api/medications/reject/${id}`, { method: "POST" });
    Alert.alert("Rejected");
    refreshAll();
  };

  const handleApproveMedDelete = async (requestId: string) => {
    await fetch(`${API_BASE}/api/medications/approve-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    Alert.alert("Approved", "Medication deleted successfully");
    refreshAll();
  };

  const handleRejectMedDelete = async (requestId: string) => {
    await fetch(`${API_BASE}/api/medications/reject-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    Alert.alert("Rejected", "Deletion request rejected");
    refreshAll();
  };

  const handleApproveTheme = async (id: string) => {
    await fetch(`${API_BASE}/api/caregiver/approve-theme/${id}`, { method: "POST" });
    Alert.alert("Approved");
    refreshAll();
  };

  const handleRejectTheme = async (id: string) => {
    await fetch(`${API_BASE}/api/caregiver/reject-theme/${id}`, { method: "POST" });
    Alert.alert("Rejected");
    refreshAll();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
<View style={styles.header}>
<TouchableOpacity onPress={()=> navigation.goBack()} style={styles.backButton}>
  <Ionicons name="arrow-back" size={26} color="#3c6fa5"/>
</TouchableOpacity>
<Text style={styles.headerTitle}>Caregiver Requests</Text>
</View>
   
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
    >
      
      <Text style={styles.sectionTitle}>Medication Acceptance Requests</Text>
      {requests.length === 0 && <Text style={styles.emptyText}>No pending acceptance requests.</Text>}
      {requests.map((req: any) => (
        <View key={req._id} style={styles.card}>
          <TouchableOpacity onPress={() => navigation.navigate("EditMedicationRequestScreen", { request: req })}>
            <Text style={styles.cardTitle}>Dependent: {req.dependent.name}</Text>
            {req.medicines.map((med: any, i: number) => (
              <Text key={i} style={styles.cardText}>
                {med.name} - {med.dose}
              </Text>
            ))}
          </TouchableOpacity>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => handleApproveRequest(req)} style={[styles.button, { backgroundColor: "#34C759" }]}>
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRejectRequest(req._id)} style={[styles.button, { backgroundColor: "#FF3B30" }]}>
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

    
      <Text style={styles.sectionTitle}>Medication Deletion Requests</Text>
      {medDeleteRequests.length === 0 && <Text style={styles.emptyText}>No pending deletion requests.</Text>}
      {medDeleteRequests.map((req: any) => (
        <View key={req._id} style={styles.card}>
          <Text style={styles.cardTitle}>Dependent: {req.dependent?.name}</Text>
          <Text style={styles.cardText}>
            Wants to delete: {req.medicationId?.name || "Unknown"} — {req.medicationId?.dose || ""}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => handleApproveMedDelete(req._id)} style={[styles.button, { backgroundColor: "#34C759" }]}>
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRejectMedDelete(req._id)} style={[styles.button, { backgroundColor: "#FF3B30" }]}>
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}


      <Text style={styles.sectionTitle}>Theme Change Requests</Text>
      {themeRequests.length === 0 && <Text style={styles.emptyText}>No pending theme requests.</Text>}
      {themeRequests.map((req: any) => (
        <View key={req._id} style={styles.card}>
          <Text style={styles.cardTitle}>{req.dependent.name} wants {req.requestedTheme} mode</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => handleApproveTheme(req._id)} style={[styles.button, { backgroundColor: "#34C759" }]}>
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRejectTheme(req._id)} style={[styles.button, { backgroundColor: "#FF3B30" }]}>
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
     </SafeAreaView>
  );
};

export default CaregiverRequestsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f2f2f2" },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10, marginTop: 15 },
  emptyText: { color: "#888", marginBottom: 12 },
  safeArea: { flex: 1, backgroundColor: "#F2F2F2" },
  backButton: { marginRight: 10 },
  header: { flexDirection: "row", alignItems: "center", padding: 15, backgroundColor: "#c9d0d7", borderBottomWidth: 1, borderBottomColor: "#ddd" },
 headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1256DB',
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: { fontWeight: "bold", fontSize: 16, color: "#333" },
  cardText: { marginTop: 4, color: "#555" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  button: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
