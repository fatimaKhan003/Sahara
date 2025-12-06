import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../api';
const LoginScreen = () => {
  const navigation = useNavigation();
  const [passwordVisible, setPasswordVisible] = useState(false); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

 const handleLogin = async () => {
  if (!email || !password) {
    alert("Please fill all fields");
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
      alert(data.message || "Invalid credentials");
    }
  } catch (error) {
    console.error(error);
    alert("Error connecting to server");
  }
};


  return (
    <View style={styles.container}>
  
      <TouchableOpacity style={styles.backButton} onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('OnboardingScreen', { goToLastSlide: true });
        }
      }}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Fill in the details to Login to your account</Text>

      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Enter your email address"
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
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Enter your desired password"
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
        <Text style={styles.createButtonText}>Login</Text>
      </TouchableOpacity>


      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Forgot your Password? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassScreen')}>
          <Text style={styles.signInLink}> Click Here</Text>
        </TouchableOpacity>
      </View>
<View style={styles.signInContainer}>
  <Text style={styles.signInText}>Don't have an account? </Text>
  <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
    <Text style={styles.signInLink}>Sign Up</Text>
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
            <Text style={styles.modalTitle}>Login Successful!</Text>
            <Text style={styles.modalMessage}>Account has been successfully Logged in!</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LoginScreen;

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
