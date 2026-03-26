import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  SectionList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { API_BASE } from "../../api";
import { ThemeContext } from "../context/ThemeContext";

type Medication = {
  _id: string;
  name: string;
  dose: string;
  doseLogs?: { status: "taken" | "missed" | "not_taken" }[];
  addedBy?: "self" | "caregiver";
  dependentId?: string;
  dependentName?: string;
};

type SectionData = {
  title: string;
  sectionKey: string;
  data: Medication[];
};

export default function ViewAllMedicinesScreen() {
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const navigation = useNavigation<any>();

  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [isDependent, setIsDependent] = useState(false);

  const getStatus = (doseLogs: any[]) => {
    if (!doseLogs || doseLogs.length === 0) return "Not Taken";
    if (doseLogs.some((d) => d.status === "taken")) return "Taken";
    if (doseLogs.some((d) => d.status === "missed")) return "Missed";
    return "Not Taken";
  };

  const loadAllMeds = useCallback(async () => {
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
      setIsCaregiver(caregiverData.isCaregiver === true);
      setIsDependent(dependentData.isDependent === true);

      const sectionsArr: SectionData[] = [];

      const personalRes = await fetch(
        `${API_BASE}/api/medications/${parsedUser._id}`,
      );
      const personalMeds: Medication[] = await personalRes.json();
      if (personalMeds.length > 0) {
        sectionsArr.push({
          title: "My Medications",
          sectionKey: "personal",
          data: personalMeds.map((m) => ({ ...m, addedBy: "self" })),
        });
      }

      if (caregiverData.isCaregiver) {
        const depRes = await fetch(
          `${API_BASE}/api/caregiver/${parsedUser._id}/dependents`,
        );
        const dependents = await depRes.json();

        for (const dep of dependents) {
          const depMedRes = await fetch(
            `${API_BASE}/api/medications/${dep._id}`,
          );
          const depMeds: Medication[] = await depMedRes.json();
          if (depMeds.length > 0) {
            sectionsArr.push({
              title: `${dep.name}'s Medications`,
              sectionKey: dep._id,
              data: depMeds.map((m) => ({ ...m, dependentName: dep.name })),
            });
          }
        }
      }

      setSections(sectionsArr);
    } catch (err) {
      console.error("Failed to load medications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllMeds();
  }, [loadAllMeds]);

  const totalCount = sections.reduce((acc, s) => acc + s.data.length, 0);

  const renderItem = ({ item }: { item: Medication }) => (
    <View
      style={[styles.card, { backgroundColor: darkMode ? "#2C2C2C" : "#fff" }]}
    >
      <Text style={[styles.name, { color: darkMode ? "#fff" : "#000" }]}>
        {item.name}
      </Text>
      <Text style={{ color: darkMode ? "#ccc" : "#333" }}>
        Dose: {item.dose}
      </Text>
      <Text style={{ color: darkMode ? "#ccc" : "#333" }}>
        Status: {getStatus(item.doseLogs)}
      </Text>
      {item.addedBy === "caregiver" && (
        <View style={styles.addedByBadge}>
          <Ionicons name="person-circle-outline" size={12} color="#7C3AED" />
          <Text style={styles.addedByText}>Added by caregiver</Text>
        </View>
      )}
    </View>
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
              : "people-outline"
          }
          size={16}
          color={section.sectionKey === "personal" ? "#1E5AF2" : "#059669"}
        />
        <Text
          style={[
            styles.sectionTitle,
            {
              color: section.sectionKey === "personal" ? "#1E5AF2" : "#059669",
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
                section.sectionKey === "personal" ? "#1E5AF2" : "#059669",
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
            Medications
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
          {isCaregiver ? "All Medications" : "My Medications"}
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
          <Ionicons name="medkit-outline" size={16} color="#1E5AF2" />
          <Text
            style={[styles.summaryText, { color: darkMode ? "#ccc" : "#555" }]}
          >
            {totalCount} medication{totalCount !== 1 ? "s" : ""} across{" "}
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {totalCount === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medkit-outline" size={64} color="#ccc" />
          <Text
            style={[styles.emptyText, { color: darkMode ? "#aaa" : "#888" }]}
          >
            No medications saved yet.
          </Text>
          <Text
            style={[styles.emptySubText, { color: darkMode ? "#666" : "#aaa" }]}
          >
            Add a medication to get started.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          stickySectionHeadersEnabled={false}
          renderSectionFooter={() => <View style={{ height: 8 }} />}
        />
      )}
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
    flexDirection: "column",
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },

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
});
