import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../api";
import { useNavigation } from "@react-navigation/native";

import {
  PieChart,
  BarChart,
  LineChart,
} from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const AdherenceScreen = () => {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isCaregiver, setIsCaregiver] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<
    "personal" | "caregiver"
  >("personal");

  const [dependents, setDependents] = useState<any[]>([]);
  const [selectedDependent, setSelectedDependent] = useState("all");

  const navigation = useNavigation();

  const fetchAdherence = async () => {
    try {
      setLoading(true);

      const userData = await AsyncStorage.getItem("user");
      const user = JSON.parse(userData || "{}");

      if (!user?._id) return;

      
      const caregiverRes = await fetch(
        `${API_BASE}/api/caregiver/${user._id}/is-caregiver`
      );

      const caregiverData = await caregiverRes.json();

      setIsCaregiver(caregiverData.isCaregiver);

      const storedMode = await AsyncStorage.getItem("dashboardMode");

      const mode =
        storedMode === "caregiver" && caregiverData.isCaregiver
          ? "caregiver"
          : "personal";

      setDashboardMode(mode);

      let targetUserId = user._id;

     
      if (mode === "caregiver") {
        const depRes = await fetch(
          `${API_BASE}/api/caregiver/${user._id}/dependents`
        );

        const depList = await depRes.json();

        setDependents(depList || []);

        if (selectedDependent !== "all") {
          const selected = depList.find(
            (d: any) => d.name === selectedDependent
          );

          if (selected) {
            targetUserId = selected._id;
          }
        }
      }

      const res = await fetch(
        `${API_BASE}/api/medications/adherence/${targetUserId}?period=${period}`
      );

      const result = await res.json();

      setData(result);
    } catch (err) {
      console.error("Adherence fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdherence();
  }, [period, selectedDependent, dashboardMode]);

  const renderButton = (label: any) => (
    <TouchableOpacity
      style={[
        styles.periodBtn,
        period === label && styles.activeBtn,
      ]}
      onPress={() => setPeriod(label)}
    >
      <Text
        style={{
          color: period === label ? "#fff" : "#000",
          fontWeight: "600",
        }}
      >
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const total = data?.total || 0;
  const taken = data?.taken || 0;
  const missed = data?.missed || 0;
  const percentage = data?.percentage || 0;

  
  const pieData = [
    {
      name: "Taken",
      population: taken,
      color: "#22C55E",
      legendFontColor: "#111",
      legendFontSize: 13,
    },
    {
      name: "Missed",
      population: missed,
      color: "#EF4444",
      legendFontColor: "#111",
      legendFontSize: 13,
    },
  ];

  
  const barData = {
    labels: ["Taken", "Missed"],
    datasets: [
      {
        data: [taken, missed],
      },
    ],
  };

  
  const lineData = {
    labels:
      period === "daily"
        ? ["6AM", "9AM", "12PM", "3PM", "6PM", "9PM"]
        : period === "weekly"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["W1", "W2", "W3", "W4"],

    datasets: [
      {
        data:
          period === "daily"
            ? [60, 75, 80, 90, 85, percentage]
            : period === "weekly"
            ? [70, 82, 76, 90, 88, 91, percentage]
            : [65, 78, 84, percentage],
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,

    color: (opacity = 1) =>
      `rgba(37, 99, 235, ${opacity})`,

    labelColor: () => "#111",

    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#2563EB",
    },

    style: {
      borderRadius: 16,
    },
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            navigation.navigate("HomeScreen");
            console.log("canGoBack:", navigation.canGoBack());
          }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {dashboardMode === "caregiver"
            ? "Dependents Adherence"
            : "Adherence Report"}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      
      {dashboardMode === "caregiver" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 15 }}
        >
          {["all", ...dependents.map((d) => d.name)].map(
            (dep, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDependent(dep)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor:
                    selectedDependent === dep
                      ? "#2563EB"
                      : "#E5E7EB",
                  borderRadius: 10,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    color:
                      selectedDependent === dep
                        ? "#fff"
                        : "#000",
                  }}
                >
                  {dep === "all" ? "All" : dep}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      )}

      
      <View style={styles.periodContainer}>
        {renderButton("daily")}
        {renderButton("weekly")}
        {renderButton("monthly")}
      </View>

      
      <View style={styles.mainCard}>
        <Text style={styles.mainPercent}>{percentage}%</Text>

        <Text style={styles.subText}>
          Adherence Rate
        </Text>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{total}</Text>
          </View>

          <View>
            <Text style={styles.statLabel}>Taken</Text>

            <Text
              style={[
                styles.statValue,
                { color: "#22C55E" },
              ]}
            >
              {taken}
            </Text>
          </View>

          <View>
            <Text style={styles.statLabel}>Missed</Text>

            <Text
              style={[
                styles.statValue,
                { color: "#EF4444" },
              ]}
            >
              {missed}
            </Text>
          </View>
        </View>
      </View>

     
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Overview
        </Text>

        <View style={styles.barBlock}>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel}>
              Taken
            </Text>

            <Text style={styles.barValue}>
              {taken} (
              {total
                ? Math.round((taken / total) * 100)
                : 0}
              %)
            </Text>
          </View>

          <View style={styles.barBackground}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${
                    total
                      ? (taken / total) * 100
                      : 0
                  }%`,
                  backgroundColor: "#22C55E",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.barBlock}>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel}>
              Missed
            </Text>

            <Text style={styles.barValue}>
              {missed} (
              {total
                ? Math.round((missed / total) * 100)
                : 0}
              %)
            </Text>
          </View>

          <View style={styles.barBackground}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${
                    total
                      ? (missed / total) * 100
                      : 0
                  }%`,
                  backgroundColor: "#EF4444",
                },
              ]}
            />
          </View>
        </View>
      </View>

     
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Medication Distribution
        </Text>

        <PieChart
          data={pieData}
          width={screenWidth - 70}
          height={220}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          absolute
        />
      </View>

      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Taken vs Missed
        </Text>

        <BarChart
          data={barData}
          width={screenWidth - 70}
          height={230}
          fromZero
          showValuesOnTopOfBars
          yAxisLabel=""
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          style={{
            borderRadius: 16,
          }}
        />
      </View>

      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Adherence Trend
        </Text>

        <LineChart
          data={lineData}
          width={screenWidth - 70}
          height={230}
          chartConfig={chartConfig}
          bezier
          style={{
            borderRadius: 16,
          }}
        />
      </View>

      
      <View style={styles.insightBox}>
        <Text style={styles.insightText}>
          {percentage >= 80
            ? "Great job! You're following your medication plan very well 👍"
            : percentage >= 50
            ? "You're doing okay, but there’s room for improvement ⚠️"
            : "Adherence is low. Try setting reminders or consulting caregiver ❗"}
        </Text>
      </View>
    </ScrollView>
  );
};

export default AdherenceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F8FAFC",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 18,
    fontWeight: "700",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  periodContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
    alignItems: "center",
  },

  activeBtn: {
    backgroundColor: "#2563EB",
  },

  mainCard: {
    backgroundColor: "#2563EB",
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
  },

  mainPercent: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
  },

  subText: {
    color: "#E0E7FF",
    marginBottom: 15,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 15,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statLabel: {
    color: "#E0E7FF",
    fontSize: 12,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,

    elevation: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  barBlock: {
    marginTop: 12,
  },

  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  barLabel: {
    fontWeight: "500",
  },

  barValue: {
    fontWeight: "600",
  },

  barBackground: {
    height: 14,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 10,
  },

  insightBox: {
    marginTop: 10,
    marginBottom: 30,
    padding: 16,
    backgroundColor: "#ECFEFF",
    borderRadius: 14,
  },

  insightText: {
    color: "#0369A1",
    fontSize: 14,
    lineHeight: 22,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});