import React, { useEffect, useState, useMemo, useContext, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDrawer } from "../navigation/AppDrawerProvider";
import { API_BASE } from "../../api";
import { containsUrdu } from "../utils/textUtils";
import { ThemeContext } from "../context/ThemeContext";
import EventBus from '../utils/EventBus';

const HomeScreen = () => {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<any[]>([]);
  const navigation = useNavigation<any>();
  const [selectedTab, setSelectedTab] = useState("all");
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

  const days = [
    t("home.days.monday"),
    t("home.days.tuesday"),
    t("home.days.wednesday"),
    t("home.days.thursday"),
    t("home.days.friday"),
    t("home.days.saturday"),
    t("home.days.sunday"),
  ];

  const getWeekDates = (startDate: Date) => {
    return Array.from({ length: 7 }, (_, i) => {
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + i);
      return newDate;
    });
  };

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  const goToPrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  // ================= FETCH USER DATA =================
  const fetchUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        setUser(null);
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      const response = await fetch(`${API_BASE}/api/medications/${parsedUser._id}`);
      const meds = await response.json();
      setMedications(Array.isArray(meds) ? meds : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ================= LOAD ON MOUNT =================
  useEffect(() => {
    fetchUserData();

    // Listen for profile image updates
    const handler = (u: any) => {
      console.log('HomeScreen: User updated', u);
      setUser(u);
    };
    EventBus.on('userUpdated', handler);

    return () => EventBus.off('userUpdated', handler);
  }, [fetchUserData]);

  // ================= RELOAD ON FOCUS =================
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const totalCount = medications.length;
  const takenCount = medications.filter((m) => m.status === "taken").length;
  const missedCount = medications.filter((m) => m.status === "missed").length;

  const checkMissedMeds = () => {
    const now = new Date();
    setMedications((prev) =>
      prev.map((med) => {
        if (med.status === "pending" && med.time) {
          let [time, period] = med.time.split(" ");
          let [hours, minutes] = time.split(":").map(Number);

          if (period?.toLowerCase() === "pm" && hours !== 12) hours += 12;
          if (period?.toLowerCase() === "am" && hours === 12) hours = 0;

          const medTime = new Date();
          medTime.setHours(hours, minutes, 0, 0);

          if (now > medTime) {
            updateStatus(med._id, "missed");
            return { ...med, status: "missed" };
          }
        }
        return med;
      })
    );
  };

  useEffect(() => {
    checkMissedMeds();
    const interval = setInterval(checkMissedMeds, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateLanguage = () => setCurrentLanguage(i18n.language);
    i18n.on("languageChanged", updateLanguage);
    return () => i18n.off("languageChanged", updateLanguage);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/medications/update-status/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const updated = await res.json();
      setMedications((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    } catch (error) {
      Alert.alert(t("common.error") || "Error", t("medication.updateError"));
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/medications/${id}`, { method: "DELETE" });
      setMedications((prev) => prev.filter((m) => m._id !== id));
    } catch (error) {
      Alert.alert(t("common.error") || "Error", t("medication.deleteError"));
    }
  };

  const filteredMeds = medications.filter((med) => {
    if (selectedTab === "taken") return med.status === "taken";
    if (selectedTab === "missed") return med.status === "missed";
    return true;
  });

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const goToDetail = (med: any) => {
    navigation.navigate("MedicationDetailScreen", {
      med,
      onUpdate: (updatedMed: any) => {
        if (!updatedMed) {
          setMedications((prev) => prev.filter((m) => m._id !== med._id));
        } else {
          setMedications((prev) =>
            prev.map((m) => (m._id === updatedMed._id ? updatedMed : m))
          );
        }
      },
    });
  };

  // ======================= Dynamic Colors =====================
  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF", padding: 20 },
    text: { color: darkMode ? "#E5E5E5" : "#333" },
    subText: { color: darkMode ? "#A0A0A0" : "gray" },
    medBox: { backgroundColor: darkMode ? "#2C2C2C" : "#fff" },
    takenText: { color: darkMode ? "#34C759" : "#34C759" },
    missedText: { color: darkMode ? "#FF6B6B" : "red" },
    tabBg: { backgroundColor: darkMode ? "#3A3A3A" : "#eee" },
    activeTabBg: { backgroundColor: darkMode ? "#007AFF" : "#007AFF" },
    activeTabText: { color: "#fff" },
    calendarBg: { backgroundColor: darkMode ? "#2C2C2C" : "#F0F7FF" },
    dayText: { color: darkMode ? "#E5E5E5" : "#666" },
    selectedDayText: { color: "#007AFF" },
    dateText: { color: darkMode ? "#E5E5E5" : "#333", fontWeight: "bold" },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dynamicStyles.container.backgroundColor }}>
      <ScrollView
        style={dynamicStyles.container}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>navigation.navigate("ProfileEditScreen")}>
            <Image
              source={{ uri: user?.profileImage || "https://cdn-icons-png.flaticon.com/512/147/147144.png" }}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.helloText, (currentLanguage === 'ur' || (user?.name && containsUrdu(user.name))) && styles.urduText, { color: dynamicStyles.text.color }]}>
              {t("common.hello")}, {user?.name}
            </Text>
            <Text style={[styles.welcomeText, { color: dynamicStyles.subText.color }]}>{t("common.welcomeBack")}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={openDrawer}>
              <Ionicons name="menu-outline" size={26} color={darkMode ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Today */}
        <Text style={[styles.todayText, { color: dynamicStyles.text.color }]}>{t("common.today")}, {new Date().toDateString()}</Text>

        <View style={styles.weekNav}>
          <TouchableOpacity onPress={goToPrevWeek}>
            <Ionicons name="chevron-back" size={22} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextWeek}>
            <Ionicons name="chevron-forward" size={22} color={dynamicStyles.text.color} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarRow}>
          {weekDates.map((date, index) => {
            const selected = date.toDateString() === selectedDate.toDateString();
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDate(date)}
                style={[styles.dayContainer, selected && styles.selectedDay]}
              >
                <Text style={[styles.dayText, { color: selected ? dynamicStyles.selectedDayText.color : dynamicStyles.dayText.color }]}>{days[index]}</Text>
                <Text style={[styles.dateText, { color: selected ? dynamicStyles.selectedDayText.color : dynamicStyles.dateText.color }]}>{date.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: "all", label: t("home.all"), count: totalCount },
            { key: "taken", label: t("home.taken"), count: takenCount },
            { key: "missed", label: t("home.missed"), count: missedCount },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              style={[styles.tabButton, { backgroundColor: selectedTab === tab.key ? dynamicStyles.activeTabBg.backgroundColor : dynamicStyles.tabBg.backgroundColor }]}
            >
              <Text style={selectedTab === tab.key ? dynamicStyles.activeTabText : { color: dynamicStyles.text.color }}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Medications */}
        {filteredMeds.map((med) => (
          <Swipeable
            key={med._id}
            renderRightActions={() => (
              <TouchableOpacity onPress={() => deleteMedication(med._id)} style={styles.deleteBox}>
                <Ionicons name="trash" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          >
            <TouchableOpacity style={[styles.savedMedContainer, { backgroundColor: dynamicStyles.medBox.backgroundColor }]} onPress={() => goToDetail(med)}>
              <Text style={[styles.medName, { color: dynamicStyles.text.color }]}>{med.name}</Text>
              <Text style={{ color: dynamicStyles.text.color }}>{med.dose}</Text>
              <Text style={{ color: dynamicStyles.text.color }}>{med.frequency}</Text>
              {med.status === "missed" && <Text style={[styles.missed, { color: dynamicStyles.missedText.color }]}>{t("home.missed").toUpperCase()}</Text>}
              {med.status !== "taken" && <TouchableOpacity style={styles.takeButton} onPress={() => updateStatus(med._id, "taken")}><Text style={{ color: "#fff" }}>{t("home.take")}</Text></TouchableOpacity>}
            </TouchableOpacity>
          </Swipeable>
        ))}

        {/* Add Medication */}
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("ScanPrescriptionScreen")}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>{t("home.addMedication")}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

// ======================= Styles =====================
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 70, height: 70, borderRadius: 35, marginRight: 15 },
  helloText: { fontSize: 18, fontWeight: "700" },
  urduText: { writingDirection: "rtl", textAlign: "right" },
  welcomeText: { fontSize: 16 },
  todayText: { fontSize: 18, marginTop: 20 },
  weekNav: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 8,
  },
  weekText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  calendarRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 5, borderRadius: 12, marginVertical: 10 },
  dayContainer: { padding: 10, alignItems: "center", borderRadius: 10 },
  selectedDay: { borderWidth: 1, borderColor: "#007AFF" },
  tabs: { flexDirection: "row", marginVertical: 20, justifyContent: "space-between" },
  tabButton: { padding: 10, borderRadius: 10 },
  savedMedContainer: { padding: 15, borderRadius: 15, marginBottom: 15 },
  medName: { fontSize: 18, fontWeight: "bold" },
  takeButton: { backgroundColor: "#34C759", padding: 10, borderRadius: 8, marginTop: 8 },
  missed: { fontWeight: "bold", marginVertical: 4 },
  deleteBox: { backgroundColor: "red", justifyContent: "center", alignItems: "center", width: 80, height: "100%" },
  addButton: { backgroundColor: "#007AFF", padding: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", borderRadius: 12, marginVertical: 20 },
  addButtonText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
});
