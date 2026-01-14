import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const RATING_STORAGE_KEY = '@rating_preferences';

interface RatingPreferences {
  hasRated: boolean;
  lastPromptDate?: string;
  promptCount: number;
  dismissedCount: number;
}

/**
 * Get current rating preferences from storage
 */
export async function getRatingPreferences(): Promise<RatingPreferences> {
  try {
    const data = await AsyncStorage.getItem(RATING_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading rating preferences:', error);
  }
  
  return {
    hasRated: false,
    promptCount: 0,
    dismissedCount: 0,
  };
}

/**
 * Save rating preferences to storage
 */
async function saveRatingPreferences(prefs: RatingPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving rating preferences:', error);
  }
}

/**
 * Check if we should show a rating prompt based on smart rules
 * Returns true if enough time has passed and user hasn't rated yet
 */
export async function shouldShowRatingPrompt(): Promise<boolean> {
  const prefs = await getRatingPreferences();
  
  // Never prompt if user already rated
  if (prefs.hasRated) {
    return false;
  }
  
  // Don't prompt if dismissed more than 2 times
  if (prefs.dismissedCount >= 2) {
    return false;
  }
  
  // If never prompted before, allow it
  if (!prefs.lastPromptDate) {
    return true;
  }
  
  // If prompted before, wait at least 7 days
  const lastPrompt = new Date(prefs.lastPromptDate);
  const daysSinceLastPrompt = (Date.now() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceLastPrompt >= 7;
}

/**
 * Request app store review with native prompt
 * This uses the system dialog that can't be customized
 */
export async function requestAppReview(): Promise<void> {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    
    if (isAvailable) {
      const prefs = await getRatingPreferences();
      
      // Update preferences
      await saveRatingPreferences({
        ...prefs,
        lastPromptDate: new Date().toISOString(),
        promptCount: prefs.promptCount + 1,
      });
      
      // Request review
      await StoreReview.requestReview();
    }
  } catch (error) {
    console.error('Error requesting app review:', error);
  }
}

/**
 * Mark that user has rated the app (or dismissed)
 * Call this after user manually navigates to store or dismisses prompt
 */
export async function markAsRated(): Promise<void> {
  const prefs = await getRatingPreferences();
  await saveRatingPreferences({
    ...prefs,
    hasRated: true,
  });
}

/**
 * Mark that user dismissed the prompt
 */
export async function markAsDismissed(): Promise<void> {
  const prefs = await getRatingPreferences();
  await saveRatingPreferences({
    ...prefs,
    dismissedCount: prefs.dismissedCount + 1,
    lastPromptDate: new Date().toISOString(),
  });
}

/**
 * Open the App Store page for manual rating
 * This bypasses the native prompt and opens the store directly
 */
export async function openAppStore(): Promise<void> {
  try {
    const storeUrl = await StoreReview.storeUrl();
    if (storeUrl) {
      await StoreReview.requestReview();
      // Mark as rated since they showed intent
      await markAsRated();
    }
  } catch (error) {
    console.error('Error opening app store:', error);
  }
}

/**
 * Smart prompt that checks conditions before requesting review
 * Use this when user hits a milestone (e.g., 5 achievements, 3 loans)
 */
export async function smartPromptForReview(): Promise<boolean> {
  const shouldPrompt = await shouldShowRatingPrompt();
  
  if (shouldPrompt) {
    await requestAppReview();
    return true;
  }
  
  return false;
}
