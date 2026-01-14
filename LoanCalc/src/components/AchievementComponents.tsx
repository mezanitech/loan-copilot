import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { 
  Achievement, 
  AchievementProgress, 
  getTierColor, 
  getTierDisplayName, 
  getCategoryDisplayName,
  AchievementCategory 
} from '../utils/achievementUtils';

interface AchievementCardProps {
  achievement: Achievement;
  progress: AchievementProgress;
}

export function AchievementCard({ achievement, progress }: AchievementCardProps) {
  const isUnlocked = progress.unlocked;
  const progressPercentage = Math.min((progress.progress / achievement.requirement) * 100, 100);
  const tierColor = getTierColor(achievement.tier);
  
  return (
    <View style={[styles.card, !isUnlocked && styles.cardLocked]}>
      <View style={[styles.iconContainer, { backgroundColor: isUnlocked ? tierColor + '20' : theme.colors.gray100 }]}>
        <Text style={styles.icon}>{isUnlocked ? achievement.icon : '🔒'}</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, !isUnlocked && styles.titleLocked]}>{achievement.title}</Text>
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{getTierDisplayName(achievement.tier)}</Text>
          </View>
        </View>
        
        <Text style={[styles.description, !isUnlocked && styles.descriptionLocked]}>
          {achievement.description}
        </Text>
        
        {!isUnlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progressPercentage}%`, backgroundColor: tierColor }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {progress.progress} / {achievement.requirement}
            </Text>
          </View>
        )}
        
        {isUnlocked && progress.unlockedAt && (
          <Text style={styles.unlockedDate}>
            Unlocked {new Date(progress.unlockedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );
}

interface AchievementGridProps {
  achievements: Achievement[];
  progressData: AchievementProgress[];
  category?: AchievementCategory;
}

export function AchievementGrid({ achievements, progressData, category }: AchievementGridProps) {
  const filteredAchievements = category 
    ? achievements.filter(a => a.category === category)
    : achievements;
  
  // Sort: unlocked first, then by tier
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const progressA = progressData.find(p => p.achievementId === a.id);
    const progressB = progressData.find(p => p.achievementId === b.id);
    
    if (progressA?.unlocked !== progressB?.unlocked) {
      return progressA?.unlocked ? -1 : 1;
    }
    
    const tierOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });
  
  return (
    <View style={styles.grid}>
      {sortedAchievements.map(achievement => {
        const progress = progressData.find(p => p.achievementId === achievement.id) || {
          achievementId: achievement.id,
          progress: 0,
          unlocked: false
        };
        
        return (
          <AchievementCard 
            key={achievement.id} 
            achievement={achievement} 
            progress={progress} 
          />
        );
      })}
    </View>
  );
}

interface AchievementCategoryTabsProps {
  selectedCategory: AchievementCategory | 'all';
  onSelectCategory: (category: AchievementCategory | 'all') => void;
  progressData: AchievementProgress[];
  achievements: Achievement[];
}

export function AchievementCategoryTabs({ 
  selectedCategory, 
  onSelectCategory,
  progressData,
  achievements 
}: AchievementCategoryTabsProps) {
  const categories: (AchievementCategory | 'all')[] = ['all', 'tutorial', 'exploration', 'savings', 'poweruser'];
  
  const getCategoryCount = (category: AchievementCategory | 'all') => {
    const categoryAchievements = category === 'all' 
      ? achievements 
      : achievements.filter(a => a.category === category);
    
    const unlocked = categoryAchievements.filter(a => {
      const progress = progressData.find(p => p.achievementId === a.id);
      return progress?.unlocked;
    }).length;
    
    return { unlocked, total: categoryAchievements.length };
  };
  
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {categories.map(category => {
        const { unlocked, total } = getCategoryCount(category);
        const isSelected = selectedCategory === category;
        
        return (
          <TouchableOpacity
            key={category}
            style={[styles.tab, isSelected && styles.tabSelected]}
            onPress={() => onSelectCategory(category)}
          >
            <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
              {category === 'all' ? 'All' : getCategoryDisplayName(category)}
            </Text>
            <Text style={[styles.tabCount, isSelected && styles.tabCountSelected]}>
              {unlocked}/{total}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.glass,
  },
  cardLocked: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  titleLocked: {
    color: theme.colors.textSecondary,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  tierText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  descriptionLocked: {
    color: theme.colors.textTertiary,
  },
  progressContainer: {
    marginTop: theme.spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.gray100,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  unlockedDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontStyle: 'italic',
  },
  grid: {
    padding: theme.spacing.md,
  },
  tabsContainer: {
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
  },
  tabSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  tabTextSelected: {
    color: theme.colors.textInverse,
  },
  tabCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tabCountSelected: {
    color: theme.colors.textInverse,
  },
});
