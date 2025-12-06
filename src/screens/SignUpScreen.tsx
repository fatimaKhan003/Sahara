import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const [passwordVisible, setPasswordVisible] = useState(false); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
 const handleCreateAccount = async () => {
  if (!name || !email || !password) {
    alert("Please fill all fields");
    return;
  }
  if (name.length < 3) {
    alert("Name must be at least 3 characters long");
    return;
  }
  if (!validateEmail(email)) {
    alert("Please enter a valid email address");
    return;
  }
  if (!validatePassword(password)) {
    alert(
      "Password must be at least 8 characters long and include:\n• Uppercase letter\n• Lowercase letter\n• Number\n• Special character"
    );
    return;
  }
  try {
    const response = await fetch("http://192.168.18.133:5000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      setModalVisible(true);
      setName("");
      setEmail("");
      setPassword("");
    } else {
      alert(data.message || "Something went wrong");
    }
  } catch (error) {
    console.error(error);
    alert("Error connecting to the server");
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

      <Text style={styles.title}>Sign Up</Text>
      <Text style={styles.subtitle}>Fill in the details to create your account</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Enter your Name"
            style={styles.input}
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />
          {name.length > 0 && (
            <TouchableOpacity onPress={() => setName('')}>
              <Ionicons name="close-circle" size={20} color="#777" />
            </TouchableOpacity>
          )}
        </View>
      </View>

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

      <TouchableOpacity style={styles.createButton} onPress={handleCreateAccount}>
        <Text style={styles.createButtonText}>Create an account</Text>
      </TouchableOpacity>

      <Text style={styles.termsText}>
        By Signing up, you agree to the{' '}
        <Text style={styles.linkText}>Term of Service</Text> and{' '}
        <Text style={styles.linkText}>Privacy Policy</Text>.
      </Text>

      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={styles.signInLink}>Sign in</Text>
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
            <Text style={styles.modalTitle}>Sign Up Completed!</Text>
            <Text style={styles.modalMessage}>Account has been created successfully!</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false)
                navigation.navigate('LoginScreen')
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  container: 
  { 
    flex: 1, 
    backgroundColor: '#fff',
    paddingHorizontal: 25, 
    paddingTop: 80 
  },
  backButton: 
  {
     position: 'absolute', 
     top: 60, 
     left: 25 
    },
  title: 
  { 
    fontSize: 28, 
    fontWeight: '600', 
    marginBottom: 8, 
    textAlign: 'left' 
  },
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
