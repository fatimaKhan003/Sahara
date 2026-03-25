import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const ViewAllMedicines = () => {
  const [meds, setMeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigation = useNavigation();

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to load user', err);
      }
    };
    loadUser();
  }, []);

  // Fetch medications
  useEffect(() => {
    if (!user?._id) return;

    const fetchMedications = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/medications/${user._id}`);
        const data = await res.json();
        setMeds(Array.isArray(data) ? data : data.medications || []);
      } catch (err) {
        console.error('Failed to fetch medications', err);
        setMeds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [user]);

  const getStatus = (doseLogs: any[]) => {
    if (!doseLogs || doseLogs.length === 0) return 'Not Taken';
    if (doseLogs.some(d => d.status === 'taken')) return 'Taken';
    if (doseLogs.some(d => d.status === 'missed')) return 'Missed';
    return 'Not Taken';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView>
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
        <Text style={{ marginLeft: 6, fontSize: 16 }}>Back</Text>
      </TouchableOpacity>

      {meds.length > 0 ? (
        meds.map(med => (
          <View key={med._id} style={styles.medCard}>
            <Text style={styles.name}>{med.name}</Text>
            <Text>Dose: {med.dose}</Text>
            <Text>Status: {getStatus(med.doseLogs)}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noMeds}>No medications found.</Text>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};

export default ViewAllMedicines;

const styles = StyleSheet.create({
  medCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  noMeds: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
});