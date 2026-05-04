import React, { useEffect, useState } from "react";
import { StyleSheet, Text, Image, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SplashScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          checkLoginStatus();
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await AsyncStorage.getItem("user");
      const onboardingCompleted = await AsyncStorage.getItem("onboardingCompleted");

      if (user) {
        navigation.replace("HomeScreen");
      } else if (onboardingCompleted === "true") {
        navigation.replace("LoginScreen");
      } else {
        navigation.replace("OnboardingScreen");
      }
    } catch (err) {
      console.error("Auth check error:", err);
      navigation.replace("OnboardingScreen");
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/Logo.png")} style={styles.logo} />

      <Text style={styles.taglineSub}>Apki Ki Zindagi ka </Text>
      <Text style={styles.title}>SAHARA</Text>
      <View style={styles.divider} />

      <View style={styles.progressContainer}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1256DB",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginBottom: 20,
  },
  title: {
    fontSize: 46,
    color: "white",
    fontWeight: "700",
    marginBottom: 12,
  },
  taglineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  taglineSub: {
    fontSize: 20,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontStyle: "italic",
    letterSpacing: 1,
    marginBottom: 4,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  taglineBold: {
    fontSize: 20,
    color: "white",
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
    marginBottom: 30,
  },
  progressContainer: {
    width: "70%",
    height: 8,
    backgroundColor: "#3a7af0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
  },
  progressText: {
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
});
