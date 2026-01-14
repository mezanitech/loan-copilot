import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { theme } from '../constants/theme';
import { Achievement, getTierColor, getTierDisplayName } from '../utils/achievementUtils';

interface AchievementUnlockedModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

export default function AchievementUnlockedModal({ 
  visible, 
  achievement, 
  onClose 
}: AchievementUnlockedModalProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);
  
  if (!achievement) return null;
  
  const tierColor = getTierColor(achievement.tier);
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.celebrationText}>🎉</Text>
            <Text style={styles.headerTitle}>Achievement Unlocked!</Text>
          </View>
          
          <View style={[styles.iconContainer, { backgroundColor: tierColor + '20' }]}>
            <Text style={styles.icon}>{achievement.icon}</Text>
          </View>
          
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{getTierDisplayName(achievement.tier)}</Text>
          </View>
          
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  container: {
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.glass,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  celebrationText: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  icon: {
    fontSize: 60,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  tierText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  closeButtonText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textInverse,
  },
});
