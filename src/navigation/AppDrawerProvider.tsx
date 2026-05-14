import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  PanResponder,
  Switch,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { navigateSafe } from "./navigationRef";
import i18n, { changeLanguage } from "../i18n";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "../context/ThemeContext";
import { navigationRef } from "./navigationRef";
import EventBus from "../utils/EventBus";
import { useNavigation } from "@react-navigation/native";
import { API_BASE } from "../../api";
import DefaultPFP from "../assets/default-pfp.png";

type DrawerContextType = {
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const useDrawer = () => {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within AppDrawerProvider");
  return ctx;
};

export const AppDrawerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const { theme, toggleTheme, applyTheme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");
  const screenWidth = Dimensions.get("window").width;
  const drawerWidth = useMemo(
    () => Math.min(screenWidth * 0.9, 380),
    [screenWidth],
  );
  const translateX = useRef(new Animated.Value(drawerWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [user, setUser] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [isDependent, setIsDependent] = useState(false);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : drawerWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, drawerWidth, translateX, overlayOpacity]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setUserName(parsed?.name || parsed?.email || "");
        }
      } catch {}
    };
    loadUser();

    // Listens for profile updates from ProfileEditScreen
    const handler = (u: any) => {
      setUser(u);
      setUserName(u?.name || u?.email || "");
    };
    EventBus.on("userUpdated", handler);
    return () => EventBus.removeListener("userUpdated", handler);
  }, []);
  useEffect(() => {
    if (!user?._id) return;

    const fetchMedications = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/medications/${user._id}`);
        const data = await res.json();
        setMedications(data.medications || []);
      } catch (err) {
        console.error("Failed to fetch medications", err);
        setMedications([]);
      }
    };

    fetchMedications();
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;
    const checkDependentStatus = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/caregiver/is-dependent/${user._id}`,
        );
        const data = await res.json();
        setIsDependent(data.isDependent);
      } catch (err) {
        console.error("Failed to check dependent status", err);
      }
    };
    checkDependentStatus();
  }, [user]);

  const toggleThemeWithApproval = async () => {
    if (!user?._id) {
      toggleTheme();
      return;
    }
    const newTheme = theme === "light" ? "dark" : "light";
    try {
      if (isDependent) {
        const res = await fetch(`${API_BASE}/api/caregiver/request-theme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id, theme: newTheme }),
        });
        const data = await res.json();
        if (res.ok) {
          Alert.alert(
            t("common.success"),
            t("settings.themeRequestSent", "Theme change request sent to caregiver")
          );
        } else {
          Alert.alert(t("common.notice"), data.message || t("common.error"));
        }
      } else {
        toggleTheme();
      }
    } catch (err) {
      console.error("Theme toggle failed:", err);
      Alert.alert(t("common.error"), t("common.somethingWentWrong"));
    }
  };

  const closeDrawer = () => setIsOpen(false);
  const openDrawer = () => setIsOpen(true);
  const toggleDrawer = () => setIsOpen((prev) => !prev);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && gestureState.dx > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, drawerWidth));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > drawerWidth * 0.3 || gestureState.vx > 0.5) {
          closeDrawer();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      },
    }),
  ).current;

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      applyTheme("light");
      setUser(null);
      setUserName("");
      navigateSafe("LoginScreen");
    } catch (e) {
    } finally {
      closeDrawer();
    }
  };

  const fallbackMed = {
    _id: null,
    name: "Sample Medication",
    dose: "1 tab",
    schedule: {
      repeat: "daily",
      times: ["08:00"],
    },
    status: "pending",
    imageUri: null,
  };

  const items = [
    { label: "Dashboard", icon: "home-outline", route: "HomeScreen" },
    {
      label: "Scan Prescription",
      icon: "scan-outline",
      route: "ScanPrescriptionScreen",
    },
    {
      label: "Medications",
      icon: "medkit-outline",
      route: "ViewAllMedicines",
      params: { user },
    },
    {
      label: "View Prescriptions",
      icon: "document-text-outline",
      route: "ViewPrescriptionsScreen",
    },
    {
      label: "Adherence Tracking",
      icon: "stats-chart-outline",
      route: "Adherence",
    },
    { label: "Profile", icon: "person-outline", route: "ProfileEditScreen" },
    { label: "Settings", icon: "settings-outline", route: "SettingsScreen" },
  ];

  const dynamicStyles = StyleSheet.create({
    panel: {
      backgroundColor: darkMode ? "#1E1E1E" : "#fff",
    },
    name: {
      color: darkMode ? "#F8FAFC" : "#0f172a",
    },
    subtext: {
      color: darkMode ? "#94A3B8" : "#64748b",
    },
    itemLabel: {
      color: darkMode ? "#F8FAFC" : "#0f172a",
    },
    borderColor: {
      borderBottomColor: darkMode ? "#2D2D2D" : "#e2e8f0",
    },
    sectionTitle: {
      color: darkMode ? "#94A3B8" : "#64748b",
    },
    languageValue: {
      color: darkMode ? "#1E40AF" : "#0f172a",
    },
    avatar: {
      backgroundColor: darkMode ? "#2563EB" : "#e0e7ff",
    },
    avatarText: {
      color: "#fff",
    },
    iconWrapper: {
      backgroundColor: darkMode ? "#1E3A8A" : "#eff6ff",
    },
    languageBadge: {
      backgroundColor: darkMode ? "#1E3A8A" : "#eff6ff",
    },
    logoutButton: {
      backgroundColor: darkMode ? "#450A0A" : "#FEE2E2",
    },
    logoutText: {
      color: darkMode ? "#F87171" : "#DC2626",
    },
  });

  const currentRoute = navigationRef.isReady()
    ? navigationRef.getCurrentRoute()?.name
    : undefined;

  const authScreens = ["LoginScreen", "SignUpScreen"];

  const isAuthScreen = currentRoute
    ? authScreens.includes(currentRoute)
    : false;

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer, toggleDrawer }}>
      <View style={{ flex: 1 }}>
        {children}

        <Animated.View
          pointerEvents={isOpen ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: "rgba(0,0,0,0.35)",
              opacity: overlayOpacity,
              zIndex: 999,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.panel,
            dynamicStyles.panel,
            {
              width: drawerWidth,
              transform: [{ translateX }],
              right: 0,
              position: "absolute",
              top: 0,
              bottom: 0,
              zIndex: 1000,
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={closeDrawer}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeButtonWrapper}
              >
                <Ionicons
                  name="close"
                  size={26}
                  color={darkMode ? "#F8FAFC" : "#0f172a"}
                />
              </TouchableOpacity>
            </View>

            {!isAuthScreen && (
              <View style={[styles.profileSection, dynamicStyles.borderColor]}>
                <Image
                  source={{
                    uri: user?.profileImage
                      ? user.profileImage.startsWith("/") ||
                        user.profileImage.startsWith("uploads")
                        ? `${API_BASE}${user.profileImage}`
                        : user.profileImage
                      : Image.resolveAssetSource(DefaultPFP).uri,
                  }}
                  style={[styles.avatarImage]}
                />
                <Text style={[styles.name, dynamicStyles.name]}>
                  {userName || "Welcome"}
                </Text>
                <Text style={[styles.subtext, dynamicStyles.subtext]}>
                  Signed in
                </Text>
              </View>
            )}

            {!isAuthScreen && (
              <View style={styles.menuSection}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.item, dynamicStyles.borderColor]}
                    onPress={() => {
                      if (item.route) {
                        navigateSafe(item.route as never, (item as any).params);
                        setTimeout(() => closeDrawer(), 100);
                      } else if (item.action) {
                        item.action();
                        setTimeout(() => closeDrawer(), 100);
                      }
                    }}
                  >
                    <View style={styles.itemLeft}>
                      <View
                        style={[styles.iconWrapper, dynamicStyles.iconWrapper]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={22}
                          color={darkMode ? "#93C5FD" : "#3B5BFF"}
                        />
                      </View>
                      <Text style={[styles.itemLabel, dynamicStyles.itemLabel]}>
                        {item.label}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={darkMode ? "#475569" : "#94a3b8"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.preferencesSection}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                PREFERENCES
              </Text>

              <View style={[styles.preferenceRow, dynamicStyles.borderColor]}>
                <View style={styles.prefLeft}>
                  <View style={[styles.iconWrapper, dynamicStyles.iconWrapper]}>
                    <Ionicons
                      name="moon-outline"
                      size={22}
                      color={darkMode ? "#93C5FD" : "#3B5BFF"}
                    />
                  </View>
                  <Text style={[styles.itemLabel, dynamicStyles.itemLabel]}>
                    Dark Mode
                  </Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={toggleThemeWithApproval}
                  trackColor={{ false: "#d1d5db", true: "#3B5BFF" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                />
              </View>

              <TouchableOpacity
                style={[styles.preferenceRow, dynamicStyles.borderColor]}
                onPress={async () => {
                  const current = i18n.language || "en";
                  const next = current === "en" ? "ur" : "en";
                  await changeLanguage(next);
                  setCurrentLanguage(next);
                }}
              >
                <View style={styles.prefLeft}>
                  <View style={[styles.iconWrapper, dynamicStyles.iconWrapper]}>
                    <Ionicons
                      name="language"
                      size={22}
                      color={darkMode ? "#93C5FD" : "#3B5BFF"}
                    />
                  </View>
                  <Text style={[styles.itemLabel, dynamicStyles.itemLabel]}>
                    Language
                  </Text>
                </View>
                <View
                  style={[styles.languageBadge, dynamicStyles.languageBadge]}
                >
                  <Text
                    style={[styles.languageValue, dynamicStyles.languageValue]}
                  >
                    {(currentLanguage || "en").toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            {!isAuthScreen && user && (
              <TouchableOpacity
                style={[styles.logoutRow, dynamicStyles.logoutButton]}
                onPress={handleLogout}
              >
                <View style={styles.prefLeft}>
                  <View
                    style={[
                      styles.iconWrapper,
                      { backgroundColor: darkMode ? "#7F1D1D" : "#FECACA" },
                    ]}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={20}
                      color={darkMode ? "#F87171" : "#DC2626"}
                    />
                  </View>
                  <Text style={[styles.itemLabel, dynamicStyles.logoutText]}>
                    Logout
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={darkMode ? "#F87171" : "#DC2626"}
                />
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  closeButtonWrapper: {
    padding: 4,
  },
  card: { padding: 4 },
  subText: {
    padding: 2,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  avatarText: {
    fontWeight: "700",
    fontSize: 24,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtext: {
    fontSize: 13,
  },
  menuSection: {
    marginBottom: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  preferencesSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  prefLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  languageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  languageValue: {
    fontWeight: "700",
    fontSize: 12,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
