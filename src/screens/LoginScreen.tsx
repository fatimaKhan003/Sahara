import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import React, { useState, useEffect, useContext, useLayoutEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";
import i18n, { changeLanguage } from "../i18n";
import { useDrawer } from "../navigation/AppDrawerProvider";
import { ThemeContext } from "../context/ThemeContext";
import { sendLocalTestNotification } from "../services/notifications";
import EventBus from "../utils/EventBus";

const LoginScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const darkMode = theme === "dark";
  const { openDrawer } = useDrawer();

  useEffect(() => {
    const updateLanguage = () => setCurrentLanguage(i18n.language);
    i18n.on("languageChanged", updateLanguage);
    return () => i18n.off("languageChanged", updateLanguage);
  }, []);

  const handleLanguageChange = async () => {
    const newLang = currentLanguage === "en" ? "ur" : "en";
    await changeLanguage(newLang);
    setCurrentLanguage(newLang);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert(t("errors.fillAllFields"));
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setModalVisible(true);
        setEmail("");
        setPassword("");
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        EventBus.emit('userUpdated', data.user);
        await sendLocalTestNotification();
        navigation.replace("HomeScreen");
      } else {
        alert(data.message || t("errors.invalidCredentials"));
      }
    } catch (error) {
      const errorMessage = error.message || "Network error";
      alert(
        `${t("errors.serverError")}\n\nMake sure the backend server is running.\nAPI: ${API_BASE}\n\nError: ${errorMessage}`,
      );
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: darkMode ? "#1E1E1E" : "#fff",
      paddingHorizontal: 25,
      paddingTop: 120,
    },
    topBarIcon: { color: darkMode ? "#fff" : "#000" },
    text: { color: darkMode ? "#E5E5E5" : "#000" },
    subText: { color: darkMode ? "#A0A0A0" : "#777" },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: darkMode ? "#555" : "#ddd",
      borderRadius: 8,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: darkMode ? "#fff" : "#000",
    },
    createButton: {
      backgroundColor: darkMode ? "#3B5BFF" : "#3B5BFF",
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      marginTop: 20,
    },
    createButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    signInText: { color: darkMode ? "#A0A0A0" : "#777" },
    signInLink: { color: "#3B5BFF", fontWeight: "500" },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    modalContainer: {
      backgroundColor: darkMode ? "#2C2C2C" : "#fff",
      width: "100%",
      maxWidth: 340,
      borderRadius: 20,
      padding: 30,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    modalIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: darkMode ? "#1E2A3A" : "#E8F0FF",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 10,
      color: darkMode ? "#E5E5E5" : "#000",
      textAlign: "center",
    },
    modalMessage: {
      fontSize: 15,
      color: darkMode ? "#B0B0B0" : "#666",
      textAlign: "center",
      marginBottom: 25,
      lineHeight: 22,
    },
    modalButton: {
      backgroundColor: "#3B5BFF",
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      width: "100%",
      shadowColor: "#3B5BFF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    modalButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openDrawer} style={{ paddingHorizontal: 6 }}>
          <Ionicons
            name="menu-outline"
            size={24}
            color={darkMode ? "#fff" : "#007AFF"}
          />
        </TouchableOpacity>
      ),

      headerRightContainerStyle: { paddingRight: 25 },
    });
  }, [navigation, openDrawer, darkMode]);

  return (
    <View style={dynamicStyles.container}>
      <View
        style={{
          position: "absolute",
          top: 60,
          left: 25,
          right: 25,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate("OnboardingScreen", { goToLastSlide: true })
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={dynamicStyles.topBarIcon.color}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={openDrawer}>
          <Ionicons
            name="menu-outline"
            size={26}
            color={dynamicStyles.topBarIcon.color}
          />
        </TouchableOpacity>
      </View>

      <Text
        style={[
          { fontSize: 28, fontWeight: "600", marginTop: 20, marginBottom: 8 },
          dynamicStyles.text,
        ]}
      >
        {t("login.title")}
      </Text>
      <Text style={[{ fontSize: 14, marginBottom: 40 }, dynamicStyles.subText]}>
        {t("login.subtitle")}
      </Text>

      <View style={{ marginBottom: 20 }}>
        <Text
          style={[{ fontWeight: "500", marginBottom: 8 }, dynamicStyles.text]}
        >
          {t("common.email")}
        </Text>
        <View style={dynamicStyles.inputWrapper}>
          <TextInput
            placeholder={t("login.enterEmail")}
            placeholderTextColor={darkMode ? "#888" : "#999"}
            style={dynamicStyles.input}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {email.length > 0 && (
            <TouchableOpacity onPress={() => setEmail("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={darkMode ? "#ccc" : "#777"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ marginBottom: 20 }}>
        <Text
          style={[{ fontWeight: "500", marginBottom: 8 }, dynamicStyles.text]}
        >
          {t("common.password")}
        </Text>
        <View style={dynamicStyles.inputWrapper}>
          <TextInput
            placeholder={t("login.enterPassword")}
            placeholderTextColor={darkMode ? "#888" : "#999"}
            style={[dynamicStyles.input, { flex: 1, borderWidth: 0 }]}
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons
              name={passwordVisible ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={darkMode ? "#ccc" : "#777"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={dynamicStyles.createButton}
        onPress={handleLogin}
      >
        <Text style={dynamicStyles.createButtonText}>{t("common.login")}</Text>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 40,
        }}
      >
        <Text style={dynamicStyles.signInText}>
          {t("login.forgotPassword")}{" "}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassScreen")}
        >
          <Text style={dynamicStyles.signInLink}> {t("login.clickHere")}</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 20,
        }}
      >
        <Text style={dynamicStyles.signInText}>
          {t("login.dontHaveAccount")}{" "}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("SignUpScreen")}>
          <Text style={dynamicStyles.signInLink}>{t("common.signUp")}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContainer}>
            <View style={dynamicStyles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#3B5BFF" />
            </View>

            <Text style={dynamicStyles.modalTitle}>
              {t("login.successTitle")}
            </Text>

            <Text style={dynamicStyles.modalMessage}>
              {t("login.successMessage")}
            </Text>

            <TouchableOpacity
              style={dynamicStyles.modalButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={dynamicStyles.modalButtonText}>
                {t("common.ok")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LoginScreen;
