import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../api";
import { useNavigation } from "@react-navigation/native";

const CaregiverRequestsScreen = () => {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [medDeleteRequests, setMedDeleteRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchUser();
  }, []);

  const [themeRequests, setThemeRequests] = useState([]);

  const fetchUser = async () => {
    const data = await AsyncStorage.getItem("user");
    const parsed = JSON.parse(data || "{}");
    setUser(parsed);

    fetchRequests(parsed._id);
    fetchMedDeleteRequests(parsed._id);

    const themeReqs = await fetchThemeRequests(parsed._id);
    setThemeRequests(themeReqs);
  };

  const fetchRequests = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/medications/requests/${id}`);
    const data = await res.json();
    setRequests(data);
  };
  const fetchMedDeleteRequests = async (caregiverId: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/medications/delete-requests/${caregiverId}`,
      );
      const data = await res.json();
      setMedDeleteRequests(Array.isArray(data) ? data : []);
      console.log("Med Delete Requests:", Array.isArray(data) ? data : []); // <--- check this
    } catch (err) {
      console.error("Error fetching med delete requests:", err);
    }
  };
  const approveTheme = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/caregiver/approve-theme/${id}`, {
      method: "POST",
    });

    const data = await res.json();

    Alert.alert("Approved");

    fetchUser(); // refresh
  };

  const rejectTheme = async (id: string) => {
    await fetch(`${API_BASE}/api/caregiver/reject-theme/${id}`, {
      method: "POST",
    });

    Alert.alert("Rejected");

    fetchUser();
  };
  const approveRequest = async (id: string) => {
    await fetch(`${API_BASE}/api/medications/approve/${id}`, {
      method: "POST",
    });

    Alert.alert("Approved");
    fetchRequests(user._id);
  };

  const rejectRequest = async (id: string) => {
    await fetch(`${API_BASE}/api/medications/reject/${id}`, {
      method: "POST",
    });

    Alert.alert("Rejected");
    fetchRequests(user._id);
  };
  const approveMedDelete = async (requestId: string) => {
    await fetch(`${API_BASE}/api/medications/approve-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    Alert.alert("Approved", "Medication has been deleted");
    fetchMedDeleteRequests(user._id); // refresh list
  };

  const rejectMedDelete = async (requestId: string) => {
    await fetch(`${API_BASE}/api/medications/reject-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    Alert.alert("Rejected", "Deletion request has been rejected");
    fetchMedDeleteRequests(user._id); // refresh list
  };
  const fetchThemeRequests = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/caregiver/theme-requests/${id}`);
    const data = await res.json();
    return data;
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        Medication Acceptance Requests
      </Text>
      {requests.length === 0 && (
        <Text style={{ color: "#888" }}>No pending acceptance requests.</Text>
      )}
      {requests.map((req: any) => (
        <View
          key={req._id}
          style={{ backgroundColor: "#fff", padding: 15, marginBottom: 10 }}
        >
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("EditMedicationRequestScreen", {
                request: req,
              })
            }
          >
            <Text style={{ fontWeight: "bold" }}>
              Dependent: {req.dependent.name}
            </Text>

            {req.medicines.map((med, i) => (
              <Text key={i}>
                {med.name} - {med.dose}
              </Text>
            ))}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => approveRequest(req._id)}>
            <Text style={{ color: "green" }}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => rejectRequest(req._id)}>
            <Text style={{ color: "red" }}>Reject</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        Medication Deletion Requests
      </Text>

      {medDeleteRequests.length === 0 && (
        <Text style={{ color: "#888" }}>No pending deletion requests.</Text>
      )}

      {medDeleteRequests.map((req: any) => (
        <View
          key={req._id}
          style={{
            backgroundColor: "#fff",
            padding: 15,
            borderRadius: 10,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: "bold" }}>
            Dependent: {req.dependent?.name}
          </Text>
          <Text style={{ marginTop: 4, color: "#555" }}>
            Wants to delete: {req.medicationId?.name || "Unknown"} —{" "}
            {req.medicationId?.dose || ""}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => approveMedDelete(req._id)}
              style={{
                backgroundColor: "#34C759",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => rejectMedDelete(req._id)}
              style={{
                backgroundColor: "#FF3B30",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        Theme Change Requests
      </Text>
      {themeRequests.length === 0 && (
        <Text style={{ color: "#888" }}>No pending theme requests.</Text>
      )}
      {themeRequests.map((req: any) => (
        <View
          key={req._id}
          style={{ backgroundColor: "#fff", padding: 15, marginBottom: 10 }}
        >
          <Text>
            {req.dependent.name} wants {req.requestedTheme} mode
          </Text>

          <TouchableOpacity onPress={() => approveTheme(req._id)}>
            <Text style={{ color: "green" }}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => rejectTheme(req._id)}>
            <Text style={{ color: "red" }}>Reject</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

export default CaregiverRequestsScreen;
