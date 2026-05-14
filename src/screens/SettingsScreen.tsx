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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { API_BASE } from "../../api";
import EventBus from "../utils/EventBus";
import { containsUrdu } from "../utils/textUtils";
import { Ionicons } from "@expo/vector-icons";
import { SettingsContext } from "../context/SettingsContext";
const CAREGIVER_KEY = "isCaregiver";

const SettingsScreen = () => {
  const { theme, toggleTheme, applyTheme } = useContext(ThemeContext);
  const {
    voiceReminderEnabled,
    toggleVoiceReminder,
    voiceReminderLanguage,
    setVoiceReminderLanguage,
  } = useContext(SettingsContext);
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const darkMode = theme === "dark";
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<any>(null);
  const [caregiverEnabled, setCaregiverEnabled] = useState(false);
  const [isDependent, setIsDependent] = useState(false);
  const [hasDependents, setHasDependents] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  /** Load user + caregiver mode */
  // const loadData = useCallback(async () => {
  //   try {
  //     const userData = await AsyncStorage.getItem("user");
  //     if (!userData) return;
  //     const parsedUser = JSON.parse(userData);
  //     setUser(parsedUser);

  //     const caregiver = await AsyncStorage.getItem(CAREGIVER_KEY);
  //     if (caregiver === null) {
  //       setCaregiverEnabled(false);
  //       await AsyncStorage.setItem(CAREGIVER_KEY, JSON.stringify(false));
  //     } else {
  //       setCaregiverEnabled(JSON.parse(caregiver));
  //     }

  //     const depRes = await fetch(
  //       `${API_BASE}/api/caregiver/is-dependent/${parsedUser._id}`,
  //     );
  //     const depData = await depRes.json();
  //     setIsDependent(depData.isDependent);

  //     // Fetch approved theme requests (if dependent)
  //     if (depData.isDependent) {
  //       const themeRes = await fetch(
  //         `${API_BASE}/api/caregiver/my-theme-requests/${parsedUser._id}`,
  //       );
  //       const themeRequests = await themeRes.json();
  //       const approved = themeRequests.find(
  //         (r: any) => r.status === "approved",
  //       );
  //       if (approved) applyTheme(approved.requestedTheme);
  //     }
  //   } catch (err) {
  //     console.error("Error loading settings:", err);
  //     setCaregiverEnabled(false);
  //   }
  // }, []);

  // useEffect(() => {
  //   loadData();

  //   const userHandler = (u: any) => setUser(u);
  //   EventBus.on("userUpdated", userHandler);

  //   const langHandler = () => setCurrentLanguage(i18n.language);
  //   i18n.on("languageChanged", langHandler);

  //   return () => {
  //     EventBus.off("userUpdated", userHandler);
  //     i18n.off("languageChanged", langHandler);
  //   };
  // }, [loadData]);

  const loadCaregiverState = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) return;
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // 1. Check if user is caregiver
      const caregiverRes = await fetch(
        `${API_BASE}/api/caregiver/${parsedUser._id}/is-caregiver`,
      );
      const caregiverData = await caregiverRes.json();
      const isCaregiver = caregiverData.isCaregiver;
      setCaregiverEnabled(isCaregiver);

      // 2. If caregiver, check if they have dependents
      let hasDependents = false;
      if (isCaregiver) {
        const dependentsRes = await fetch(
          `${API_BASE}/api/caregiver/${parsedUser._id}/dependents`,
        );
        const dependents = await dependentsRes.json();
        hasDependents = dependents.length > 0;
        setHasDependents(hasDependents);
      }

      // Store caregiver toggle in AsyncStorage
      await AsyncStorage.setItem(CAREGIVER_KEY, JSON.stringify(isCaregiver));

      // 3. Check if user is dependent
      const dependentRes = await fetch(
        `${API_BASE}/api/caregiver/is-dependent/${parsedUser._id}`,
      );
      const dependentData = await dependentRes.json();
      setIsDependent(dependentData.isDependent);

      // 4. If dependent, fetch approved theme requests and apply theme
      if (dependentData.isDependent) {
        const themeRes = await fetch(
          `${API_BASE}/api/caregiver/my-theme-requests/${parsedUser._id}`,
        );
        const themeRequests = await themeRes.json();
        const approved = themeRequests.find(
          (r: any) => r.status === "approved",
        );
        if (approved) applyTheme(approved.requestedTheme);
      }
    } catch (err) {
      console.error("Failed to load caregiver state", err);
    }
  }, [applyTheme]);

  useEffect(() => {
    loadCaregiverState();

    const userHandler = (u: any) => setUser(u);
    EventBus.on("userUpdated", userHandler);

    const langHandler = () => setCurrentLanguage(i18n.language);
    i18n.on("languageChanged", langHandler);

    return () => {
      EventBus.off("userUpdated", userHandler);
      i18n.off("languageChanged", langHandler);
    };
  }, [loadCaregiverState]);

  const toggleCaregiver = async () => {
    // If user is caregiver with dependents, prevent toggle
    if (caregiverEnabled && hasDependents) {
      console.log("Cannot change caregiver status: dependents exist");
      return;
    }

    const newValue = !caregiverEnabled;
    setCaregiverEnabled(newValue);
    await AsyncStorage.setItem(CAREGIVER_KEY, JSON.stringify(newValue));
    if (!newValue) return;

    // Only create caregiver if user is not already a caregiver
    if (!caregiverEnabled) {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) return;
        const parsedUser = JSON.parse(storedUser);

        if (!parsedUser?._id) return;

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
    }
  };

  const toggleThemeWithApproval = async () => {
    if (!user?._id) {
      console.log("User not loaded");
      return;
    }

    const newTheme = theme === "light" ? "dark" : "light";

    try {
      if (isDependent) {
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
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF",
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
          paddingTop: insets.top + 10,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={darkMode ? "#fff" : "#000"}
          />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: darkMode ? "#fff" : "#000",
          }}
        >
          Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={[
          styles.container,
          { backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" },
        ]}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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

          {/* Logout Moved to Top */}
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: darkMode ? "#450A0A" : "#FEE2E2",
                marginTop: 15,
              },
            ]}
            onPress={async () => {
              try {
                await AsyncStorage.removeItem("user");
              EventBus.emit("userUpdated", null);
                navigation.navigate("OnboardingScreen");
              } catch (err) {
                console.error("Logout failed:", err);
              }
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={darkMode ? "#F87171" : "#DC2626"}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: darkMode ? "#F87171" : "#DC2626",
                fontWeight: "700",
                fontSize: 15,
              }}
            >
              {t("common.logout")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* General */}
        <View style={styles.section}>
          <Text style={[styles.title, { color: darkMode ? "#fff" : "#000" }]}>
            {t("settings.general")}
          </Text>

          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: darkMode ? "#1E1E1E" : "#fff" },
            ]}
            onPress={async () => {
              const current = i18n.language || "en";
              const next = current === "en" ? "ur" : "en";
              await i18n.changeLanguage(next);
              setCurrentLanguage(next);
            }}
          >
            <Text
              style={{ color: darkMode ? "#fff" : "#000", fontWeight: "600" }}
            >
              {t("settings.language")} (
              {(currentLanguage || "en").toUpperCase()})
            </Text>
            <Text style={styles.subText}>{t("settings.languageDesc")}</Text>
          </TouchableOpacity>

          <View
            style={[
              styles.cardRow,
              { backgroundColor: darkMode ? "#1E1E1E" : "#fff" },
            ]}
          >
            <Text
              style={{ color: darkMode ? "#fff" : "#000", fontWeight: "600" }}
            >
              Dark Mode
            </Text>

            <Switch
              value={darkMode}
              onValueChange={toggleThemeWithApproval}
              trackColor={{
                false: darkMode ? "#3A3A3C" : "#D1D1D6",
                true: "#3B5BFF",
              }}
              thumbColor="#fff"
              ios_backgroundColor={darkMode ? "#3A3A3C" : "#D1D1D6"}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: darkMode ? "#1E1E1E" : "#fff" },
            ]}
          >
            <Text
              style={{ color: darkMode ? "#fff" : "#000", fontWeight: "600" }}
            >
              {t("settings.appearance")}
            </Text>
            <Text style={styles.subText}>{t("settings.appearanceDesc")}</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders & Alarm */}
        <View style={styles.section}>
          <Text style={[styles.title, { color: darkMode ? "#fff" : "#000" }]}>
            {t("settings.reminders")}
          </Text>

          {/* Voice Reminder Switch */}
          <View
            style={[
              styles.cardRow,
              { backgroundColor: darkMode ? "#1E1E1E" : "#fff" },
            ]}
          >
            <Text
              style={{ color: darkMode ? "#fff" : "#000", fontWeight: "600" }}
            >
              {t("settings.voiceReminders") || "Voice Reminders"}
            </Text>
            <Switch
              value={voiceReminderEnabled}
              onValueChange={toggleVoiceReminder}
              trackColor={{
                false: darkMode ? "#3A3A3C" : "#D1D1D6",
                true: "#3B5BFF",
              }}
              thumbColor="#fff"
              ios_backgroundColor={darkMode ? "#3A3A3C" : "#D1D1D6"}
            />
          </View>
          <Text style={[styles.subText, { marginBottom: 10 }]}>
            {t("settings.voiceRemindersDesc") ||
              "Enable spoken reminders for your medications."}
          </Text>

          {voiceReminderEnabled && (
            <View
              style={[
                styles.cardRow,
                { backgroundColor: darkMode ? "#1E1E1E" : "#fff" },
              ]}
            >
              <Text
                style={{ color: darkMode ? "#fff" : "#000", fontWeight: "600" }}
              >
                {t("settings.voiceLanguage") || "Voice Language"}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setVoiceReminderLanguage("en")}
                  style={[
                    styles.langToggle,
                    voiceReminderLanguage === "en" && styles.activeLangToggle,
                  ]}
                >
                  <Text
                    style={[
                      styles.langToggleText,
                      voiceReminderLanguage === "en" && styles.activeLangText,
                    ]}
                  >
                    EN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVoiceReminderLanguage("ur")}
                  style={[
                    styles.langToggle,
                    voiceReminderLanguage === "ur" && styles.activeLangToggle,
                  ]}
                >
                  <Text
                    style={[
                      styles.langToggleText,
                      voiceReminderLanguage === "ur" && styles.activeLangText,
                    ]}
                  >
                    اردو
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Caregiver Account */}
        <View style={styles.section}>
          <Text style={[styles.title, { color: darkMode ? "#fff" : "#000" }]}>
            {t("settings.caregiverAccount")}
          </Text>

          {caregiverEnabled && (
            <View style={[styles.banner, { marginBottom: 10 }]}>
              <Text style={styles.bannerTitle}>
                {t("settings.caregiverEnabled") ||
                  "Account changed to Caregiver!"}
              </Text>
              <Text style={styles.bannerText}>
                {t("settings.caregiverDesc") ||
                  "You can now add dependents and manage their medications."}
              </Text>
            </View>
          )}

          {(() => {
            const isCaregiverDisabled =
              (caregiverEnabled && hasDependents) || isDependent;
            return (
              <View
                style={[
                  styles.cardRow,
                  {
                    backgroundColor: darkMode ? "#1E1E1E" : "#fff",
                    opacity: isCaregiverDisabled ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: darkMode ? "#fff" : "#000",
                    fontWeight: "600",
                  }}
                >
                  {t("settings.caregiverAccount")}
                </Text>
                <Switch
                  value={caregiverEnabled}
                  onValueChange={toggleCaregiver}
                  disabled={isCaregiverDisabled}
                  trackColor={{
                    false: darkMode ? "#3A3A3C" : "#D1D1D6",
                    true: "#3B5BFF",
                  }}
                  thumbColor={isCaregiverDisabled ? "#aaa" : "#fff"}
                  ios_backgroundColor={darkMode ? "#3A3A3C" : "#D1D1D6"}
                />
              </View>
            );
          })()}

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
      </ScrollView>
    </SafeAreaView>
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
    borderWidth: 1,
    borderColor: "#E8E8E8",
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
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 10,
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
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: "#F9F9F9",
  },
  activeLangToggle: {
    backgroundColor: "#3B5BFF",
    borderColor: "#3B5BFF",
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  activeLangText: {
    color: "#fff",
  },
});
