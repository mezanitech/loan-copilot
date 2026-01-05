import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSliderProps {
  visible: boolean;
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    title: 'Track All Your Loans',
    description: 'Manage multiple loans in one place. See your total debt, monthly payments, and remaining balances with interactive pie charts.',
    icon: 'stats-chart' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide1.webp'),
  },
  {
    id: 2,
    title: 'Smart Payment Strategies',
    description: 'Add extra payments using Avalanche (highest interest) or Snowball (smallest balance) methods to save thousands in interest.',
    icon: 'calculator' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide2.webp'),
  },
  {
    id: 3,
    title: 'Visualize Your Progress',
    description: 'Beautiful charts show your balance shrinking over time. See exactly where your money goes with principal vs interest breakdown.',
    icon: 'trending-down' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide3.webp'),
  },
  {
    id: 4,
    title: 'Export & Share',
    description: 'Generate detailed PDF reports of your loans and payment schedules. Share or keep for your records.',
    icon: 'document-text' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide4.webp'),
  },
  {
    id: 5,
    title: 'Get Started',
    description: 'Create your first loan to see payment schedules, savings calculators, and how extra payments can help you become debt-free faster.',
    icon: 'rocket' as keyof typeof Ionicons.glyphMap,
    image: [
      require('../../assets/onboarding/slide5.webp'),
      require('../../assets/onboarding/slide6.webp'),
    ],
  },
];

export default function OnboardingSlider({ visible, onComplete }: OnboardingSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Preload all images when component mounts
  useEffect(() => {
    if (visible) {
      preloadImages();
    }
  }, [visible]);

  const preloadImages = async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    
    const imagesToLoad = slides
      .filter(slide => slide.image)
      .flatMap(slide => Array.isArray(slide.image) ? slide.image : [slide.image]);
    
    if (imagesToLoad.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const total = imagesToLoad.length;
      let loaded = 0;

      await Promise.all(
        imagesToLoad.map(async (image) => {
          await Asset.fromModule(image).downloadAsync();
          loaded++;
          setLoadingProgress((loaded / total) * 100);
        })
      );
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error preloading images:', error);
      setIsLoading(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onComplete}
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${loadingProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(loadingProgress)}%</Text>
          </View>
        ) : (
          <>
        {/* Header with Skip button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide) => (
            <View key={slide.id} style={styles.slide}>
              {slide.image ? (
                Array.isArray(slide.image) ? (
                  <View style={styles.dualImageContainer}>
                    {slide.image.map((img, index) => (
                      <View key={index} style={styles.dualImageFrame}>
                        <Image source={img} style={styles.dualSlideImage} resizeMode="contain" />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.imageFrame}>
                    <Image source={slide.image} style={styles.slideImage} resizeMode="contain" />
                  </View>
                )
              ) : (
                <View style={styles.iconContainer}>
                  <Ionicons name={slide.icon} size={80} color="#007AFF" />
                </View>
              )}
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Next/Get Started button */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={goToNext} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
        </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  skipButton: {
    padding: 10,
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  imageFrame: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  slideImage: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 1.15,
    borderRadius: 12,
  },
  dualImageContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  dualImageFrame: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dualSlideImage: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  dotInactive: {
    backgroundColor: '#D1D1D6',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginTop: 30,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 10,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
