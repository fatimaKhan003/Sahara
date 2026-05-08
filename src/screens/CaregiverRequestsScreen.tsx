import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../api";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemeContext } from "../context/ThemeContext";
const CaregiverRequestsScreen = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [medDeleteRequests, setMedDeleteRequests] = useState<any[]>([]);
  const [themeRequests, setThemeRequests] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFocused) fetchAllData();
  }, [isFocused]);

  const fetchAllData = async () => {
    const data = await AsyncStorage.getItem("user");
    const parsed = JSON.parse(data || "{}");
    const id=parsed._id;
    setLoading(true);
    await Promise.all([ fetchRequests(id),
    fetchMedDeleteRequests(id),
    fetchThemeRequests(id).then(setThemeRequests),

    ]);
    setLoading(false);

   
  };

  const fetchRequests = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/medications/requests/${id}`);
    const data = await res.json();
    setRequests(data);
  };

  const fetchMedDeleteRequests = async (id: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/medications/delete-requests/${id}`,
      );
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleApproveRequest = async (req: any) => {
    try {
      const medicines = Array.isArray(req.medicines) ? req.medicines : [];
      const res = await fetch(
        `${API_BASE}/api/medications/approve/${req._id}`,
        {
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
        },
      );
      if (!res.ok) throw new Error("Failed to approve");

      Alert.alert("Success", "Request approved");
      onRefresh();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to approve request");
    }
  };

  const handleRejectRequest = async (id: string) => {
    await fetch(`${API_BASE}/api/medications/reject/${id}`, { method: "POST" });
    Alert.alert("Rejected");
    onRefresh();
  };

  const handleApproveMedDelete = async (requestId: string) => {
    await fetch(`${API_BASE}/api/medications/approve-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    Alert.alert("Approved", "Medication deleted successfully");
    onRefresh();
  };

  const handleRejectMedDelete = async (requestId: string) => {
    await fetch(`${API_BASE}/api/medications/reject-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    Alert.alert("Rejected", "Deletion request rejected");
    onRefresh();
  };

  const handleApproveTheme = async (id: string) => {
    await fetch(`${API_BASE}/api/caregiver/approve-theme/${id}`, {
      method: "POST",
    });
    Alert.alert("Approved");
    onRefresh();
  };

  const handleRejectTheme = async (id: string) => {
    await fetch(`${API_BASE}/api/caregiver/reject-theme/${id}`, {
      method: "POST",
    });
    Alert.alert("Rejected");
    onRefresh();
  };
const renderSectionHeader = (title: string, icon: any) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={22} color={isDark ? "#94A3B8" : "#64748B"} />
      <Text style={[styles.sectionTitle, { color: isDark ? "#E2E8F0" : "#475569" }]}>{title}</Text>
    </View>
  );
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={48} color="#CBD5E1" />
      <Text style={styles.emptyText}>All caught up! No pending requests.</Text>
    </View>
  );
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#121212" : "#F8FAFC" }]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: isDark ? "#1E1E1E" : "#F6F8FF",
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#333" : "#eee",
          paddingTop: insets.top + 10,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: isDark ? "#fff" : "#000",
          }}
        >
          Request Center
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* Medication Additions */}
        {renderSectionHeader("New Medications", "pill")}
        {requests.length === 0 && renderEmpty()}
        {requests.map((req) => (
          <View key={req._id} style={[styles.card, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
            <View style={styles.cardInfo}>
              <Text style={[styles.dependentLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>DEPENDENT</Text>
              <Text style={[styles.dependentName, { color: isDark ? "#F8FAFC" : "#1E293B" }]}>{req.dependent.name}</Text>
              <View style={styles.divider} />
              {req.medicines.map((med, i) => (
                <View key={i} style={styles.medRow}>
                  <Ionicons name="medical" size={14} color="#3B82F6" />
                  <Text style={[styles.medText, { color: isDark ? "#CBD5E1" : "#334155" }]}>{med.name} ({med.dose})</Text>
                </View>
              ))}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => handleRejectRequest(req._id)} style={[styles.actionBtn, styles.rejectBtn]}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleApproveRequest(req)} style={[styles.actionBtn, styles.approveBtn]}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Medication Deletions */}
        {renderSectionHeader("Deletion Requests", "trash-can-outline")}
        {medDeleteRequests.length === 0 && renderEmpty()}
        {medDeleteRequests.map((req) => (
          <View key={req._id} style={[styles.card, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
            <View style={styles.cardInfo}>
              <Text style={[styles.dependentLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>DEPENDENT</Text>
              <Text style={[styles.dependentName, { color: isDark ? "#F8FAFC" : "#1E293B" }]}>{req.dependent?.name}</Text>
              <Text style={[styles.deleteText, { color: isDark ? "#FCA5A5" : "#EF4444" }]}>
                Requested to remove: <Text style={{ fontWeight: "700" }}>{req.medicationId?.name}</Text>
              </Text>
            </View>
            <View style={styles.actionRow}>
              {/* Reuse your handlers handleRejectMedDelete / handleApproveMedDelete */}
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => Alert.alert("Rejected")}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => Alert.alert("Deleted")}>
                <Text style={styles.approveBtnText}>Confirm Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Theme Requests */}
        {renderSectionHeader("Appearance Requests", "palette-outline")}
        {themeRequests.length === 0 && renderEmpty()}
        {themeRequests.map((req) => (
          <View key={req._id} style={[styles.card, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
             <View style={styles.themeContent}>
                <Ionicons name="color-palette" size={24} color="#8B5CF6" />
                <Text style={[styles.themeText, { color: isDark ? "#F8FAFC" : "#1E293B" }]}>
                   <Text style={{ fontWeight: '700' }}>{req.dependent.name}</Text> wants to switch to <Text style={{ color: '#8B5CF6' }}>{req.requestedTheme}</Text> mode.
                </Text>
             </View>
             <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejectTheme(req._id)}>
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApproveTheme(req._id)}>
                  <Text style={styles.approveBtnText}>Approve</Text>
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
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backButton: { padding: 4 },
  scrollContent: { padding: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginLeft: 8, textTransform: "uppercase", letterSpacing: 1 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardInfo: { marginBottom: 16 },
  dependentLabel: { fontSize: 10, fontWeight: "800", marginBottom: 2 },
  dependentName: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 },
  medRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  medText: { marginLeft: 6, fontSize: 15 },
  deleteText: { marginTop: 4, fontSize: 14 },
  themeContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  themeText: { flex: 1, fontSize: 15 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  approveBtn: { backgroundColor: "#3B82F6" },
  approveBtnText: { color: "#FFFFFF", fontWeight: "700" },
  rejectBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#CBD5E1" },
  rejectBtnText: { color: "#64748B", fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingVertical: 20, opacity: 0.6 },
  emptyText: { marginTop: 8, fontSize: 13, color: "#94A3B8" },
});