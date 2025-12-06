import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const ForgotPassScreen = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [oldPassVisible, setOldPassVisible] = useState(false);
  const [newPassVisible, setNewPassVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const handleResetPassword = async () => {
    if (!email || !oldPassword || !newPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        "Weak Password",
        "New password must contain:\n• 8 characters\n• Uppercase\n• Lowercase\n• Number\n• Special symbol"
      );
      return;
    }

    try {
      const response = await fetch("http://192.168.18.133:5000/api/reset-password", {
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
        Alert.alert("Error", data.message || "Something went wrong");
      }

    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Could not connect to server");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('LoginScreen');
        }
      }}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email and old password to update
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Enter your email"
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
        <Text style={styles.label}>Old Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Enter your old password"
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            placeholderTextColor="#999"
            secureTextEntry={!oldPassVisible}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TouchableOpacity onPress={() => setOldPassVisible(!oldPassVisible)}>
            <Ionicons
              name={oldPassVisible ? "eye-outline" : "eye-off-outline"}
              size={22}
              color="#777"
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Enter your new password"
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            placeholderTextColor="#999"
            secureTextEntry={!newPassVisible}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setNewPassVisible(!newPassVisible)}>
            <Ionicons
              name={newPassVisible ? "eye-outline" : "eye-off-outline"}
              size={22}
              color="#777"
            />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.createButton} onPress={handleResetPassword}>
        <Text style={styles.createButtonText}>Update Password</Text>
      </TouchableOpacity>
      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Want to log in? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={styles.signInLink}>Login</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Want to create a new account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
          <Text style={styles.signInLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
      <Modal transparent animationType="fade" visible={modalVisible}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Ionicons name="checkmark-circle" size={60} color="green" />
            <Text style={styles.modalTitle}>Password Updated!</Text>
            <Text style={styles.modalMessage}>
              Your password has been successfully changed.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('LoginScreen');
              }}
            >
              <Text style={styles.modalButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default ForgotPassScreen;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 25, paddingTop: 80 },
  backButton: { position: 'absolute', top: 60, left: 25 },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 8, textAlign: 'left' },
  subtitle: { color: '#777', fontSize: 14, marginBottom: 30 },
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