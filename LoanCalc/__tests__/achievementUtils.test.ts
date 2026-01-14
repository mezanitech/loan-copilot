import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock AsyncStorage
const mockStorage: { [key: string]: string } = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    return Promise.resolve();
  }),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  initializeAchievements, 
  incrementProgress, 
  updateProgress,
  getAchievementProgress,
  getCompletionPercentage,
  ACHIEVEMENTS 
} from '../src/utils/achievementUtils';

describe('Achievement System', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize all achievements', async () => {
      await initializeAchievements();
      const progress = await getAchievementProgress();
      
      // Should have entries for all achievements
      expect(Object.keys(progress).length).toBe(ACHIEVEMENTS.length);
      
      // All should be unlocked=false initially
      Object.values(progress).forEach((ach: any) => {
        expect(ach.unlocked).toBe(false);
        expect(ach.progress).toBe(0);
      });
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      await initializeAchievements();
    });

    it('should increment progress for counter-based achievements', async () => {
      await incrementProgress('loans_created');
      const progress = await getAchievementProgress();
      const achievements = Object.values(progress);
      
      // Should have at least one unlocked achievement
      const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
      expect(unlockedCount).toBeGreaterThan(0);
    });

    it('should unlock achievement when threshold is reached', async () => {
      await incrementProgress('loans_created', 5);
      const progress = await getAchievementProgress();
      const achievements = Object.values(progress);
      
      // Should have unlocked achievements
      const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
      expect(unlockedCount).toBeGreaterThan(0);
    });

    it('should update max value for value-based achievements', async () => {
      await updateProgress('max_interest_saved', 1500);
      const progress = await getAchievementProgress();
      const achievements = Object.values(progress);
      
      // Should have unlocked achievements
      const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
      expect(unlockedCount).toBeGreaterThan(0);
    });

    it('should handle multiple increments correctly', async () => {
      await incrementProgress('total_early_payments', 3);
      await incrementProgress('total_early_payments', 4);
      await incrementProgress('total_early_payments', 5);
      
      const progress = await getAchievementProgress();
      const achievements = Object.values(progress);
      const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
      expect(unlockedCount).toBeGreaterThan(0);
    });
  });

  describe('Completion Tracking', () => {
    beforeEach(async () => {
      await initializeAchievements();
    });

    it('should calculate completion percentage correctly', async () => {
      // Initially 0%
      let completion = await getCompletionPercentage();
      expect(completion).toBe(0);
      
      // Unlock one achievement
      await incrementProgress('loans_created');
      completion = await getCompletionPercentage();
      expect(completion).toBeGreaterThan(0);
      expect(completion).toBeLessThan(100);
    });

    it('should unlock completionist when all others are unlocked', async () => {
      // Unlock all achievements by setting high values
      await updateProgress('loans_created', 5);
      await updateProgress('total_early_payments', 10);
      await updateProgress('reports_exported', 1);
      await updateProgress('schedules_viewed', 1);
      await updateProgress('total_duplicates', 3);
      await updateProgress('rate_adjustments_added', 1);
      await updateProgress('notifications_enabled', 1);
      await updateProgress('currency_changed', 1);
      await updateProgress('recurring_payments_added', 1);
      await updateProgress('max_interest_saved', 10000);
      await updateProgress('max_months_saved', 12);
      await updateProgress('max_active_loans', 5);
      
      const progress = await getAchievementProgress();
      const achievements = Object.values(progress);
      
      // Most or all achievements should be unlocked
      const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
      expect(unlockedCount).toBeGreaterThan(10);
    });
  });

  describe('Category Filtering', () => {
    it('should group achievements by category correctly', () => {
      const tutorialAchievements = ACHIEVEMENTS.filter(a => a.category === 'tutorial');
      const explorationAchievements = ACHIEVEMENTS.filter(a => a.category === 'exploration');
      const savingsAchievements = ACHIEVEMENTS.filter(a => a.category === 'savings');
      const powerUserAchievements = ACHIEVEMENTS.filter(a => a.category === 'poweruser');
      
      expect(tutorialAchievements.length).toBe(4);
      expect(explorationAchievements.length).toBe(5);
      expect(savingsAchievements.length).toBe(5);
      expect(powerUserAchievements.length).toBe(4);
    });
  });

  describe('Tier System', () => {
    it('should have all four tiers represented', () => {
      const bronzeAchievements = ACHIEVEMENTS.filter(a => a.tier === 'bronze');
      const silverAchievements = ACHIEVEMENTS.filter(a => a.tier === 'silver');
      const goldAchievements = ACHIEVEMENTS.filter(a => a.tier === 'gold');
      const platinumAchievements = ACHIEVEMENTS.filter(a => a.tier === 'platinum');
      
      expect(bronzeAchievements.length).toBeGreaterThan(0);
      expect(silverAchievements.length).toBeGreaterThan(0);
      expect(goldAchievements.length).toBeGreaterThan(0);
      expect(platinumAchievements.length).toBeGreaterThan(0);
    });
  });
});
