import React, { useState, useContext, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import DefaultPFP from "../assets/default-pfp.png";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { ThemeContext } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { containsUrdu } from "../utils/textUtils";
import { API_BASE } from "../../api";
import EventBus from "../utils/EventBus";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ProfileEditScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [isImageDirty, setIsImageDirty] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          setName(parsedUser.name || "");
          setPhone(parsedUser.phone || "");
          const initialImage = parsedUser.profileImage;
          if (
            initialImage &&
            (initialImage.startsWith("/") || initialImage.startsWith("uploads"))
          ) {
            setProfileImage(`${API_BASE}${initialImage}`);
          } else {
            setProfileImage(
              initialImage || Image.resolveAssetSource(DefaultPFP).uri,
            );
          }
        }
      } catch (err) {
        console.error("Error loading user data:", err);

        setProfileImage(
          Image.resolveAssetSource(DefaultPFP).uri,
        );
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const uploadProfileImage = async (localUri: string) => {
    try {
      const formData = new FormData();
      const filename = localUri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("image", {
        uri: localUri,
        name: filename,
        type,
      } as any);

      console.log("Uploading to:", `${API_BASE}/api/upload-profile`);

      const uploadResp = await fetch(`${API_BASE}/api/upload-profile`, {
        method: "POST",
        body: formData,
      });

      console.log("Upload response status:", uploadResp.status);
      const uploadData = await uploadResp.json();
      console.log("Upload response data:", uploadData);

      if (!uploadResp.ok) {
        throw new Error(uploadData.message || "Image upload failed");
      }

      return uploadData.imageUrl;
    } catch (err) {
      console.error("Image upload error details:", err);
      throw err;
    }
  };

  const handleSaveChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let finalImageUrl = profileImage;

      if (isImageDirty) {
        console.log("Image is dirty, uploading...");
        finalImageUrl = await uploadProfileImage(profileImage);
      }

      const updateResp = await fetch(
        `${API_BASE}/api/update-profile/${user._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            profileImage: finalImageUrl.startsWith(API_BASE)
              ? finalImageUrl.replace(API_BASE, "")
              : finalImageUrl,
          }),
        },
      );

      if (!updateResp.ok) {
        const errData = await updateResp.json();
        throw new Error(
          errData.message || "Failed to update profile in database",
        );
      }

      const updateData = await updateResp.json();
      const updatedUser = updateData.user;

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsImageDirty(false);

      EventBus.emit("userUpdated", updatedUser);
      console.log("Emitted userUpdated event:", updatedUser);

      Alert.alert(t("common.success"), t("profileEdit.successMessage"));
      navigation.goBack();
    } catch (error: any) {
      console.error("Save Profile Error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("profileEdit.permissionRequired"), t("profileEdit.allowGallery"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      setIsImageDirty(true);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: darkMode ? "#1E1E1E" : "#F6F8FF" },
    text: { color: darkMode ? "#E5E5E5" : "#000" },
    subText: { color: darkMode ? "#A0A0A0" : "#777" },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: darkMode ? "#555" : "#ddd",
      borderRadius: 8,
      paddingHorizontal: 14,
      marginTop: 8,
      marginBottom: 20,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: darkMode ? "#fff" : "#000",
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: darkMode ? "#E5E5E5" : "#333",
    },
    saveButton: {
      backgroundColor: "#3B5BFF",
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      marginTop: 30,
      flexDirection: "row",
      gap: 10,
    },
    saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderColor: "#007AFF",
      backgroundColor: darkMode ? "#3A3A3A" : "#e0e7ff",
    },
    changeButton: {
      position: "absolute",
      bottom: 0,
      right: "35%",
      backgroundColor: "#007AFF",
      padding: 8,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: darkMode ? "#1E1E1E" : "#F6F8FF",
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("profileEdit.title"),
      headerStyle: { backgroundColor: dynamicStyles.container.backgroundColor },
      headerTintColor: dynamicStyles.text.color,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingRight: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={26}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, darkMode, dynamicStyles.text.color, t]);

  if (loading) {
    return (
      <View
        style={[
          dynamicStyles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={"#007AFF"} />
      </View>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
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
          {t("profileEdit.title")}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 25, paddingVertical: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: profileImage }} style={dynamicStyles.avatar} />
          <TouchableOpacity
            style={dynamicStyles.changeButton}
            onPress={handleChangeProfileImage}
          >
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={dynamicStyles.label}>{t("profileEdit.name")}</Text>
        <View style={dynamicStyles.inputWrapper}>
          <TextInput
            placeholder={t("profileEdit.enterName")}
            placeholderTextColor={darkMode ? "#888" : "#999"}
            style={[
              dynamicStyles.input,
              containsUrdu(name) && styles.urduInputStyle,
            ]}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
          />
        </View>

        <Text style={dynamicStyles.label}>{t("profileEdit.email")}</Text>
        <View
          style={[
            dynamicStyles.inputWrapper,
            {
              borderColor: darkMode ? "#333" : "#eee",
              backgroundColor: darkMode ? "#3A3A3A" : "#f8f8f8",
            },
          ]}
        >
          <TextInput
            placeholder={user?.email || "N/A"}
            placeholderTextColor={darkMode ? "#888" : "#999"}
            style={[
              dynamicStyles.input,
              dynamicStyles.subText,
              { paddingVertical: 10 },
            ]}
            keyboardType="email-address"
            value={user?.email || "N/A"}
            editable={false}
          />
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={dynamicStyles.subText.color}
          />
        </View>

        <Text style={dynamicStyles.label}>{t("profileEdit.phone")}</Text>
        <View style={dynamicStyles.inputWrapper}>
          <TextInput
            placeholder={t("profileEdit.enterPhone")}
            placeholderTextColor={darkMode ? "#888" : "#999"}
            style={dynamicStyles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity
          style={dynamicStyles.saveButton}
          onPress={handleSaveChanges}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#fff" />
          )}
          <Text style={dynamicStyles.saveButtonText}>
            {isSaving ? t("profileEdit.saving") : t("profileEdit.saveChanges")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileEditScreen;

const styles = StyleSheet.create({
  imageContainer: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 10,
  },
  urduInputStyle: {
    writingDirection: "rtl",
    textAlign: "right",
  },
});
