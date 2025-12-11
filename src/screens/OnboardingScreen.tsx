import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const OnboardingScreen = () => {
  const { t } = useTranslation();
  
  const slides = [
    {
      id: '1',
      title: t('onboarding.slide1.title'),
      subtitle: t('onboarding.slide1.subtitle'),
      image: require('../assets/IntroScreenPic.png'),
    },
    {
      id: '2',
      title: t('onboarding.slide2.title'),
      subtitle: t('onboarding.slide2.subtitle'),
      image: require('../assets/onboarding2.png'),
    },
    {
      id: '3',
      title: t('onboarding.slide3.title'),
      subtitle: t('onboarding.slide3.subtitle'),
      image: require('../assets/onboarding3.png'),
    },
  ];

  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (route.params?.goToLastSlide && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: slides.length - 1, animated: false });
      setCurrentIndex(slides.length - 1);
    }
  }, [route.params]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const handleSkip = () => navigation.navigate('SignUpScreen', { fromOnboarding: true });
  const handleCreateAccount = () => navigation.navigate('SignUpScreen', { fromOnboarding: true });
  const handleLogin = () => navigation.navigate('LoginScreen', { fromOnboarding: true }); // Update if you add a LoginScreen later

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }).current;

  return (
    <SafeAreaView style={styles.container}>
      {currentIndex > 0 && (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      )}

      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={slides}
        ref={flatListRef}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>

      {/* Buttons: wrap them so we can shift upward */}
      <View style={styles.buttonsContainer}>
        {currentIndex === slides.length - 1 ? (
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateAccount}>
              <Text style={styles.primaryText}>{t('common.createAccount')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
              <Text style={styles.secondaryText}>{t('common.login')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>{t('common.next')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 60 },
  backButton: { position: 'absolute', top: 60, left: 25, zIndex: 2 },
  skipButton: { position: 'absolute', top: 60, right: 25, zIndex: 2 },
  skipText: { fontSize: 16, color: '#888' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  image: { width: 300, height: 300, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: '#000', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
  dotsContainer: { flexDirection: 'row', marginTop: 25, marginBottom: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#3A63F3' },
  nextButton: { backgroundColor: '#3A63F3', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 80, position: 'absolute', bottom: 50 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  bottomButtons: { position: 'absolute', bottom: 40, alignItems: 'center' },
  primaryButton: { backgroundColor: '#3A63F3', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 100, marginBottom: 15 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 120 },
  secondaryText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  buttonsContainer: {
    alignItems: 'center',
    justifyContent: 'center',

    // Option A: simple lift using margin
    marginBottom: 40, // increase to move buttons further up, decrease to move down

    // Option B (alternative, uncomment to use): fixed position relative to bottom
    // position: 'absolute',
    // left: 20,
    // right: 20,
    // bottom: 80, // increase to move up
  },
});
