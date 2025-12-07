import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../api';
import i18n, { changeLanguage } from '../i18n';

const LoginScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [passwordVisible, setPasswordVisible] = useState(false); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

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

  // Language switcher
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
      setEmail('');
      setPassword('');
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      navigation.replace('HomeScreen');
    } else {
      alert(data.message || t("errors.invalidCredentials"));
    }
  } catch (error) {
    console.error('Login error:', error);
    console.error('API_BASE:', API_BASE);
    // More detailed error message
    const errorMessage = error.message || 'Network error';
    alert(`${t("errors.serverError")}\n\nMake sure the backend server is running.\nAPI: ${API_BASE}\n\nError: ${errorMessage}`);
  }
};


  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('OnboardingScreen', { goToLastSlide: true });
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLanguageChange}
          style={styles.languageButton}
        >
          <Ionicons name="language" size={20} color="#007AFF" />
          <Text style={styles.languageText}>
            {currentLanguage === "en" ? "اردو" : "EN"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{t("login.title")}</Text>
      <Text style={styles.subtitle}>{t("login.subtitle")}</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t("common.email")}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder={t("login.enterEmail")}
            style={styles.input}
            placeholderTextColor="#999"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {email.length > 0 && (
            <TouchableOpacity onPress={() => setEmail('')}>
              <Ionicons name="close-circle" size={20} color="#777" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t("common.password")}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder={t("login.enterPassword")}
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            placeholderTextColor="#999"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            <Ionicons
              name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color="#777"
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleLogin}>
        <Text style={styles.createButtonText}>{t("common.login")}</Text>
      </TouchableOpacity>


      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>{t("login.forgotPassword")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassScreen')}>
          <Text style={styles.signInLink}> {t("login.clickHere")}</Text>
        </TouchableOpacity>
      </View>
<View style={styles.signInContainer}>
  <Text style={styles.signInText}>{t("login.dontHaveAccount")} </Text>
  <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
    <Text style={styles.signInLink}>{t("common.signUp")}</Text>
  </TouchableOpacity>
</View>

      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="green" />
            </View>
            <Text style={styles.modalTitle}>{t("login.successTitle")}</Text>
            <Text style={styles.modalMessage}>{t("login.successMessage")}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 25, paddingTop: 120 },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {},
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  languageText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: { fontSize: 28, fontWeight: '600', marginTop: 20, marginBottom: 8, textAlign: 'left' },
  subtitle: { color: '#777', fontSize: 14, marginBottom: 40 },
  inputContainer: { marginBottom: 20 },
  label: { fontWeight: '500', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14 },
  createButton: { backgroundColor: '#3B5BFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 20 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  termsText: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  linkText: { color: '#3B5BFF' },
  signInContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  signInText: { color: '#777' },
  signInLink: { color: '#3B5BFF', fontWeight: '500' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', width: '80%', borderRadius: 15, padding: 20, alignItems: 'center' },
  iconContainer: { marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20 },
  modalButton: { backgroundColor: '#3B5BFF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 25 },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
