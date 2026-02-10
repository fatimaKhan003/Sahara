import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal, Alert, Switch } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../api';

const ForgotPassScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [oldPassVisible, setOldPassVisible] = useState(false);
  const [newPassVisible, setNewPassVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

  const handleResetPassword = async () => {
    if (!email || !oldPassword || !newPassword) {
      Alert.alert(t("common.error"), t("errors.fillAllFields"));
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert(t("common.error"), t("errors.invalidEmail"));
      return;
    }
    if (!validatePassword(newPassword)) {
      Alert.alert(t("common.error"), t("errors.weakPassword"));
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, oldPassword, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setModalVisible(true);
        setEmail('');
        setOldPassword('');
        setNewPassword('');
      } else {
        Alert.alert(t("common.error"), data.message || t("errors.somethingWentWrong"));
      }
    } catch (err) {
      console.log(err);
      Alert.alert(t("common.error"), t("errors.serverError"));
    }
  };

  const bgColor = darkMode ? '#1E1E1E' : '#fff';
  const textColor = darkMode ? '#fff' : '#000';
  const subtitleColor = darkMode ? '#ccc' : '#777';
  const inputBg = darkMode ? '#333' : '#fff';
  const inputText = darkMode ? '#fff' : '#000';
  const borderColor = darkMode ? '#555' : '#ddd';
  const secondaryTextColor = darkMode ? '#aaa' : '#3B5BFF';
  const modalBg = darkMode ? '#2A2A2A' : '#fff';
  const modalTextColor = darkMode ? '#fff' : '#555';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 }}>
        <Text style={{ color: textColor, marginRight: 8 }}>{darkMode ? t("Dark Mode") : t("Light Mode")}</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('LoginScreen');
      }}>
        <Ionicons name="arrow-back" size={24} color={textColor} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: textColor }]}>{t("forgotPassword.title")}</Text>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>{t("forgotPassword.subtitle")}</Text>


      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: textColor }]}>{t("common.email")}</Text>
        <View style={[styles.inputWrapper, { borderColor, backgroundColor: inputBg }]}>
          <TextInput
            placeholder={t("forgotPassword.enterEmail")}
            style={[styles.input, { color: inputText }]}
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
        <Text style={[styles.label, { color: textColor }]}>{t("forgotPassword.oldPassword")}</Text>
        <View style={[styles.passwordContainer, { borderColor, backgroundColor: inputBg }]}>
          <TextInput
            placeholder={t("forgotPassword.enterOldPassword")}
            style={[styles.input, { flex: 1, color: inputText, borderWidth: 0 }]}
            placeholderTextColor="#999"
            secureTextEntry={!oldPassVisible}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TouchableOpacity onPress={() => setOldPassVisible(!oldPassVisible)}>
            <Ionicons name={oldPassVisible ? "eye-outline" : "eye-off-outline"} size={22} color="#777" />
          </TouchableOpacity>
        </View>
      </View>

      
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: textColor }]}>{t("forgotPassword.newPassword")}</Text>
        <View style={[styles.passwordContainer, { borderColor, backgroundColor: inputBg }]}>
          <TextInput
            placeholder={t("forgotPassword.enterNewPassword")}
            style={[styles.input, { flex: 1, color: inputText, borderWidth: 0 }]}
            placeholderTextColor="#999"
            secureTextEntry={!newPassVisible}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setNewPassVisible(!newPassVisible)}>
            <Ionicons name={newPassVisible ? "eye-outline" : "eye-off-outline"} size={22} color="#777" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleResetPassword}>
        <Text style={styles.createButtonText}>{t("forgotPassword.updateButton")}</Text>
      </TouchableOpacity>

      <View style={styles.signInContainer}>
        <Text style={[styles.signInText, { color: textColor }]}>{t("forgotPassword.wantToLogin")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={[styles.signInLink, { color: secondaryTextColor }]}>{t("common.login")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.signInContainer}>
        <Text style={[styles.signInText, { color: textColor }]}>{t("forgotPassword.wantToSignUp")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
          <Text style={[styles.signInLink, { color: secondaryTextColor }]}>{t("common.signUp")}</Text>
        </TouchableOpacity>
      </View>


      <Modal transparent animationType="fade" visible={modalVisible}>
        <View style={styles.modalBackground}>
          <View style={[styles.modalContainer, { backgroundColor: modalBg }]}>
            <Ionicons name="checkmark-circle" size={60} color="green" />
            <Text style={[styles.modalTitle, { color: textColor }]}>{t("forgotPassword.successTitle")}</Text>
            <Text style={[styles.modalMessage, { color: modalTextColor }]}>{t("forgotPassword.successMessage")}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('LoginScreen');
              }}
            >
              <Text style={styles.modalButtonText}>{t("forgotPassword.goToLogin")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default ForgotPassScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 25, paddingTop: 80 },
  backButton: { position: 'absolute', top: 60, left: 25 },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 8, textAlign: 'left' },
  subtitle: { fontSize: 14, marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  label: { fontWeight: '500', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 14, borderWidth: 1 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 14, borderWidth: 1 },
  createButton: { backgroundColor: '#3B5BFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 20 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signInContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  signInText: { fontWeight: '400' },
  signInLink: { fontWeight: '500' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%', borderRadius: 15, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalMessage: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  modalButton: { backgroundColor: '#3B5BFF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 25 },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
