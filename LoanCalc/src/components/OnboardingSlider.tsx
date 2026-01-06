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
import { theme } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSliderProps {
  visible: boolean;
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    title: 'Drowning in Debt?',
    description: 'Multiple loans, scattered payments, unclear timelines. Sound familiar? You\'re not alone, and there\'s a better way.',
    icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide1.webp'),
  },
  {
    id: 2,
    title: 'Take Control Today',
    description: 'See all your loans in one beautiful dashboard. Track total debt, monthly payments, and remaining balances with crystal-clear visuals.',
    icon: 'stats-chart' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide2.webp'),
  },
  {
    id: 3,
    title: 'Crush Your Debt Faster',
    description: 'Discover how extra payments can save you thousands in interest and shave years off your loans. See the impact instantly.',
    icon: 'flash' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide3.webp'),
  },
  {
    id: 4,
    title: 'Smart Payment Plans',
    description: 'Use proven strategies like Avalanche (highest interest first) or Snowball (smallest balance first) to optimize your payoff journey.',
    icon: 'bulb' as keyof typeof Ionicons.glyphMap,
    image: require('../../assets/onboarding/slide4.webp'),
  },
  {
    id: 5,
    title: 'Your Journey to Freedom',
    description: 'Watch your progress with beautiful charts. See your balance shrink, track where every dollar goes, and celebrate milestones along the way.',
    icon: 'trending-up' as keyof typeof Ionicons.glyphMap,
    image: [
      require('../../assets/onboarding/slide5.webp'),
      require('../../assets/onboarding/slide6.webp'),
    ],
  },
  {
    id: 6,
    title: 'Ready to Begin?',
    description: 'Create your first loan in seconds. Get instant payment schedules, savings projections, and a clear path to being debt-free.',
    icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    image: undefined,
    showLogo: true,
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
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
              ) : slide.showLogo ? (
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.iconContainer}>
                  <Ionicons name={slide.icon} size={80} color={theme.colors.primary} />
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
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 50,
    paddingBottom: 10,
  },
  skipButton: {
    padding: 10,
  },
  skipButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
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
  logoContainer: {
    marginBottom: 40,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  imageFrame: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 8,
    marginBottom: 30,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 6,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
  },
  dualSlideImage: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: 8,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
  dotInactive: {
    backgroundColor: theme.colors.gray300,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  nextButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: theme.spacing.xl,
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: theme.colors.gray200,
    borderRadius: 2,
    marginTop: 30,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    marginTop: 10,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
});
