import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../api";
import { SafeAreaView } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../context/ThemeContext";

type AddMode = "email" | "create" | null;

const AddDependentsScreen = () => {
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const { t } = useTranslation();

  const [user, setUser] = useState<any>(null);
  const [dependents, setDependents] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingThemeFor, setEditingThemeFor] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const stored = await AsyncStorage.getItem("user");
    if (!stored) return;
    const parsed = JSON.parse(stored);
    setUser(parsed);
    fetchDependents(parsed._id);
  };

  const fetchDependents = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/caregiver/${userId}/dependents`);
      const data = await res.json();
      setDependents(data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddByEmail = async () => {
    if (!email.trim()) {
      Alert.alert(t("common.error") || "Error", t("errors.invalidEmail") || "Please enter email");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/caregiver/add-dependent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverUserId: user._id,
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t("common.error") || "Error", data.error || t("errors.userNotFound"));
        return;
      }

      Alert.alert(t("common.success") || "Success", t("caregiver.dependentAdded") || "Dependent added!");
      setEmail("");
      setModalVisible(false);
      setAddMode(null);
      fetchDependents(user._id);
    } catch (err: any) {
      Alert.alert(t("common.error") || "Error", err.message || t("errors.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (p: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(p);

  const handleCreateDependent = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert(t("common.error") || "Error", t("errors.fillAllFields") || "Please fill all fields");
      return;
    }
    if (name.trim().length < 3) {
      Alert.alert(t("common.error") || "Error", t("errors.nameTooShort") || "Name must be at least 3 characters");
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert(t("common.error") || "Error", t("errors.weakPassword") || "Password must be at least 8 characters with uppercase, lowercase, number and special character");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/caregiver/create-dependent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverUserId: user._id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t("common.error") || "Error", data.error || t("errors.somethingWentWrong"));
        return;
      }

      Alert.alert(
        t("common.success") || "Success",
        t("caregiver.accountCreated") || "Dependent account created! Share the email and password with them."
      );
      setName("");
      setEmail("");
      setPassword("");
      setModalVisible(false);
      setAddMode(null);
      fetchDependents(user._id);
    } catch (err: any) {
      Alert.alert(t("common.error") || "Error", err.message || t("errors.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleSetDependentTheme = async (dependentId: string, newTheme: "light" | "dark") => {
    try {
      const res = await fetch(
        `${API_BASE}/api/caregiver/${user._id}/dependent/${dependentId}/theme`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: newTheme }),
        }
      );
      if (res.ok) {
        setEditingThemeFor(null);
        fetchDependents(user._id);
      }
    } catch (err) {
      console.error(err);
    }
  };


  const openAddModal = (mode: "email" | "create") => {
    setAddMode(mode);
    setEmail("");
    setName("");
    setPassword("");
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#1E1E1E" : "#F7F8FA" }]}>
      <SafeAreaView>
        <Text style={[styles.title, { color: darkMode ? "#fff" : "#000" }]}>
          {t("caregiver.addDependents") || "Add dependents"}
        </Text>

        <View style={[styles.card, { backgroundColor: darkMode ? "#2C2C2C" : "#fff" }]}>
          <FlatList
            data={dependents}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Image
                  source={{
                    uri:
                      item.avatar ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: darkMode ? "#fff" : "#000" }]}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: darkMode ? "#aaa" : "#666" }}>
                    {item.email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.themeToggle}
                  onPress={() =>
                    setEditingThemeFor(editingThemeFor === item._id ? null : item._id)
                  }
                >
                  <Ionicons
                    name={item.themePreference === "dark" ? "moon" : "sunny"}
                    size={20}
                    color={darkMode ? "#fff" : "#333"}
                  />
                </TouchableOpacity>
                {editingThemeFor === item._id && (
                  <View style={styles.themeOptions}>
                    <TouchableOpacity
                      style={[
                        styles.themeOption,
                        item.themePreference === "light" && styles.themeOptionActive,
                      ]}
                      onPress={() => handleSetDependentTheme(item._id, "light")}
                    >
                      <Ionicons
                        name="sunny"
                        size={18}
                        color={item.themePreference === "light" ? "#fff" : "#333"}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: item.themePreference === "light" ? "#fff" : "#333",
                        }}
                      >
                        Light
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.themeOption,
                        item.themePreference === "dark" && styles.themeOptionActive,
                      ]}
                      onPress={() => handleSetDependentTheme(item._id, "dark")}
                    >
                      <Ionicons
                        name="moon"
                        size={18}
                        color={item.themePreference === "dark" ? "#fff" : "#333"}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: item.themePreference === "dark" ? "#fff" : "#333",
                        }}
                      >
                        Dark
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            ListFooterComponent={
              <View>
                <TouchableOpacity
                  style={styles.addRow}
                  onPress={() => openAddModal("email")}
                >
                  <View style={[styles.plusCircle, { backgroundColor: darkMode ? "#3A3A3A" : "#EEF1FF" }]}>
                    <Text style={styles.plus}>+</Text>
                  </View>
                  <Text style={styles.addText}>
                    {t("caregiver.addByEmail") || "Add by email (existing account)"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addRow, { borderTopWidth: 1, borderTopColor: darkMode ? "#444" : "#eee" }]}
                  onPress={() => openAddModal("create")}
                >
                  <View style={[styles.plusCircle, { backgroundColor: darkMode ? "#3A3A3A" : "#EEF1FF" }]}>
                    <Ionicons name="person-add" size={20} color="#4F6EF7" />
                  </View>
                  <Text style={styles.addText}>
                    {t("caregiver.createAccount") || "Create new account for dependent"}
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        {/* MODAL - Add by email or Create */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: darkMode ? "#2C2C2C" : "#fff" }]}>
              <Text style={[styles.modalTitle, { color: darkMode ? "#fff" : "#000" }]}>
                {addMode === "create"
                  ? (t("caregiver.createAccount") || "Create new account for dependent")
                  : (t("caregiver.addByEmail") || "Add dependent by email")}
              </Text>

              {addMode === "create" && (
                <>
                  <Text style={[styles.label, { color: darkMode ? "#E5E5E5" : "#333" }]}>
                    {t("common.name")}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: darkMode ? "#1E1E1E" : "#F2F2F2", color: darkMode ? "#fff" : "#000" }]}
                    placeholder={t("signup.enterName") || "Enter name"}
                    placeholderTextColor={darkMode ? "#888" : "#999"}
                    value={name}
                    onChangeText={setName}
                  />
                </>
              )}

              <Text style={[styles.label, { color: darkMode ? "#E5E5E5" : "#333" }]}>
                {t("common.email")}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: darkMode ? "#1E1E1E" : "#F2F2F2", color: darkMode ? "#fff" : "#000" }]}
                placeholder={t("signup.enterEmail") || "Enter email"}
                placeholderTextColor={darkMode ? "#888" : "#999"}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {addMode === "create" && (
                <>
                  <Text style={[styles.label, { color: darkMode ? "#E5E5E5" : "#333" }]}>
                    {t("common.password")}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: darkMode ? "#1E1E1E" : "#F2F2F2", color: darkMode ? "#fff" : "#000" }]}
                    placeholder={t("signup.enterPassword") || "Enter password"}
                    placeholderTextColor={darkMode ? "#888" : "#999"}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setModalVisible(false);
                    setAddMode(null);
                  }}
                >
                  <Text style={{ color: darkMode ? "#fff" : "#000" }}>{t("common.cancel")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={addMode === "create" ? handleCreateDependent : handleAddByEmail}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff" }}>
                      {addMode === "create"
                        ? (t("caregiver.create") || "Create")
                        : (t("caregiver.add") || "Add")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default AddDependentsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
  },
  card: {
    borderRadius: 14,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  themeToggle: {
    padding: 8,
    marginRight: 5,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  themeOptionActive: {
    backgroundColor: "#4F6EF7",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF1FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  plus: {
    fontSize: 22,
    color: "#4F6EF7",
  },
  addText: {
    color: "#4F6EF7",
    fontSize: 16,
    fontWeight: "500",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    marginRight: 10,
    padding: 10,
  },
  addBtn: {
    backgroundColor: "#4F6EF7",
    padding: 10,
    borderRadius: 8,
  },
});
