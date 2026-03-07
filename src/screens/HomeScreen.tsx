import React, {
  useEffect,
  useState,
  useMemo,
  useContext,
  useCallback,
} from "react";
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
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDrawer } from "../navigation/AppDrawerProvider";
import { API_BASE } from "../../api";
import { containsUrdu } from "../utils/textUtils";
import { ThemeContext } from "../context/ThemeContext";
import EventBus from "../utils/EventBus";
import {
  cancelMedicationNotifications,
  scheduleMedicationNotifications,
} from "../services/notifications";

const HomeScreen = () => {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";

  const navigation = useNavigation<any>();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [medications, setMedications] = useState<any[]>([]);
  const [dependentsMeds, setDependentsMeds] = useState<any[]>([]);

  const [dashboardMode, setDashboardMode] = useState<"personal" | "caregiver">(
    "personal",
  );
  const [isCaregiver, setIsCaregiver] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState("all");
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(
    getStartOfWeek(new Date()),
  );

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

  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart),
    [currentWeekStart],
  );

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

  // FETCH USER + MODE + MEDS
  const fetchUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        setUser(null);
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // SYNC MISSED DOSES
      await fetch(`${API_BASE}/api/medications/sync-missed/${parsedUser._id}`, {
        method: "POST",
      });

      // CAREGIVER
      const caregiverRes = await fetch(
        `${API_BASE}/api/caregiver/${parsedUser._id}/is-caregiver`,
      );
      const caregiverData = await caregiverRes.json();
      setIsCaregiver(caregiverData.isCaregiver);
      const storedMode = await AsyncStorage.getItem("dashboardMode");
      if (storedMode === "caregiver" && caregiverData.isCaregiver) {
        setDashboardMode("caregiver");
      } else {
        setDashboardMode("personal");
      }

      if (storedMode === "caregiver" && caregiverData.isCaregiver) {
        const res = await fetch(
          `${API_BASE}/api/caregiver/${parsedUser._id}/dependents-meds`,
        );
        const data = await res.json();
        const dependents = Array.isArray(data) ? data : [];

        // MARK EXPIRED DOSES FOR EACH DEPENDENT
        await Promise.all(
          dependents.map((med) =>
            fetch(`${API_BASE}/api/medications/expire-doses/${med.user}`, {
              method: "POST",
            }),
          ),
        );

        setDependentsMeds(dependents);
      } else {
        const response = await fetch(
          `${API_BASE}/api/medications/${parsedUser._id}`,
        );
        const meds = await response.json();
        setMedications(Array.isArray(meds) ? meds : []);
        await scheduleMedicationNotifications(meds);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();

    const handler = (u: any) => {
      setUser(u);
    };
    EventBus.on("userUpdated", handler);

    return () => EventBus.off("userUpdated", handler);
  }, [fetchUserData]);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData]),
  );

  useEffect(() => {
    const updateLanguage = () => setCurrentLanguage(i18n.language);
    i18n.on("languageChanged", updateLanguage);
    return () => i18n.off("languageChanged", updateLanguage);
  }, []);

  const medsToShow =
    dashboardMode === "personal" ? medications : dependentsMeds;

  const totalCount = medsToShow.length;
  const takenCount = medsToShow.filter((med) =>
    med.doseLogs.some((d) => d.status === "taken"),
  ).length;

  const missedCount = medsToShow.filter((med) =>
    med.doseLogs.some((d) => d.status === "missed"),
  ).length;

  const filteredMeds = medsToShow.filter((med) => {
    if (selectedTab === "taken") {
      return med.doseLogs.some((dose) => dose.status === "taken");
    }
    if (selectedTab === "missed") {
      return med.doseLogs.some((dose) => dose.status === "missed");
    }
    return true; // "all" tab
  });

  // const updateStatus = async (id: string, status: string) => {
  //   try {
  //     const res = await fetch(
  //       `${API_BASE}/api/medications/update-status/${id}`,
  //       {
  //         method: "PATCH",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ status }),
  //       },
  //     );

  //     const updated = await res.json();

  //     if (dashboardMode === "personal") {
  //       setMedications((prev) =>
  //         prev.map((m) => (m._id === updated._id ? updated : m)),
  //       );
  //     } else {
  //       setDependentsMeds((prev) =>
  //         prev.map((m) => (m._id === updated._id ? updated : m)),
  //       );
  //     }
  //   } catch (error) {
  //     Alert.alert(t("common.error") || "Error", t("medication.updateError"));
  //   }
  // };

  const deleteMedication = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/medications/${id}`, { method: "DELETE" });
      await cancelMedicationNotifications(id);
      if (dashboardMode === "personal") {
        setMedications((prev) => prev.filter((m) => m._id !== id));
      } else {
        setDependentsMeds((prev) => prev.filter((m) => m._id !== id));
      }
    } catch (error) {
      Alert.alert(t("common.error") || "Error", t("medication.deleteError"));
    }
  };

  const goToDetail = (med: any) => {
    navigation.navigate("MedicationDetailScreen", {
      med,
      onUpdate: (updatedMed: any) => {
        if (!updatedMed) {
          if (dashboardMode === "personal") {
            setMedications((prev) => prev.filter((m) => m._id !== med._id));
          } else {
            setDependentsMeds((prev) => prev.filter((m) => m._id !== med._id));
          }
        } else {
          if (dashboardMode === "personal") {
            setMedications((prev) =>
              prev.map((m) => (m._id === updatedMed._id ? updatedMed : m)),
            );
          } else {
            setDependentsMeds((prev) =>
              prev.map((m) => (m._id === updatedMed._id ? updatedMed : m)),
            );
          }
        }
      },
    });
  };

  const toggleDashboard = async () => {
    if (!isCaregiver) return; // 🚫 block non-caregiver users

    const newMode = dashboardMode === "personal" ? "caregiver" : "personal";
    setDashboardMode(newMode);
    await AsyncStorage.setItem("dashboardMode", newMode);
    fetchUserData();
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const getCurrentScheduledDose = (med) => {
    const now = new Date();

    // Find a dose within +/- 30 minutes of current time
    const currentDose = med.doseLogs.find((log) => {
      const sched = new Date(log.scheduledAt).getTime();
      const diff = now.getTime() - sched;
      return diff >= 0 && diff <= 30 * 60 * 1000;
    });

    return currentDose || null;
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" }}
    >
      <ScrollView
        style={{ flex: 1, padding: 20 }}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate("ProfileEditScreen")}
          >
            <Image
              source={{
                uri:
                  user?.profileImage ||
                  "https://cdn-icons-png.flaticon.com/512/147/147144.png",
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.helloText}>
              {t("common.hello")}, {user?.name}
            </Text>
            <Text style={styles.welcomeText}>{t("common.welcomeBack")}</Text>

            {/* ✅ DASHBOARD SWITCH */}
            {isCaregiver && (
              <TouchableOpacity onPress={toggleDashboard}>
                <Text style={{ color: "#007AFF", fontSize: 13, marginTop: 4 }}>
                  {dashboardMode === "personal"
                    ? "Open Caregiver Dashboard"
                    : "Open Personal Dashboard"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={openDrawer}>
            <Ionicons
              name="menu-outline"
              size={26}
              color={darkMode ? "#fff" : "#000"}
            />
          </TouchableOpacity>
        </View>

        {/* CAREGIVER LABEL */}
        {dashboardMode === "caregiver" && (
          <View style={styles.caregiverBadge}>
            <Text style={{ fontWeight: "700" }}>Dependents’ Medication</Text>
          </View>
        )}

        {/* TABS */}
        <View style={styles.tabs}>
          {[
            { key: "all", label: t("home.all"), count: totalCount },
            { key: "taken", label: t("home.taken"), count: takenCount },
            { key: "missed", label: t("home.missed"), count: missedCount },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              style={[
                styles.tabButton,
                {
                  backgroundColor: selectedTab === tab.key ? "#007AFF" : "#eee",
                },
              ]}
            >
              <Text
                style={{ color: selectedTab === tab.key ? "#fff" : "#000" }}
              >
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MEDICATION LIST */}
        {filteredMeds.map((med) => (
          <Swipeable
            key={med._id}
            renderRightActions={() => (
              <TouchableOpacity
                onPress={() => deleteMedication(med._id)}
                style={styles.deleteBox}
              >
                <Ionicons name="trash" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          >
            <TouchableOpacity
              style={styles.savedMedContainer}
              onPress={() => goToDetail(med)}
            >
              {dashboardMode === "caregiver" && (
                <Text style={styles.dependentName}>{med.dependentName}</Text>
              )}
              <Text style={styles.medName}>{med.name}</Text>
              <Text>{med.dose}</Text>
              <Text>{med.schedule.repeat}</Text>

              {(() => {
                const currentDose = getCurrentScheduledDose(med);
                return currentDose?.status === "missed" ? (
                  <Text style={styles.missed}>MISSED</Text>
                ) : null;
              })()}

              {/* CURRENT PENDING DOSE BUTTON */}
              {(() => {
                const currentDose = getCurrentScheduledDose(med);

                let disableButton = false;
                let buttonLabel = t("home.take");

                if (currentDose) {
                  const sched = new Date(currentDose.scheduledAt).getTime();
                  const diffMins = (new Date().getTime() - sched) / 60000;

                  if (currentDose.takenAt) {
                    disableButton = true;
                    buttonLabel = t("home.taken");
                  }
                }

                return (
                  <TouchableOpacity
                    style={[
                      styles.takeButton,
                      disableButton && { opacity: 0.5 },
                    ]}
                    disabled={disableButton}
                    onPress={async () => {
                      if (!currentDose) return;

                      try {
                        const res = await fetch(
                          `${API_BASE}/api/medications/dose-log/${med._id}/${currentDose._id}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "taken" }),
                          },
                        );

                        const updatedMed = await res.json();
                        setMedications((prev) =>
                          prev.map((m) =>
                            m._id === updatedMed._id ? updatedMed : m,
                          ),
                        );
                      } catch (error) {
                        Alert.alert(
                          t("common.error") || "Error",
                          t("medication.updateError"),
                        );
                      }
                    }}
                  >
                    <Text style={{ color: "#fff" }}>{buttonLabel}</Text>
                  </TouchableOpacity>
                );
              })()}
            </TouchableOpacity>
          </Swipeable>
        ))}

        {/* ADD BUTTON */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("ScanPrescriptionScreen")}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>{t("home.addMedication")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 70, height: 70, borderRadius: 35, marginRight: 15 },
  helloText: { fontSize: 18, fontWeight: "700" },
  welcomeText: { fontSize: 14, color: "gray" },

  caregiverBadge: {
    backgroundColor: "#FADDDD",
    padding: 10,
    borderRadius: 20,
    marginVertical: 10,
  },

  tabs: {
    flexDirection: "row",
    marginVertical: 20,
    justifyContent: "space-between",
  },
  tabButton: { padding: 10, borderRadius: 10 },

  savedMedContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  dependentName: {
    color: "#FF6B6B",
    fontWeight: "700",
    marginBottom: 4,
  },

  medName: { fontSize: 18, fontWeight: "bold" },

  takeButton: {
    backgroundColor: "#34C759",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },

  missed: { fontWeight: "bold", color: "red", marginVertical: 4 },

  deleteBox: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },

  addButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 20,
  },

  addButtonText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
});
