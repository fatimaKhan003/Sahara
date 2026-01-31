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

  const handleAddDependent = async () => {
  if (!email.trim()) {
    Alert.alert("Error", "Please enter email");
    return;
  }

  try {
    setLoading(true);

    const res = await fetch(
      `${API_BASE}/api/caregiver/add-dependent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverUserId: user._id,
          email: email.trim(),
        }),
      }
    );

    const data = await res.json();

    console.log("API RESPONSE:", data); 

    if (!res.ok) {
      Alert.alert("Error", data.error || "User not found");
      return;
    }

    Alert.alert("Success", "Dependent added!");
    setEmail("");
    setModalVisible(false);
    fetchDependents(user._id);

  } catch (err: any) {
    console.log("FETCH ERROR:", err); 
    Alert.alert("Error", err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};


  return (
    
    <View style={styles.container}><SafeAreaView>
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

      {/* MODAL */}
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
                <Text style={{ color: "#fff" }}>
                  {loading ? "Adding..." : "Add"}
                </Text>
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
    backgroundColor: "#F7F8FA",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
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
  input: {
    backgroundColor: "#F2F2F2",
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
