import React, { useEffect, useState, useMemo } from "react";
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
import i18n, { changeLanguage } from "../i18n";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE } from "../../api";
import { containsUrdu, getTextDirection } from "../utils/textUtils";

const HomeScreen = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<any[]>([]);
  const navigation = useNavigation<any>();
  const [selectedTab, setSelectedTab] = useState("all");
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // ================= WEEK ================= 

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(
    getStartOfWeek(new Date())
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

  // ================= Language Switcher =================
  const handleLanguageChange = async () => {
    const newLang = currentLanguage === "en" ? "ur" : "en";
    await changeLanguage(newLang);
    setCurrentLanguage(newLang);
  };

  const getWeekDates = (startDate: Date) => {
    return Array.from({ length: 7 }, (_, i) => {
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + i);
      return newDate;
    });
  };

  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart),
    [currentWeekStart]
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

  // ================= Fetching users and meds ================= 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (!userData) return;

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        const response = await fetch(
          `${API_BASE}/api/medications/${parsedUser._id}`
        );

        const meds = await response.json();
        setMedications(Array.isArray(meds) ? meds : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ================= Status ================= 

  const totalCount = medications.length;
  const takenCount = medications.filter(
    (m) => m.status === "taken"
  ).length;
  const missedCount = medications.filter(
    (m) => m.status === "missed"
  ).length;

  // ================= Auto mark missed ================= 

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

  // Update language state when i18n language changes
  useEffect(() => {
    const updateLanguage = () => {
      setCurrentLanguage(i18n.language);
    };
    i18n.on("languageChanged", updateLanguage);
    return () => {
      i18n.off("languageChanged", updateLanguage);
    };
  }, []);


  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/medications/update-status/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const updated = await res.json();

      setMedications((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m))
      );
    } catch (error) {
      Alert.alert(t("common.error") || "Error", t("medication.updateError"));
    }
  };


  const deleteMedication = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/medications/${id}`, {
        method: "DELETE",
      });

      setMedications((prev) => prev.filter((m) => m._id !== id));
    } catch (error) {
      Alert.alert(t("common.error") || "Error", t("medication.deleteError"));
    }
  };


  const handleChangeProfileImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      const updatedUser = { ...user, profileImage: uri };
      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
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
      if(!updatedMed)
      {
        setMedications((prev)=>prev.filter((m)=>m._id!==med._id));
      }
      else{
        setMedications((prev) =>
        prev.map((m) => (m._id === updatedMed._id ? updatedMed : m))
      );
      }
      
    },
  });
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FF" }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
<View style={styles.header}>
  <TouchableOpacity onPress={handleChangeProfileImage}>
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
    <Text 
      style={[
        styles.helloText,
        (currentLanguage === 'ur' || (user?.name && containsUrdu(user.name))) && styles.urduText
      ]}
    >
      {t("common.hello")}, {user?.name}
    </Text>
    <Text style={styles.welcomeText}>{t("common.welcomeBack")}</Text>
  </View>

  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
    <TouchableOpacity
      onPress={handleLanguageChange}
      style={styles.languageButton}
    >
      <Ionicons name="language" size={24} color="#007AFF" />
      <Text style={styles.languageText}>
        {currentLanguage === "en" ? "اردو" : "EN"}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() =>
        Alert.alert(
          t("home.logoutConfirm"),
          t("home.logoutMessage"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.yes"),
              onPress: async () => {
                await AsyncStorage.removeItem("user");
                navigation.reset({
                  index: 0,
                  routes: [{ name: "OnboardingScreen" }],
                });
              },
              style: "destructive",
            },
          ]
        )
      }
    >
      <Ionicons name="log-out-outline" size={28} color="#007AFF" />
    </TouchableOpacity>
  </View>
</View>

      <Text style={styles.todayText}>
        {t("common.today")}, {new Date().toDateString()}
      </Text>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={goToPrevWeek}>
          <Ionicons name="chevron-back" size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextWeek}>
          <Ionicons name="chevron-forward" size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarRow}>
        {weekDates.map((date, index) => {
          const selected =
            date.toDateString() === selectedDate.toDateString();

          return (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dayContainer,
                selected && styles.selectedDay,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  selected && styles.selectedDayText,
                ]}
              >
                {days[index]}
              </Text>
              <Text
                style={[
                  styles.dateText,
                  selected && styles.selectedDayText,
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
              selectedTab === tab.key && styles.activeTab,
            ]}
          >
            <Text
              style={
                selectedTab === tab.key
                  ? styles.activeTabText
                  : styles.tabText
              }
            >
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
      onPress={() =>
        goToDetail(med) }>
      
    
      <Text style={styles.medName}>{med.name}</Text>
      <Text>{med.dose}</Text>
      <Text>{med.frequency}</Text>

      {med.status === "missed" && (
        <Text style={styles.missed}>{t("home.missed").toUpperCase()}</Text>
      )}

      {med.status !== "taken" && (
        <TouchableOpacity
          style={styles.takeButton}
          onPress={() => updateStatus(med._id, "taken")}
        >
          <Text style={{ color: "#fff" }}>{t("home.take")}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  </Swipeable>
))}


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
  container: { flex: 1, backgroundColor: "#F6F8FF", padding: 20 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 70, height: 70, borderRadius: 35, marginRight: 15 },
  helloText: { fontSize: 22, fontWeight: "700" },
  urduText: { 
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  welcomeText: { fontSize: 16, color: "gray" },
  todayText: { fontSize: 18, marginTop: 20 },

  weekNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },

  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  dayContainer: {
    padding: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  selectedDay: {
    borderWidth: 1,
    borderColor: "#007AFF",
  },

  dayText: { color: "gray" },
  dateText: { fontWeight: "bold" },

  selectedDayText: { color: "#007AFF" },

  tabs: {
    flexDirection: "row",
    marginVertical: 20,
    justifyContent: "space-between",
  },

  tabButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#eee",
  },

  activeTab: {
    backgroundColor: "#007AFF",
  },

  tabText: { color: "#333" },
  activeTabText: { color: "#fff" },

  savedMedContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  medName: { fontSize: 18, fontWeight: "bold" },

  takeButton: {
    backgroundColor: "#34C759",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },

  missed: {
    color: "red",
    fontWeight: "bold",
    marginVertical: 4,
  },

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

  addButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  languageText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
  },
});
