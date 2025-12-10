import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../api';
import i18n, { changeLanguage } from '../i18n';
import { signInWithGoogle } from '../utils/googleAuth';

const LoginScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [passwordVisible, setPasswordVisible] = useState(false); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [darkMode, setDarkMode] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Update language state when i18n language changes
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
        setEmail('');
        setPassword('');
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        navigation.replace('HomeScreen');
      } else {
        alert(data.message || t("errors.invalidCredentials"));
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error';
      alert(`${t("errors.serverError")}\n\nMake sure the backend server is running.\nAPI: ${API_BASE}\n\nError: ${errorMessage}`);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    try {
      const googleResult = await signInWithGoogle();
      
      if (!googleResult.success) {
        if (googleResult.error && !googleResult.error.includes('cancelled')) {
          alert(googleResult.error);
        }
        setLoadingGoogle(false);
        return;
      }

      // Send Google user data to backend
      const response = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleId: googleResult.user.googleId,
          email: googleResult.user.email,
          name: googleResult.user.name,
          idToken: googleResult.user.idToken,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        navigation.replace('HomeScreen');
      } else {
        alert(data.message || t("errors.somethingWentWrong"));
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      alert(t("errors.serverError"));
    } finally {
      setLoadingGoogle(false);
    }
  };

  // =================== Dynamic Styles ===================
  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: darkMode ? '#1E1E1E' : '#fff', paddingHorizontal: 25, paddingTop: 120 },
    topBarIcon: { color: darkMode ? '#fff' : '#000' },
    text: { color: darkMode ? '#E5E5E5' : '#000' },
    subText: { color: darkMode ? '#A0A0A0' : '#777' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: darkMode ? '#555' : '#ddd', borderRadius: 8, paddingHorizontal: 14 },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, color: darkMode ? '#fff' : '#000' },
    createButton: { backgroundColor: darkMode ? '#3B5BFF' : '#3B5BFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 20 },
    createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    signInText: { color: darkMode ? '#A0A0A0' : '#777' },
    signInLink: { color: '#3B5BFF', fontWeight: '500' },
    modalContainer: { backgroundColor: darkMode ? '#2C2C2C' : '#fff', width: '80%', borderRadius: 15, padding: 20, alignItems: 'center' },
    modalMessage: { fontSize: 16, color: darkMode ? '#E5E5E5' : '#555', textAlign: 'center', marginBottom: 20 },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: darkMode ? '#555' : '#ddd' },
    dividerText: { marginHorizontal: 10, color: darkMode ? '#A0A0A0' : '#777', fontSize: 14 },
    googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: darkMode ? '#333' : '#fff', borderWidth: 1, borderColor: darkMode ? '#555' : '#ddd', borderRadius: 10, paddingVertical: 15, marginTop: 10 },
    googleButtonText: { color: darkMode ? '#E5E5E5' : '#000', fontSize: 16, fontWeight: '600', marginLeft: 10 },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Top bar with language and dark mode toggle */}
      <View style={{ position: 'absolute', top: 60, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('OnboardingScreen', { goToLastSlide: true })}>
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.topBarIcon.color} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={handleLanguageChange} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: darkMode ? '#333' : '#f0f0f0' }}>
            <Ionicons name="language" size={20} color="#007AFF" />
            <Text style={{ marginLeft: 4, fontSize: 12, color: '#007AFF', fontWeight: '600' }}>{currentLanguage === "en" ? "اردو" : "EN"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setDarkMode(!darkMode)}>
            <Ionicons name={darkMode ? "moon" : "sunny"} size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[{ fontSize: 28, fontWeight: '600', marginTop: 20, marginBottom: 8 }, dynamicStyles.text]}>{t("login.title")}</Text>
      <Text style={[{ fontSize: 14, marginBottom: 40 }, dynamicStyles.subText]}>{t("login.subtitle")}</Text>

      {/* Email input */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[{ fontWeight: '500', marginBottom: 8 }, dynamicStyles.text]}>{t("common.email")}</Text>
        <View style={dynamicStyles.inputWrapper}>
          <TextInput
            placeholder={t("login.enterEmail")}
            placeholderTextColor={darkMode ? '#888' : '#999'}
            style={dynamicStyles.input}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {email.length > 0 && <TouchableOpacity onPress={() => setEmail('')}><Ionicons name="close-circle" size={20} color={darkMode ? '#ccc' : '#777'} /></TouchableOpacity>}
        </View>
      </View>

      {/* Password input */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[{ fontWeight: '500', marginBottom: 8 }, dynamicStyles.text]}>{t("common.password")}</Text>
        <View style={dynamicStyles.inputWrapper}>
          <TextInput
            placeholder={t("login.enterPassword")}
            placeholderTextColor={darkMode ? '#888' : '#999'}
            style={[dynamicStyles.input, { flex: 1, borderWidth: 0 }]}
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            <Ionicons name={passwordVisible ? 'eye-outline' : 'eye-off-outline'} size={22} color={darkMode ? '#ccc' : '#777'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Login button */}
      <TouchableOpacity style={dynamicStyles.createButton} onPress={handleLogin}>
        <Text style={dynamicStyles.createButtonText}>{t("common.login")}</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={dynamicStyles.dividerContainer}>
        <View style={dynamicStyles.dividerLine} />
        <Text style={dynamicStyles.dividerText}>{t("login.or")}</Text>
        <View style={dynamicStyles.dividerLine} />
      </View>

      {/* Google Sign-In button */}
      <TouchableOpacity 
        style={dynamicStyles.googleButton} 
        onPress={handleGoogleSignIn}
        disabled={loadingGoogle}
      >
        {loadingGoogle ? (
          <ActivityIndicator color={darkMode ? '#E5E5E5' : '#000'} />
        ) : (
          <>
            <Ionicons name="logo-google" size={24} color="#4285F4" />
            <Text style={dynamicStyles.googleButtonText}>{t("login.signInWithGoogle")}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Forgot password */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 40 }}>
        <Text style={dynamicStyles.signInText}>{t("login.forgotPassword")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassScreen')}>
          <Text style={dynamicStyles.signInLink}> {t("login.clickHere")}</Text>
        </TouchableOpacity>
      </View>

      {/* Sign up */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
        <Text style={dynamicStyles.signInText}>{t("login.dontHaveAccount")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
          <Text style={dynamicStyles.signInLink}>{t("common.signUp")}</Text>
        </TouchableOpacity>
      </View>

      {/* Success modal */}
      <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={dynamicStyles.modalContainer}>
            <Ionicons name="checkmark-circle" size={60} color="green" style={{ marginBottom: 15 }} />
            <Text style={[{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }, dynamicStyles.text]}>{t("login.successTitle")}</Text>
            <Text style={dynamicStyles.modalMessage}>{t("login.successMessage")}</Text>
            <TouchableOpacity style={[dynamicStyles.createButton, { marginTop: 0 }]} onPress={() => setModalVisible(false)}>
              <Text style={dynamicStyles.createButtonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LoginScreen;
