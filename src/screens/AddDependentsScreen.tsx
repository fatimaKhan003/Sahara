import React, { useEffect, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../api";
import { SafeAreaView } from "react-native";

const AddDependentsScreen = () => {
  const [user, setUser] = useState<any>(null);
  const [dependents, setDependents] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // New States for Creating a User
  const [creationModalVisible, setCreationModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
      console.log("Error fetching dependents:", err);
    }
  };

  const handleAddDependent = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter email");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/caregiver/add-dependent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverUserId: user._id,
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If user doesn't exist, offer to create one
        if (data.error === "User not found" || res.status === 404) {
          Alert.alert(
            "Account Not Found",
            "This dependent does not have an account. Would you like to create one for them?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Create Account",
                onPress: () => {
                  setModalVisible(false);
                  setCreationModalVisible(true);
                },
              },
            ]
          );
        } else {
          Alert.alert("Error", data.error || "User not found");
        }
        return;
      }

      Alert.alert("Success", "Dependent linked successfully!");
      setEmail("");
      setModalVisible(false);
      fetchDependents(user._id);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewDependent = async () => {
    if (!newName.trim() || !newPassword.trim()) {
      Alert.alert("Error", "Please provide a name and password for the new account.");
      return;
    }

    try {
      setLoading(true);
      // Calls new endpoint that handles Registration + Linking in one go
      const res = await fetch(`${API_BASE}/api/caregiver/register-and-add-dependent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverUserId: user._id,
          email: email.trim().toLowerCase(),
          name: newName.trim(),
          password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      Alert.alert("Success", "Account created and linked!");
      setCreationModalVisible(false);
      setNewName("");
      setNewPassword("");
      setEmail("");
      fetchDependents(user._id);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={styles.title}>Add dependents</Text>

        <View style={styles.card}>
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
                <Text style={styles.name}>{item.name}</Text>
              </View>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.addRow}
                onPress={() => setModalVisible(true)}
              >
                <View style={styles.plusCircle}>
                  <Text style={styles.plus}>+</Text>
                </View>
                <Text style={styles.addText}>Add another account</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* MODAL 1: LINK BY EMAIL */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Add dependent by email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddDependent}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: "#fff" }}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 2: CREATE NEW DEPENDENT */}
        <Modal visible={creationModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Register New Dependent</Text>
              <Text style={styles.subtitle}>Email: {email}</Text>

              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Initial Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreationModalVisible(false)}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleCreateNewDependent}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: "#fff" }}>Create & Link</Text>
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
    paddingHorizontal: 20,
    backgroundColor: "#F7F8FA",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginVertical: 15,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
    paddingVertical: 15,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 25,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 5,
  },
  cancelBtn: {
    marginRight: 15,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  addBtn: {
    backgroundColor: "#4F6EF7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
});