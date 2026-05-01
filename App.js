import { NavigationContainer } from "@react-navigation/native";
import { ThemeProvider } from "./src/context/ThemeContext";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "./src/i18n";
import { AppDrawerProvider } from "./src/navigation/AppDrawerProvider";
import { navigationRef } from "./src/navigation/navigationRef";

import ConfirmMedicationScreen from "./src/screens/ConfirmMedicationScreen";
import ForgotPassScreen from "./src/screens/ForgotPassScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MedicationDetailScreen from "./src/screens/MedicationDetailScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import ScanPrescriptionScreen from "./src/screens/ScanPrescriptionScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import SplashScreen from "./src/screens/SplashScreen";
import ProfileEditScreen from "./src/screens/ProfileEditScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import AddDependentsScreen from "./src/screens/AddDependentsScreen";
import {
  registerForNotifications,
  sendLocalTestNotification,
  setupForegroundNotificationListener,
  setupNotificationActions,
  setupNotificationResponseListener,
} from "./src/services/notifications";
import { SettingsProvider } from "./src/context/SettingsContext";
import CaregiverRequestsScreen from "./src/screens/CaregiverRequestsScreen";
import ViewPrescriptionsScreen from "./src/screens/ViewPrescriptionsScreen";
import EditMedicationRequestScreen from "./src/screens/EditMedicationRequestScreen";
import ViewAllMedicines from "./src/screens/ViewAllMedicines";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    registerForNotifications();
    setupNotificationActions();
    setupForegroundNotificationListener();
    setupNotificationResponseListener();
  }, []);
  

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <ThemeProvider>
          <AppDrawerProvider>
            <NavigationContainer ref={navigationRef}>
              <Stack.Navigator
                initialRouteName="SplashScreen"
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="SplashScreen" component={SplashScreen} />
                <Stack.Screen
                  name="OnboardingScreen"
                  component={OnboardingScreen}
                />
                <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
                <Stack.Screen name="LoginScreen" component={LoginScreen} />
                <Stack.Screen name="HomeScreen" component={HomeScreen} />
                <Stack.Screen
                  name="ScanPrescriptionScreen"
                  component={ScanPrescriptionScreen}
                />
                <Stack.Screen
                  name="ConfirmMedicationScreen"
                  component={ConfirmMedicationScreen}
                />
                <Stack.Screen
                  name="ForgotPassScreen"
                  component={ForgotPassScreen}
                />
                <Stack.Screen
                  name="MedicationDetailScreen"
                  component={MedicationDetailScreen}
                  options={{ title: "Medication Details" }}
                />
                <Stack.Screen
                  name="ProfileEditScreen"
                  component={ProfileEditScreen}
                  options={{ title: "Edit Profile" }}
                />
                <Stack.Screen
                  name="SettingsScreen"
                  component={SettingsScreen}
                />
                <Stack.Screen
                  name="AddDependentsScreen"
                  component={AddDependentsScreen}
                />
                <Stack.Screen
                  name="CaregiverRequestsScreen"
                  component={CaregiverRequestsScreen}
                />
                <Stack.Screen
                  name="ViewPrescriptionsScreen"
                  component={ViewPrescriptionsScreen}
                />
                <Stack.Screen
                  name="EditMedicationRequestScreen"
                  component={EditMedicationRequestScreen}
                />
                <Stack.Screen
                  name="ViewAllMedicines"
                  component={ViewAllMedicines}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </AppDrawerProvider>
        </ThemeProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
    
  );
}
