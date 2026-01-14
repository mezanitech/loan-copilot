import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { smartPromptForReview } from './ratingUtils';

// Achievement tier type
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Achievement category type
export type AchievementCategory = 'tutorial' | 'exploration' | 'savings' | 'poweruser';

// Achievement definition
export interface Achievement {
  id: string;
  category: AchievementCategory;
  tier: AchievementTier;
  title: string;
  description: string;
  icon: string;
  requirement: number; // Number needed to unlock
  progressKey: string; // Key to track progress in storage
}

// User achievement progress
export interface AchievementProgress {
  achievementId: string;
  progress: number; // Current progress
  unlocked: boolean;
  unlockedAt?: string; // ISO date string
}

// All achievements definition
export const ACHIEVEMENTS: Achievement[] = [
  // TUTORIAL ACHIEVEMENTS (Getting Started)
  {
    id: 'first_loan',
    category: 'tutorial',
    tier: 'bronze',
    title: 'First Steps',
    description: 'Create your first loan',
    icon: '🎯',
    requirement: 1,
    progressKey: 'loans_created'
  },
  {
    id: 'first_early_payment',
    category: 'tutorial',
    tier: 'bronze',
    title: 'Extra Mile',
    description: 'Add your first early payment',
    icon: '💰',
    requirement: 1,
    progressKey: 'total_early_payments'
  },
  {
    id: 'first_export',
    category: 'tutorial',
    tier: 'bronze',
    title: 'Reporter',
    description: 'Export your first loan report',
    icon: '📄',
    requirement: 1,
    progressKey: 'reports_exported'
  },
  {
    id: 'view_schedule',
    category: 'tutorial',
    tier: 'bronze',
    title: 'Detail Seeker',
    description: 'View the payment schedule',
    icon: '📊',
    requirement: 1,
    progressKey: 'schedules_viewed'
  },
  
  // EXPLORATION ACHIEVEMENTS (Discovering Features)
  {
    id: 'first_duplicate',
    category: 'exploration',
    tier: 'bronze',
    title: 'What If?',
    description: 'Duplicate a loan to test scenarios',
    icon: '📋',
    requirement: 1,
    progressKey: 'total_duplicates'
  },
  {
    id: 'rate_adjustment',
    category: 'exploration',
    tier: 'silver',
    title: 'Rate Watcher',
    description: 'Add a rate adjustment',
    icon: '📈',
    requirement: 1,
    progressKey: 'rate_adjustments_added'
  },
  {
    id: 'enable_notifications',
    category: 'exploration',
    tier: 'bronze',
    title: 'Stay Informed',
    description: 'Enable payment notifications',
    icon: '🔔',
    requirement: 1,
    progressKey: 'notifications_enabled'
  },
  {
    id: 'change_currency',
    category: 'exploration',
    tier: 'bronze',
    title: 'Global Citizen',
    description: 'Change currency settings',
    icon: '💱',
    requirement: 1,
    progressKey: 'currency_changed'
  },
  {
    id: 'recurring_payment',
    category: 'exploration',
    tier: 'silver',
    title: 'Consistency King',
    description: 'Set up a recurring early payment',
    icon: '🔄',
    requirement: 1,
    progressKey: 'recurring_payments_added'
  },
  
  // SAVINGS ACHIEVEMENTS (Impact Milestones)
  {
    id: 'save_1k',
    category: 'savings',
    tier: 'bronze',
    title: 'Saver',
    description: 'Save $1,000 in interest',
    icon: '💵',
    requirement: 1000,
    progressKey: 'max_interest_saved'
  },
  {
    id: 'save_5k',
    category: 'savings',
    tier: 'silver',
    title: 'Smart Saver',
    description: 'Save $5,000 in interest',
    icon: '💸',
    requirement: 5000,
    progressKey: 'max_interest_saved'
  },
  {
    id: 'save_10k',
    category: 'savings',
    tier: 'gold',
    title: 'Financial Wizard',
    description: 'Save $10,000 in interest',
    icon: '🧙',
    requirement: 10000,
    progressKey: 'max_interest_saved'
  },
  {
    id: 'save_6_months',
    category: 'savings',
    tier: 'silver',
    title: 'Time Saver',
    description: 'Pay off a loan 6 months early',
    icon: '⏱️',
    requirement: 6,
    progressKey: 'max_months_saved'
  },
  {
    id: 'save_1_year',
    category: 'savings',
    tier: 'gold',
    title: 'Freedom Fighter',
    description: 'Pay off a loan 1 year early',
    icon: '🎊',
    requirement: 12,
    progressKey: 'max_months_saved'
  },
  
  // POWER USER ACHIEVEMENTS (Advanced Usage)
  {
    id: 'five_loans',
    category: 'poweruser',
    tier: 'silver',
    title: 'Portfolio Manager',
    description: 'Manage 5 loans at once',
    icon: '📚',
    requirement: 5,
    progressKey: 'max_active_loans'
  },
  {
    id: 'ten_early_payments',
    category: 'poweruser',
    tier: 'silver',
    title: 'Payment Pro',
    description: 'Add 10 early payments across all loans',
    icon: '💎',
    requirement: 10,
    progressKey: 'total_early_payments'
  },
  {
    id: 'three_scenarios',
    category: 'poweruser',
    tier: 'gold',
    title: 'Strategist',
    description: 'Compare 3 different scenarios (duplicates)',
    icon: '🎯',
    requirement: 3,
    progressKey: 'total_duplicates'
  },
  {
    id: 'completionist',
    category: 'poweruser',
    tier: 'platinum',
    title: 'Achievement Hunter',
    description: 'Unlock all other achievements',
    icon: '🏆',
    requirement: 17, // Total other achievements
    progressKey: 'achievements_unlocked'
  }
];

const STORAGE_KEY = 'achievement_progress';

// Initialize achievement progress
export async function initializeAchievements(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const initialProgress: AchievementProgress[] = ACHIEVEMENTS.map(achievement => ({
        achievementId: achievement.id,
        progress: 0,
        unlocked: false
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialProgress));
    }
  } catch (error) {
    console.error('Error initializing achievements:', error);
  }
}

// Get all achievement progress
export async function getAchievementProgress(): Promise<AchievementProgress[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error getting achievement progress:', error);
  }
  return [];
}

// Update progress for a specific key
export async function updateProgress(progressKey: string, value: number): Promise<Achievement[]> {
  try {
    const progress = await getAchievementProgress();
    const newlyUnlocked: Achievement[] = [];
    
    // Find all achievements that use this progress key
    const relevantAchievements = ACHIEVEMENTS.filter(a => a.progressKey === progressKey);
    
    for (const achievement of relevantAchievements) {
      const progressItem = progress.find(p => p.achievementId === achievement.id);
      if (progressItem && !progressItem.unlocked) {
        progressItem.progress = value;
        
        // Check if achievement is now unlocked
        if (progressItem.progress >= achievement.requirement) {
          progressItem.unlocked = true;
          progressItem.unlockedAt = new Date().toISOString();
          newlyUnlocked.push(achievement);
          
          // Send notification
          await sendAchievementNotification(achievement);
        }
      }
    }
    
    // Check for completionist achievement
    const unlockedCount = progress.filter(p => p.unlocked && p.achievementId !== 'completionist').length;
    const completionistProgress = progress.find(p => p.achievementId === 'completionist');
    if (completionistProgress && !completionistProgress.unlocked && unlockedCount >= 17) {
      completionistProgress.unlocked = true;
      completionistProgress.progress = unlockedCount;
      completionistProgress.unlockedAt = new Date().toISOString();
      const completionistAchievement = ACHIEVEMENTS.find(a => a.id === 'completionist');
      if (completionistAchievement) {
        newlyUnlocked.push(completionistAchievement);
        await sendAchievementNotification(completionistAchievement);
      }
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    
    // Smart prompt for app review after 5 achievements unlocked
    if (unlockedCount >= 5) {
      setTimeout(() => smartPromptForReview(), 1000);
    }
    
    return newlyUnlocked;
  } catch (error) {
    console.error('Error updating progress:', error);
    return [];
  }
}

// Increment progress for a specific key
export async function incrementProgress(progressKey: string, amount: number = 1): Promise<Achievement[]> {
  try {
    const progress = await getAchievementProgress();
    const newlyUnlocked: Achievement[] = [];
    
    // Find all achievements that use this progress key
    const relevantAchievements = ACHIEVEMENTS.filter(a => a.progressKey === progressKey);
    
    for (const achievement of relevantAchievements) {
      const progressItem = progress.find(p => p.achievementId === achievement.id);
      if (progressItem && !progressItem.unlocked) {
        progressItem.progress += amount;
        
        // Check if achievement is now unlocked
        if (progressItem.progress >= achievement.requirement) {
          progressItem.unlocked = true;
          progressItem.unlockedAt = new Date().toISOString();
          newlyUnlocked.push(achievement);
          
          // Send notification
          await sendAchievementNotification(achievement);
        }
      }
    }
    
    // Update completionist progress
    await updateCompletionistProgress(progress);
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return newlyUnlocked;
  } catch (error) {
    console.error('Error incrementing progress:', error);
    return [];
  }
}

// Update completionist achievement
async function updateCompletionistProgress(progress: AchievementProgress[]): Promise<void> {
  const unlockedCount = progress.filter(p => p.unlocked && p.achievementId !== 'completionist').length;
  const completionistProgress = progress.find(p => p.achievementId === 'completionist');
  
  if (completionistProgress) {
    completionistProgress.progress = unlockedCount;
    
    if (!completionistProgress.unlocked && unlockedCount >= 17) {
      completionistProgress.unlocked = true;
      completionistProgress.unlockedAt = new Date().toISOString();
      const completionistAchievement = ACHIEVEMENTS.find(a => a.id === 'completionist');
      if (completionistAchievement) {
        await sendAchievementNotification(completionistAchievement);
      }
    }
  }
}

// Send notification when achievement is unlocked
async function sendAchievementNotification(achievement: Achievement): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 Achievement Unlocked!`,
        body: `${achievement.icon} ${achievement.title} - ${achievement.description}`,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error sending achievement notification:', error);
  }
}

// Get tier color
export function getTierColor(tier: AchievementTier): string {
  switch (tier) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#C0C0C0';
    case 'gold': return '#FFD700';
    case 'platinum': return '#E5E4E2';
    default: return '#888888';
  }
}

// Get tier display name
export function getTierDisplayName(tier: AchievementTier): string {
  switch (tier) {
    case 'bronze': return 'Bronze';
    case 'silver': return 'Silver';
    case 'gold': return 'Gold';
    case 'platinum': return 'Platinum';
    default: return 'Unknown';
  }
}

// Get category display name
export function getCategoryDisplayName(category: AchievementCategory): string {
  switch (category) {
    case 'tutorial': return 'Getting Started';
    case 'exploration': return 'Explorer';
    case 'savings': return 'Financial Impact';
    case 'poweruser': return 'Power User';
    default: return 'Unknown';
  }
}

// Calculate overall completion percentage
export async function getCompletionPercentage(): Promise<number> {
  const progress = await getAchievementProgress();
  const unlocked = progress.filter(p => p.unlocked).length;
  return Math.round((unlocked / ACHIEVEMENTS.length) * 100);
}

// Get unlocked count
export async function getUnlockedCount(): Promise<number> {
  const progress = await getAchievementProgress();
  return progress.filter(p => p.unlocked).length;
}
