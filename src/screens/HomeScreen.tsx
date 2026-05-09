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
import DefaultPFP from "../assets/default-pfp.png";
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
  const { theme, applyTheme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const [selectedDependent, setSelectedDependent] = useState("all");

  const navigation = useNavigation<any>();
  const [requestCount, setRequestCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [medications, setMedications] = useState<any[]>([]);
  const [dependentsMeds, setDependentsMeds] = useState<any[]>([]);
  const [allDependents, setAllDependents] = useState<any[]>([]);
  const dependentList = useMemo(() => {
    const names = allDependents.map((d) => d.name);
    return ["all", ...new Set(names)];
  }, [allDependents]);
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

  function getClosestLog(doseLogs) {
    const now = new Date();

    return doseLogs.reduce((closest, current) => {
      const currentDiff = Math.abs(new Date(current.scheduledAt) - now);
      const closestDiff = Math.abs(new Date(closest.scheduledAt) - now);

      return currentDiff < closestDiff ? current : closest;
    });
  }

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

      // DEPENDENT
      try {
        const depRes = await fetch(
          `${API_BASE}/api/caregiver/is-dependent/${parsedUser._id}`,
        );
        const depData = await depRes.json();

        if (depData.isDependent) {
          const themeReqRes = await fetch(
            `${API_BASE}/api/caregiver/my-theme-requests/${parsedUser._id}`,
          );

          const approvedRequests = await themeReqRes.json();

          if (approvedRequests.length > 0) {
            const latest = approvedRequests[0];

            if (
              latest.status !== "applied" &&
              latest.requestedTheme !== theme
            ) {
              applyTheme(latest.requestedTheme);

              await fetch(`${API_BASE}/api/caregiver/mark-theme-applied`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: latest._id }),
              });

              Alert.alert(
                "Theme Updated",
                `Your caregiver approved your theme change request`,
              );
            }
          }
        }
      } catch (err) {
        console.log("Theme logic error:", err);
      }

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

      if (caregiverData.isCaregiver) {
        const depListRes = await fetch(
          `${API_BASE}/api/caregiver/${parsedUser._id}/dependents`,
        );
        const fullDepList = await depListRes.json();
        setAllDependents(Array.isArray(fullDepList) ? fullDepList : []);
        const medRes = await fetch(
          `${API_BASE}/api/medications/requests/${parsedUser._id}`,
        );
        const medRequests = await medRes.json();

        const themeRes = await fetch(
          `${API_BASE}/api/caregiver/theme-requests/${parsedUser._id}`,
        );
        const themeRequests = await themeRes.json();

        setRequestCount(medRequests.length + themeRequests.length);
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
    dashboardMode === "personal"
      ? medications
      : dependentsMeds.filter((med) =>
          selectedDependent === "all"
            ? true
            : med.dependentName === selectedDependent,
        );

  const totalCount = medsToShow.length;
  const takenCount = medsToShow.filter((med) => {
    const closest = getClosestLog(med.doseLogs);
    return closest?.status === "taken";
  }).length;

  const missedCount = medsToShow.filter((med) => {
    const closest = getClosestLog(med.doseLogs);
    return closest?.status === "missed";
  }).length;

  const filteredMeds = medsToShow.filter((med) => {
    if (!med.doseLogs?.length) return false;

    const closest = getClosestLog(med.doseLogs);

    if (!closest) return false;

    if (selectedTab === "taken") {
      return closest.status === "taken";
    }

    if (selectedTab === "missed") {
      return closest.status === "missed";
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
    Alert.alert(
      "Delete Medication",
      "Are you sure you want to delete this medication?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(
                `${API_BASE}/api/caregiver/is-dependent/${user._id}`,
              );
              const data = await res.json();
              if (data.isDependent) {
                await fetch(`${API_BASE}/api/medications/request-delete`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ medicationId: id, userId: user._id }),
                });
                Alert.alert(
                  "Request Sent",
                  "Your caregiver will be notified to approve this deletion.",
                );
              } else {
                await fetch(`${API_BASE}/api/medications/${id}`, {
                  method: "DELETE",
                });
                await cancelMedicationNotifications(id);
                if (dashboardMode === "personal") {
                  setMedications((prev) => prev.filter((m) => m._id !== id));
                } else {
                  setDependentsMeds((prev) => prev.filter((m) => m._id !== id));
                }
              }
            } catch (err) {
              Alert.alert("Error", "Delete failed. Please try again.");
            }
          },
        },
      ],
    );
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
    if (!isCaregiver) return; // block non-caregiver users

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
                uri: user?.profileImage
                  ? user.profileImage.startsWith("/") ||
                    user.profileImage.startsWith("uploads")
                    ? `${API_BASE}${user.profileImage}`
                    : user.profileImage
                  : Image.resolveAssetSource(DefaultPFP).uri,
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.helloText}>
              {t("common.hello")}, {user?.name}
            </Text>
            <Text style={styles.welcomeText}>{t("common.welcomeBack")}</Text>

            {/* DASHBOARD SWITCH */}
            {isCaregiver && (
              <>
                <TouchableOpacity onPress={toggleDashboard}>
                  <Text
                    style={{ color: "#007AFF", fontSize: 13, marginTop: 4 }}
                  >
                    {dashboardMode === "personal"
                      ? "Open Caregiver Dashboard"
                      : "Open Personal Dashboard"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate("CaregiverRequestsScreen")}
                  style={{ marginTop: 6 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="notifications-outline"
                      size={22}
                      color="#007AFF"
                    />

                    {requestCount > 0 && (
                      <View
                        style={{
                          marginLeft: 6,
                          backgroundColor: "red",
                          borderRadius: 10,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 11 }}>
                          {requestCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </>
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
            <Text style={{ fontWeight: "700", marginBottom: 8, color: "#fff" }}>
              Dependents’ Medication
            </Text>

            {/* DEPENDENTS DROPDOWN */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dependentList.map((dep, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedDependent(dep)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor:
                      selectedDependent === dep ? "#007AFF" : "#eee",
                    borderRadius: 10,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: selectedDependent === dep ? "#fff" : "#000",
                    }}
                  >
                    {dep === "all" ? "All" : dep}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
          <View key={med._id} style={styles.medItemWrapper}>
            <Swipeable
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
          </View>
        ))}

        {/* ADD BUTTON */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (dashboardMode === "caregiver") {
              if (selectedDependent === "all") {
                Alert.alert(
                  "Select a Dependent",
                  "Please select a specific dependent from the filter above before adding a medication",
                );
                return;
              }
              const target = allDependents.find(
                (d) => d.name === selectedDependent,
              );
              if (!target) {
                Alert.alert("Error", "Could not find dependent information.");
                return;
              }

              navigation.navigate("ScanPrescriptionScreen", {
                forDependentId: target._id,
                forDependentName: selectedDependent,
              });
            } else {
              navigation.navigate("ScanPrescriptionScreen");
            }
          }}
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
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
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
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  medItemWrapper: {
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
    backgroundColor: "#C62828",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 15,
    marginLeft: 10,
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
