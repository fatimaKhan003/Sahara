import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  SafeAreaView,
  SectionList,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { API_BASE } from "../../api";

const getPersonalKey = (userId: string) => `prescriptions_${userId}`;
const getCaregiverKey = (userId: string) => `prescriptions_caregiver_${userId}`;

const { width, height } = Dimensions.get("window");

type Prescription = {
  id: string;
  imageUri: string;
  date: string;
  dependentId?: string | null;
  dependentName?: string;
  addedBy?: "self" | "caregiver";
};

type SectionData = {
  title: string;
  sectionKey: string;
  data: Prescription[];
};

export default function ViewPrescriptionsScreen() {
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const navigation = useNavigation<any>();

  const [sections, setSections] = useState<SectionData[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [isDependent, setIsDependent] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) return;
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);

      const [caregiverRes, dependentRes] = await Promise.all([
        fetch(`${API_BASE}/api/caregiver/${parsedUser._id}/is-caregiver`),
        fetch(`${API_BASE}/api/caregiver/is-dependent/${parsedUser._id}`),
      ]);
      const caregiverData = await caregiverRes.json();
      const dependentData = await dependentRes.json();

      const userIsCaregiver = caregiverData.isCaregiver === true;
      const userIsDependent = dependentData.isDependent === true;
      setIsCaregiver(userIsCaregiver);
      setIsDependent(userIsDependent);

      if (userIsCaregiver) {
        const personalKey = getPersonalKey(parsedUser._id);
        const personalRaw = await AsyncStorage.getItem(personalKey);
        const personalList: Prescription[] = personalRaw
          ? JSON.parse(personalRaw)
          : [];

        const caregiverKey = getCaregiverKey(parsedUser._id);
        const caregiverRaw = await AsyncStorage.getItem(caregiverKey);
        const caregiverList: Prescription[] = caregiverRaw
          ? JSON.parse(caregiverRaw)
          : [];

        const depMap: Record<string, { name: string; items: Prescription[] }> =
          {};
        for (const p of caregiverList) {
          const depId = p.dependentId || "unknown";
          const depName = p.dependentName || "Unknown Dependent";
          if (!depMap[depId]) depMap[depId] = { name: depName, items: [] };
          depMap[depId].items.push(p);
        }
        const depRes = await fetch(
          `${API_BASE}/api/caregiver/${parsedUser._id}/dependents`,
        );
        const depData = await depRes.json();
        for (const dep of depData) {
          const depKey = getPersonalKey(dep._id);
          const depRaw = await AsyncStorage.getItem(depKey);
          const depList: Prescription[] = depRaw ? JSON.parse(depRaw) : [];

          if (depList.length > 0) {
            if (!depMap[dep._id])
              depMap[dep._id] = { name: dep.name, items: [] };

            depMap[dep._id].items.push(
              ...depList.filter((p) => p.addedBy === "self"),
            );
          }
        }

        const builtSections: SectionData[] = [];

        if (personalList.length > 0) {
          builtSections.push({
            title: "My Prescriptions",
            sectionKey: "personal",
            data: personalList,
          });
        }

        for (const [depId, { name, items }] of Object.entries(depMap)) {
          builtSections.push({
            title: `${name}'s Prescriptions`,
            sectionKey: depId,
            data: items,
          });
        }

        setSections(builtSections);
        return;
      }

      const personalKey = getPersonalKey(parsedUser._id);
      const personalRaw = await AsyncStorage.getItem(personalKey);
      const personalList: Prescription[] = (
        personalRaw ? JSON.parse(personalRaw) : []
      ).map((p: Prescription) => ({ ...p, addedBy: "self" as const }));

      let caregiverAddedList: Prescription[] = [];

      if (userIsDependent) {
        try {
          const cgRes = await fetch(
            `${API_BASE}/api/caregiver/my-caregiver/${parsedUser._id}`,
          );
          const cgData = await cgRes.json();
          const caregiverId = cgData?.caregiverId;

          if (caregiverId) {
            const caregiverKey = getCaregiverKey(caregiverId);
            const caregiverRaw = await AsyncStorage.getItem(caregiverKey);
            const allCaregiverPrescriptions: Prescription[] = caregiverRaw
              ? JSON.parse(caregiverRaw)
              : [];

            caregiverAddedList = allCaregiverPrescriptions
              .filter((p) => p.dependentId === parsedUser._id)
              .map((p) => ({ ...p, addedBy: "caregiver" as const }));
          }
        } catch (_) {}
      }

      const builtSections: SectionData[] = [];

      if (personalList.length > 0) {
        builtSections.push({
          title: "My Prescriptions",
          sectionKey: "personal",
          data: personalList,
        });
      }

      if (caregiverAddedList.length > 0) {
        builtSections.push({
          title: "Added by My Caregiver",
          sectionKey: "caregiver_added",
          data: caregiverAddedList,
        });
      }

      setSections(builtSections);
    } catch (err) {
      console.error("Failed to load prescriptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const deletePrescription = async (item: Prescription, sectionKey: string) => {
    Alert.alert(
      "Delete Prescription",
      "Are you sure you want to delete this prescription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const storedUser = await AsyncStorage.getItem("user");
              if (!storedUser) return;
              const parsedUser = JSON.parse(storedUser);

              if (sectionKey === "personal") {
                const key = getPersonalKey(parsedUser._id);
                const raw = await AsyncStorage.getItem(key);
                const list: Prescription[] = raw ? JSON.parse(raw) : [];
                const updated = list.filter((p) => p.id !== item.id);
                await AsyncStorage.setItem(key, JSON.stringify(updated));
              } else if (sectionKey === "caregiver_added") {
                const cgRes = await fetch(
                  `${API_BASE}/api/caregiver/my-caregiver/${parsedUser._id}`,
                );
                const cgData = await cgRes.json();
                const caregiverId = cgData?.caregiverId;

                if (caregiverId) {
                  const key = getCaregiverKey(caregiverId);
                  const raw = await AsyncStorage.getItem(key);
                  const list: Prescription[] = raw ? JSON.parse(raw) : [];
                  const updated = list.filter((p) => p.id !== item.id);
                  await AsyncStorage.setItem(key, JSON.stringify(updated));
                }
              } else if (isCaregiver) {
                const dependentId = sectionKey;
                let key: string;
                if (item.addedBy === "self") {
                  key = getPersonalKey(dependentId);
                } else {
                  key = getCaregiverKey(parsedUser._id);
                }
                const raw = await AsyncStorage.getItem(key);
                const list: Prescription[] = raw ? JSON.parse(raw) : [];
                const updated = list.filter((p) => p.id !== item.id);
                await AsyncStorage.setItem(key, JSON.stringify(updated));
              }

              await loadAll();
            } catch (err) {
              console.error("Delete failed:", err);
              Alert.alert("Error", "Failed to delete prescription.");
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    if (!iso) return "No date";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalCount = sections.reduce((acc, s) => acc + s.data.length, 0);

  const renderItem = ({
    item,
    section,
  }: {
    item: Prescription;
    section: SectionData;
  }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: darkMode ? "#2C2C2C" : "#fff" }]}
      onPress={() => setSelectedImage(item.imageUri)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.imageUri }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <View style={styles.cardInfo}>
        <Ionicons name="document-text-outline" size={16} color="#1E5AF2" />
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.dateText, { color: darkMode ? "#ccc" : "#333" }]}
          >
            {formatDate(item.date)}
          </Text>
          {item.addedBy === "caregiver" && (
            <View style={styles.addedByBadge}>
              <Ionicons
                name="person-circle-outline"
                size={12}
                color="#7C3AED"
              />
              <Text style={styles.addedByText}>Added by caregiver</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => deletePrescription(item, section.sectionKey)}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" },
      ]}
    >
      <View
        style={[
          styles.sectionHeaderInner,
          {
            backgroundColor:
              section.sectionKey === "personal"
                ? darkMode
                  ? "#1a2a3a"
                  : "#E8F0FE"
                : section.sectionKey === "caregiver_added"
                  ? darkMode
                    ? "#2a1a3a"
                    : "#F3E8FF"
                  : darkMode
                    ? "#1a3a2a"
                    : "#E8F8EE",
          },
        ]}
      >
        <Ionicons
          name={
            section.sectionKey === "personal"
              ? "person-outline"
              : section.sectionKey === "caregiver_added"
                ? "heart-outline"
                : "people-outline"
          }
          size={16}
          color={
            section.sectionKey === "personal"
              ? "#1E5AF2"
              : section.sectionKey === "caregiver_added"
                ? "#7C3AED"
                : "#059669"
          }
        />
        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                section.sectionKey === "personal"
                  ? "#1E5AF2"
                  : section.sectionKey === "caregiver_added"
                    ? "#7C3AED"
                    : "#059669",
            },
          ]}
        >
          {section.title}
        </Text>
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor:
                section.sectionKey === "personal"
                  ? "#1E5AF2"
                  : section.sectionKey === "caregiver_added"
                    ? "#7C3AED"
                    : "#059669",
            },
          ]}
        >
          <Text style={styles.countBadgeText}>{section.data.length}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={darkMode ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: darkMode ? "#fff" : "#000" }]}
          >
            My Prescriptions
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#1E5AF2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={darkMode ? "#fff" : "#000"}
          />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: darkMode ? "#fff" : "#000" }]}
        >
          {isCaregiver ? "All Prescriptions" : "My Prescriptions"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {totalCount > 0 && (
        <View
          style={[
            styles.summaryStrip,
            { backgroundColor: darkMode ? "#2C2C2C" : "#fff" },
          ]}
        >
          <Ionicons name="albums-outline" size={16} color="#1E5AF2" />
          <Text
            style={[styles.summaryText, { color: darkMode ? "#ccc" : "#555" }]}
          >
            {totalCount} prescription{totalCount !== 1 ? "s" : ""} across{" "}
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {totalCount === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text
            style={[styles.emptyText, { color: darkMode ? "#aaa" : "#888" }]}
          >
            No prescriptions saved yet.
          </Text>
          <Text
            style={[styles.emptySubText, { color: darkMode ? "#666" : "#aaa" }]}
          >
            Scan a prescription to save it here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          stickySectionHeadersEnabled={false}
          renderSectionFooter={() => <View style={{ height: 8 }} />}
        />
      )}

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  summaryText: { fontSize: 13, fontWeight: "500" },

  sectionHeader: { paddingTop: 16, paddingBottom: 8 },
  sectionHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 10,
    padding: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbnail: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  cardInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { fontSize: 13 },
  deleteBtn: { padding: 8 },

  addedByBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  addedByText: { fontSize: 11, color: "#7C3AED", fontWeight: "500" },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  emptySubText: { fontSize: 13 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullImage: { width: width, height: height * 0.8 },
});
