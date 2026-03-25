import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Alert, Modal, Dimensions, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const PRESCRIPTIONS_KEY = 'saved_prescriptions';
const { width, height } = Dimensions.get('window');

type Prescription = {
  id: string;
  imageUri: string;
  date: string;
};

export default function ViewPrescriptionsScreen() {
  const { theme } = useContext(ThemeContext);
  const darkMode = theme === 'dark';
  const navigation = useNavigation<any>();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(PRESCRIPTIONS_KEY);
      setPrescriptions(data ? JSON.parse(data) : []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const deletePrescription = (id: string) => {
    Alert.alert(
      'Delete Prescription',
      'Are you sure you want to delete this prescription?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = prescriptions.filter(p => p.id !== id);
            setPrescriptions(updated);
            await AsyncStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
  if (!iso) return "No date";

  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Invalid Date";

  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

  const renderItem = ({ item }: { item: Prescription }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: darkMode ? '#2C2C2C' : '#fff' }]}
      onPress={() => setSelectedImage(item.imageUri)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.imageUri }} style={styles.thumbnail} resizeMode="cover" />
      <View style={styles.cardInfo}>
        <Ionicons name="document-text-outline" size={18} color="#1E5AF2" />
        <Text style={[styles.dateText, { color: darkMode ? '#ccc' : '#333' }]}>
          {formatDate(item.date)}
        </Text>
      </View>
      <TouchableOpacity onPress={() => deletePrescription(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#1E1E1E' : '#F6F8FF' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={darkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: darkMode ? '#fff' : '#000' }]}>
          My Prescriptions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {prescriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={[styles.emptyText, { color: darkMode ? '#aaa' : '#888' }]}>
            No prescriptions saved yet.
          </Text>
          <Text style={[styles.emptySubText, { color: darkMode ? '#666' : '#aaa' }]}>
            Scan a prescription to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        />
      )}

      {/* Full screen image viewer */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    marginBottom: 12, padding: 10, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  thumbnail: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, flexShrink: 1 },
  deleteBtn: { padding: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubText: { fontSize: 13 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: width, height: height * 0.8 },
});