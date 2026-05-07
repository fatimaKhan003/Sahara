import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, {
  useMemo,
  useState,
  useContext,
  useLayoutEffect,
  useEffect,
} from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";
import { ThemeContext } from "../context/ThemeContext";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  cancelLogNotification,
  cancelMedicationNotifications,
} from "../services/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MedicationDetailScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const insets = useSafeAreaInsets();

  const medParam = route.params?.med;
  const onUpdate = route.params?.onUpdate ?? (() => {});
  const [isDependent, setIsDependent] = useState(false);

  useEffect(() => {
    const checkDependent = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (!userData) return;
        const parsedUser = JSON.parse(userData);
        const res = await fetch(
          `${API_BASE}/api/caregiver/is-dependent/${parsedUser._id}`,
        );
        const data = await res.json();
        setIsDependent(data.isDependent);
      } catch (err) {
        console.error("Failed to check dependent status:", err);
      }
    };
    checkDependent();
  }, []);
  const med = useMemo(
    () =>
      medParam || {
        _id: null,
        name: "Sample Medication",
        dose: "1 tab",
        schedule: {
          repeat: "daily",
          times: ["08:00"],
        },
        imageUri: null,
      },
    [medParam, t],
  );

  const [name, setName] = useState(med.name);
  const [dose, setDose] = useState(med.dose);
  const [schedule, setSchedule] = useState({
    repeat: med.schedule?.repeat || "daily",
    times: med.schedule?.times || ["08:00"],
  });
  const [imageUri, setImageUri] = useState(null);
  const [isActive, setIsActive] = useState(med.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [showPickerIndex, setShowPickerIndex] = useState(-1);

  useEffect(() => {
    const initImage = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (!userData || !med.imageUri) return;
      const parsed = JSON.parse(userData);

      // Convert /uploads/filename.jpg to /api/medications/image/filename.jpg?userId=...
      if (med.imageUri.startsWith("/uploads/")) {
        const filename = med.imageUri.split("/").pop();
        setImageUri(
          `${API_BASE}/api/medications/image/${filename}?userId=${parsed._id}`,
        );
      } else {
        setImageUri(med.imageUri);
      }
    };
    initImage();
  }, [med.imageUri]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant gallery permission.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeTime = (index: number) => {
    const updated = schedule.times.filter((_, i) => i !== index);
    setSchedule({ ...schedule, times: updated });
  };

  const updateMedication = async () => {
    if (!med?._id) {
      Alert.alert("Info", "Update not available for this entry.");
      return;
    }
    setLoading(true);
    try {
      const logIds = med.doseLogs?.map((log) => log._id) || [];
      await cancelLogNotification(logIds);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("dose", dose);
      formData.append("schedule", JSON.stringify(schedule));
      formData.append("isActive", String(isActive));

      if (imageUri && !imageUri.startsWith("http")) {
        const localResponse = await fetch(imageUri);
        const blob = await localResponse.blob();
        formData.append("image", blob, "med.jpg");
      }

      const res = await fetch(`${API_BASE}/api/medications/${med._id}`, {
        method: "PATCH",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update medication");

      const updated = await res.json();
      if (onUpdate) onUpdate(updated);

      if (isActive === false) {
        await cancelMedicationNotifications(med._id);
      }

      Alert.alert("Success", "Medication updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to update medication.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteMedication = async () => {
    if (!med?._id) return;

    const confirmTitle = isDependent ? "Request Deletion" : "Confirm Deletion";
    const confirmMsg = isDependent
      ? "A request will be sent to your caregiver to delete this medication."
      : "Are you sure you want to delete this medication?";
    const confirmBtn = isDependent ? "Send Request" : "Delete";

    Alert.alert(confirmTitle, confirmMsg, [
      { text: "Cancel", style: "cancel" },
      {
        text: confirmBtn,
        style: "destructive",
        onPress: async () => {
          try {
            if (isDependent) {
              const userData = await AsyncStorage.getItem("user");
              const parsedUser = JSON.parse(userData || "{}");
              await fetch(`${API_BASE}/api/medications/request-delete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  medicationId: med._id,
                  userId: parsedUser._id,
                }),
              });
              Alert.alert(
                "Request Sent",
                "Your caregiver will review and approve the deletion.",
                [{ text: "OK", onPress: () => navigation.goBack() }],
              );
            } else {
              await fetch(`${API_BASE}/api/medications/${med._id}`, {
                method: "DELETE",
              });
              await cancelMedicationNotifications(med._id);
              if (onUpdate) onUpdate(null);
              Alert.alert("Deleted", "Medication deleted successfully.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            }
          } catch (err) {
            Alert.alert("Error", "Failed to process request.");
            console.error(err);
          }
        },
      },
    ]);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF",
    },

    card: {
      backgroundColor: darkMode ? "#2C2C2C" : "#fff",
      borderRadius: 15,
      padding: 20,
      marginBottom: 25,
      shadowColor: darkMode ? "#000" : "#A0A0A0",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    medImage: {
      width: 160,
      height: 160,
      borderRadius: 80,
      borderColor: darkMode ? "#555" : "#ddd",
      borderWidth: 2,
    },
    changeImageText: {
      textAlign: "center",
      color: "#007AFF",
      marginTop: 10,
      fontWeight: "700",
      fontSize: 14,
    },
    imagePickerContainer: {
      alignItems: "center",
      marginBottom: 30,
      paddingTop: 10,
      paddingBottom: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 5,
      color: darkMode ? "#E5E5E5" : "#333",
    },
    input: {
      backgroundColor: darkMode ? "#1E1E1E" : "#F0F0F0",
      padding: 14,
      borderRadius: 10,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: darkMode ? "#444" : "#E0E0E0",
      color: darkMode ? "#fff" : "#000",
      fontSize: 14,
    },

    updateButton: {
      backgroundColor: "#007AFF",
      padding: 18,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 20,
      marginBottom: 10,
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
    },
    updateButtonText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
    },

    deleteButton: {
      backgroundColor: darkMode ? "#3A3A3A" : "#EAEAEA",
      padding: 18,
      borderRadius: 12,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#FF3B30",
    },
    deleteButtonText: {
      color: "#FF3B30",
      fontWeight: "bold",
      marginLeft: 5,
      fontSize: 16,
    },
    secondaryButton: {
      backgroundColor: darkMode ? "#3A3A3A" : "#E5E5E5",
      borderColor: "#007AFF",
      borderWidth: 1,
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      flex: 1,
    },
    secondaryButtonText: {
      color: "#007AFF",
      fontWeight: "600",
    },
    statusLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 5,
      color: darkMode ? "#A0A0A0" : "#666",
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Medication Details",
      headerStyle: {
        backgroundColor: dynamicStyles.container.backgroundColor,
        shadowOpacity: 0,
        elevation: 0,
      },
      headerTintColor: dynamicStyles.label.color,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingRight: 10 }}
        >
          <Ionicons
            name="close-outline"
            size={30}
            color={dynamicStyles.label.color}
          />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={updateMedication}
          disabled={loading}
          style={{ paddingLeft: 10 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={dynamicStyles.label.color} />
          ) : (
            <Ionicons
              name="save-outline"
              size={26}
              color={dynamicStyles.label.color}
            />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, darkMode, loading, name, dose, schedule, imageUri, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F2F2" }}>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: darkMode ? "#fff" : "#000",
          }}
        >
          Medication Details
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        style={dynamicStyles.container}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <TouchableOpacity
          onPress={pickImage}
          style={dynamicStyles.imagePickerContainer}
          activeOpacity={0.7}
        >
          <Image
            source={{
              uri:
                imageUri ||
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBm1yFTdVh7W4eAWd4nrod_KffW-IIv6k82g&s",
            }}
            style={dynamicStyles.medImage}
          />
          <Text style={dynamicStyles.changeImageText}>{"Change Image"}</Text>
        </TouchableOpacity>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.label}>{"Name"}</Text>
          <TextInput
            style={dynamicStyles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={darkMode ? "#aaa" : "#888"}
          />

          <Text style={dynamicStyles.label}>{"Dose"}</Text>
          <TextInput
            style={dynamicStyles.input}
            value={dose}
            onChangeText={setDose}
            placeholderTextColor={darkMode ? "#aaa" : "#888"}
          />

          <Text style={dynamicStyles.label}>{"Frequency"}</Text>
          <Picker
            selectedValue={schedule.repeat}
            onValueChange={(value) =>
              setSchedule({ ...schedule, repeat: value })
            }
            style={{ color: darkMode ? "#fff" : "#000", marginBottom: 20 }}
          >
            <Picker.Item label="Once a day" value="daily" />
            <Picker.Item label="Twice a day" value="twiceDaily" />
            <Picker.Item label="Weekly" value="weekly" />
          </Picker>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={dynamicStyles.label}>{"Active"}</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isActive ? "#007AFF" : "#f4f3f4"}
            />
          </View>

          <Text style={dynamicStyles.label}>{"Times"}</Text>

          {schedule.times.map((time, tIdx) => (
            <View key={tIdx} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={[dynamicStyles.input, { justifyContent: "center" }]}
                onPress={() => setShowPickerIndex(tIdx)}
              >
                <Text
                  style={{
                    color: time ? (darkMode ? "#fff" : "#000") : "#888",
                  }}
                >
                  {time
                    ? new Date(time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Select Time"}
                </Text>
              </TouchableOpacity>

              {showPickerIndex === tIdx && (
                <DateTimePicker
                  value={time ? new Date(time) : new Date()}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    setShowPickerIndex(-1); // close picker
                    if (event.type === "set" && selectedDate) {
                      const updatedTimes = [...schedule.times];
                      updatedTimes[tIdx] = new Date(
                        1970,
                        0,
                        1,
                        selectedDate.getHours(),
                        selectedDate.getMinutes(),
                      ).toISOString();
                      setSchedule({ ...schedule, times: updatedTimes });
                    }
                  }}
                />
              )}
            </View>
          ))}

          <TouchableOpacity
            onPress={() =>
              setSchedule({ ...schedule, times: [...schedule.times, ""] })
            }
            style={[dynamicStyles.secondaryButton, { marginBottom: 20 }]}
          >
            <Text style={dynamicStyles.secondaryButtonText}>Add Time</Text>
          </TouchableOpacity>

          <View style={{ marginBottom: 5 }}>
            <Text style={dynamicStyles.statusLabel}>Dose Logs</Text>
            {med.doseLogs?.map((log, idx) => {
              const logColor =
                log.status === "missed"
                  ? "#FF3B30"
                  : log.status === "taken"
                    ? "#34C759"
                    : darkMode
                      ? "#E5E5E5"
                      : "#000";

              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 3,
                  }}
                >
                  <Text style={{ color: darkMode ? "#aaa" : "#555" }}>
                    {new Date(log.scheduledAt).toLocaleTimeString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Text style={{ color: logColor, fontWeight: "bold" }}>
                    {log.status.toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ marginVertical: 10 }}>
          <TouchableOpacity
            style={dynamicStyles.updateButton}
            onPress={updateMedication}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            )}
            <Text style={dynamicStyles.updateButtonText}>
              {loading ? "Saving..." : "Update Medication"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.deleteButton}
            onPress={deleteMedication}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={dynamicStyles.deleteButtonText}>
              {"Delete Medication"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MedicationDetailScreen;
