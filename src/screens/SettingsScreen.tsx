import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { API_BASE } from "../../api";
import EventBus from "../utils/EventBus";
import { containsUrdu } from "../utils/textUtils";
import { Ionicons } from '@expo/vector-icons';
const CAREGIVER_KEY = "isCaregiver";

const SettingsScreen = () => {
    
const { theme, toggleTheme, applyTheme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const { t } = useTranslation();

  const [caregiverEnabled, setCaregiverEnabled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
    const [isDependent, setIsDependent] = useState(false);
const navigation = useNavigation<any>();
  /** Load user + caregiver mode */
 const loadData = useCallback(async () => {
  try {
    const userData = await AsyncStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));

    const caregiver = await AsyncStorage.getItem(CAREGIVER_KEY);

    if (caregiver === null) {
      // First app launch → OFF
      setCaregiverEnabled(false);
      await AsyncStorage.setItem(CAREGIVER_KEY, JSON.stringify(false));
    } else {
      setCaregiverEnabled(JSON.parse(caregiver));
    }
  } catch (err) {
    console.error("Error loading settings:", err);
    setCaregiverEnabled(false); // fallback to OFF
  }
}, []);


  useEffect(() => {
    loadData();

    const userHandler = (u: any) => setUser(u);
    EventBus.on("userUpdated", userHandler);

    const langHandler = () => setCurrentLanguage(i18n.language);
    i18n.on("languageChanged", langHandler);

    return () => {
      EventBus.off("userUpdated", userHandler);
      i18n.off("languageChanged", langHandler);
    };
  }, [loadData]);
  useEffect(() => {
  if (!user?._id) return;

  const checkThemeApproval = async () => {
    const res = await fetch(`${API_BASE}/api/caregiver/my-theme-requests/${user._id}`);
    const data = await res.json();
    const approved = data.find((r: any) => r.status === "approved");
    if (approved) applyTheme(approved.requestedTheme);
  };

  checkThemeApproval();
}, [user]);

  const toggleCaregiver = async () => {
  const newValue = !caregiverEnabled;
  setCaregiverEnabled(newValue);
  await AsyncStorage.setItem(CAREGIVER_KEY, JSON.stringify(newValue));

  if (!newValue) return;

  try {
    const storedUser = await AsyncStorage.getItem("user");
    if (!storedUser) {
      console.log("No user in storage");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (!parsedUser?._id) {
      console.log("User ID missing");
      return;
    }

    console.log("Creating caregiver for:", parsedUser._id);

    const res = await fetch(`${API_BASE}/api/caregiver/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parsedUser._id }),
    });

    const data = await res.json();
    console.log("Caregiver API response:", data);

  } catch (err) {
    console.error("Caregiver creation failed:", err);
  }
};
const toggleThemeWithApproval = async () => {
  if (!user?._id) {
    console.log("User not loaded");
    return;
  }

  const newTheme = theme === "light" ? "dark" : "light";

  try {
    const res = await fetch(`${API_BASE}/api/caregiver/is-dependent/${user._id}`);
    const data = await res.json();

    setIsDependent(data.isDependent); // ✅ ADD THIS

    if (data.isDependent) {
      await fetch(`${API_BASE}/api/caregiver/request-theme`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, theme: newTheme }),
      });
      alert("Theme change request sent to caregiver");
    } else {
      toggleTheme();
    }
  } catch (err) {
    console.error("Theme toggle failed:", err);
  }
};



  return (
    
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" },
      ]}
      contentContainerStyle={{ paddingBottom: 40 }}
    ><SafeAreaView>
      {/* Caregiver Banner */}
      {caregiverEnabled && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {t("settings.caregiverEnabled") || "Account changed to Caregiver!"}
          </Text>
          <Text style={styles.bannerText}>
            {t("settings.caregiverDesc") ||
              "You can now add dependents and manage their medications."}
          </Text>
        </View>
      )}

      {/* Profile Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.name,
            (currentLanguage === "ur" ||
              (user?.name && containsUrdu(user.name))) &&
              styles.urduText,
            { color: darkMode ? "#fff" : "#000" },
          ]}
        >
          {t("common.hello")}, {user?.name}
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("ProfileEditScreen")}
        >
          <Text style={styles.link}>{t("common.editProfile")}</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
<TouchableOpacity
  style={[
    styles.logoutButton,
    { backgroundColor: darkMode ? "#7F1D1D" : "#FEE2E2" },
  ]}
  onPress={async () => {
    try {
      await AsyncStorage.removeItem("user");
      navigation.navigate("OnboardingScreen");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }}
>
  <Ionicons
    name="log-out-outline"
    size={22}
    color={darkMode ? "#FCA5A5" : "#EF4444"}
    style={{ marginRight: 8 }}
  />
  <Text
    style={{
      color: darkMode ? "#FCA5A5" : "#EF4444",
      fontWeight: "600",
      fontSize: 16,
    }}
  >
    {t("common.logout")}
  </Text>
</TouchableOpacity>


      {/* Reminders & Alarm */}
      <View style={styles.section}>
        <Text style={[styles.title, { color: darkMode ? "#fff" : "#000" }]}>
          {t("settings.reminders")}
        </Text>

        <TouchableOpacity style={styles.card}>
          <Text style={{ color: darkMode ? "#fff" : "#000" }}>
            {t("settings.notificationSettings")}
          </Text>
          <Text style={styles.subText}>
            {t("settings.notificationDesc")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Text style={{ color: darkMode ? "#fff" : "#000" }}>
            {t("settings.reminderPreferences")}
          </Text>
          <Text style={styles.subText}>
            {t("settings.reminderDesc")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* General */}
      <View style={styles.section}>
        <Text style={[styles.title, { color: darkMode ? "#fff" : "#000" }]}>
          {t("settings.general")}
        </Text>

        <TouchableOpacity style={styles.card}>
          <Text style={{ color: darkMode ? "#fff" : "#000" }}>
            {t("settings.language")}
          </Text>
          <Text style={styles.subText}>
            {t("settings.languageDesc")}
          </Text>
        </TouchableOpacity>
<View style={styles.cardRow}>
  <Text style={{ color: darkMode ? "#fff" : "#000" }}>
    Dark Mode
  </Text>

  <Switch
  value={darkMode}
  onValueChange={
    caregiverEnabled
      ? toggleThemeWithApproval // dependent request
      : toggleTheme            // normal user
  }
  disabled={caregiverEnabled && isDependent} // optional: prevent flicker
/>
</View>
        <TouchableOpacity style={styles.card}>
          <Text style={{ color: darkMode ? "#fff" : "#000" }}>
            {t("settings.appearance")}
          </Text>
          <Text style={styles.subText}>
            {t("settings.appearanceDesc")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Caregiver Account */}
      <View style={styles.section}>
        <Text style={[styles.title, { color: darkMode ? "#fff" : "#000" }]}>
          {t("settings.caregiverAccount")}
        </Text>

        <View style={styles.cardRow}>
          <Text style={{ color: darkMode ? "#fff" : "#000" }}>
            {t("settings.caregiverAccount")}
          </Text>
          <Switch value={caregiverEnabled} onValueChange={toggleCaregiver} />
        </View>

        {caregiverEnabled && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("AddDependentsScreen")}
          >
            <Text style={styles.primaryText}>
              {t("settings.addDependents")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  section: { marginBottom: 25 },

  name: { fontSize: 20, fontWeight: "700" },
  urduText: { writingDirection: "rtl", textAlign: "right" },

  link: { color: "#007AFF", marginTop: 5 },

  title: { fontSize: 16, fontWeight: "600", marginBottom: 10 },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },

  subText: {
    color: "#8E8E93",
    marginTop: 5,
    fontSize: 12,
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
  },

  primaryButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600" },

  banner: {
    backgroundColor: "#FDE2E2",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  bannerTitle: { fontWeight: "700", color: "#C62828" },
  bannerText: { fontSize: 12, color: "#C62828", marginTop: 5 },
  logoutButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  borderRadius: 12,
  marginBottom: 10,
}

});
