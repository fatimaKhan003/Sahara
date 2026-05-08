import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../api';
import { ThemeContext } from '../context/ThemeContext';

type Step = 'email' | 'otp' | 'newPassword';

const ForgotPassScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === 'dark';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassVisible, setNewPassVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(p);


  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert(t("common.error"), t("errors.fillAllFields")); return;
    }
    if (!validateEmail(email)) {
      Alert.alert(t("common.error"), t("errors.invalidEmail")); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('otp');
      } else {
        Alert.alert(t("common.error"), data.message || t("errors.somethingWentWrong"));
      }
    } catch (err) {
      Alert.alert(t("common.error"), t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  };


const handleVerifyOtp = () => {
  if (!otp || otp.length !== 6) {
    Alert.alert(t("common.error"), "Please enter the 6-digit code."); return;
  }
  setStep('newPassword');
};

  // Step 3 — update password
  const handleResetPassword = async () => {
  if (!newPassword) {
    Alert.alert(t("common.error"), t("errors.fillAllFields")); return;
  }
  if (!validatePassword(newPassword)) {
    Alert.alert(t("common.error"), t("errors.weakPassword")); return;
  }
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/verify-reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccessModalVisible(true);
    } else {
      // If OTP expired or wrong, send them back to OTP step
      if (data.message.includes("expired") || data.message.includes("Incorrect")) {
        setStep('otp');
        setOtp('');
      }
      Alert.alert(t("common.error"), data.message || t("errors.somethingWentWrong"));
    }
  } catch (err) {
    Alert.alert(t("common.error"), t("errors.serverError"));
  } finally {
    setLoading(false);
  }
};

  const bgColor = darkMode ? '#1E1E1E' : '#fff';
  const textColor = darkMode ? '#fff' : '#000';
  const subtitleColor = darkMode ? '#ccc' : '#777';
  const inputBg = darkMode ? '#333' : '#fff';
  const inputText = darkMode ? '#fff' : '#000';
  const borderColor = darkMode ? '#555' : '#ddd';
  const modalBg = darkMode ? '#2A2A2A' : '#fff';
  const modalTextColor = darkMode ? '#fff' : '#555';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => {
        if (step === 'otp') { setStep('email'); return; }
        if (step === 'newPassword') { setStep('otp'); return; }
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('LoginScreen');
      }}>
        <Ionicons name="arrow-back" size={24} color={textColor} />
      </TouchableOpacity>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {(['email', 'otp', 'newPassword'] as Step[]).map((s, i) => (
          <View key={s} style={[styles.stepDot, { backgroundColor: step === s ? '#3B5BFF' : darkMode ? '#444' : '#ddd' }]} />
        ))}
      </View>

      {/* ── Step 1: Email ── */}
      {step === 'email' && (
        <>
          <Text style={[styles.title, { color: textColor }]}>{t("forgotPassword.title")}</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            Enter your email and we'll send you a reset code.
          </Text>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: textColor }]}>{t("common.email")}</Text>
            <View style={[styles.inputWrapper, { borderColor, backgroundColor: inputBg }]}>
              <TextInput
                placeholder={t("forgotPassword.enterEmail")}
                style={[styles.input, { color: inputText }]}
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
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
          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSendOtp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
          </TouchableOpacity>
        </>
      )}

      {/* ── Step 2: OTP ── */}
      {step === 'otp' && (
        <>
          <Text style={[styles.title, { color: textColor }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ color: '#3B5BFF', fontWeight: '600' }}>{email}</Text>
          </Text>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: textColor }]}>Verification Code</Text>
            <TextInput
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={darkMode ? '#555' : '#ccc'}
              style={{
                fontSize: 32,
                fontWeight: '700',
                letterSpacing: 12,
                textAlign: 'center',
                color: textColor,
                borderBottomWidth: 2,
                borderColor: '#3B5BFF',
                paddingVertical: 12,
                marginTop: 10,
              }}
            />
          </View>
          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleVerifyOtp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Code</Text>}
          </TouchableOpacity>
        </>
      )}

      {/* ── Step 3: New Password ── */}
      {step === 'newPassword' && (
        <>
          <Text style={[styles.title, { color: textColor }]}>New Password</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            Enter a strong new password for your account.
          </Text>
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
          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("forgotPassword.updateButton")}</Text>}
          </TouchableOpacity>
        </>
      )}

      {/* Sign in / Sign up links */}
      <View style={styles.signInContainer}>
        <Text style={[styles.signInText, { color: textColor }]}>{t("forgotPassword.wantToLogin")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={styles.signInLink}>{t("common.login")}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.signInContainer}>
        <Text style={[styles.signInText, { color: textColor }]}>{t("forgotPassword.wantToSignUp")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
          <Text style={styles.signInLink}>{t("common.signUp")}</Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal transparent animationType="fade" visible={successModalVisible}>
        <View style={styles.modalBackground}>
          <View style={[styles.modalContainer, { backgroundColor: modalBg }]}>
            <Ionicons name="checkmark-circle" size={60} color="#3B5BFF" />
            <Text style={[styles.modalTitle, { color: textColor }]}>{t("forgotPassword.successTitle")}</Text>
            <Text style={[styles.modalMessage, { color: modalTextColor }]}>{t("forgotPassword.successMessage")}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => { setSuccessModalVisible(false); navigation.navigate('LoginScreen'); }}
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
  stepRow: { flexDirection: 'row', gap: 8, marginBottom: 30, marginTop: 10 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 30, lineHeight: 22 },
  inputContainer: { marginBottom: 20 },
  label: { fontWeight: '500', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 14, borderWidth: 1 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 14, borderWidth: 1 },
  button: { backgroundColor: '#3B5BFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signInContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signInText: { fontWeight: '400' },
  signInLink: { fontWeight: '500', color: '#3B5BFF' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%', borderRadius: 15, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  modalMessage: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  modalButton: { backgroundColor: '#3B5BFF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 25 },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
