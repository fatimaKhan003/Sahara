import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './src/i18n'; // Initialize i18n

import ConfirmMedicationScreen from './src/screens/ConfirmMedicationScreen';
import ForgotPassScreen from './src/screens/ForgotPassScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MedicationDetailScreen from './src/screens/MedicationDetailScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ScanPrescriptionScreen from './src/screens/ScanPrescriptionScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SplashScreen from './src/screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (<GestureHandlerRootView style={{flex:1}}>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SplashScreen" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SplashScreen" component={SplashScreen} />
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen}/>
        <Stack.Screen name='HomeScreen' component={HomeScreen}/>
        <Stack.Screen name="ScanPrescriptionScreen" component={ScanPrescriptionScreen}/>
        <Stack.Screen name='ConfirmMedicationScreen' component={ConfirmMedicationScreen}/>
        <Stack.Screen name="ForgotPassScreen" component={ForgotPassScreen}/>
      <Stack.Screen
  name="MedicationDetailScreen"
  component={MedicationDetailScreen}
  options={{ title: "Medication Details" }}
/>

      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
}
