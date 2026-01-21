import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { theme } from '../../constants/theme';
import { getNotificationPreferences, saveNotificationPreferences, getAllLoans } from '../../utils/storage';
import { 
    requestNotificationPermissions, 
    areNotificationsEnabled, 
    sendTestNotification,
    getAllScheduledNotifications,
    checkAndScheduleNextPayments,
    cancelLoanNotifications
} from '../../utils/notificationUtils';
import { generatePaymentSchedule } from '../../utils/loanCalculations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProgress } from '../../utils/achievementUtils';

export default function NotificationSettingsScreen() {
    const insets = useSafeAreaInsets();
    const [enabled, setEnabled] = useState(false);
    const [reminderDays, setReminderDays] = useState(3);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [scheduledCount, setScheduledCount] = useState(0);

    useEffect(() => {
        loadSettings();
        checkPermissions();
        loadScheduledCount();
    }, []);

    const loadSettings = async () => {
        const prefs = await getNotificationPreferences();
        setEnabled(prefs.enabled);
        setReminderDays(prefs.reminderDays);
    };

    const checkPermissions = async () => {
        const granted = await areNotificationsEnabled();
        setPermissionGranted(granted);
    };

    const loadScheduledCount = async () => {
        const notifications = await getAllScheduledNotifications();
        setScheduledCount(notifications.length);
    };

    const handleToggle = async (value: boolean) => {
        if (value && !permissionGranted) {
            // Request permission
            const granted = await requestNotificationPermissions();
            if (!granted) {
                Alert.alert(
                    'Permission Required',
                    'Please enable notifications in your device settings to receive payment reminders.',
                    [{ text: 'OK' }]
                );
                return;
            }
            setPermissionGranted(true);
        }

        setEnabled(value);
        await saveNotificationPreferences(value, reminderDays);

        // Update all existing loans
        await rescheduleAllLoans(value, reminderDays);
        await loadScheduledCount();
        
        // Track achievement: enabled notifications
        if (value) {
            await updateProgress('notifications_enabled', 1);
        }

        if (value) {
            Alert.alert(
                'Notifications Enabled',
                'Payment reminders have been scheduled for all your loans.',
                [{ text: 'OK' }]
            );
        } else {
            Alert.alert(
                'Notifications Disabled',
                'All payment reminders have been canceled.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleReminderDaysChange = async (days: number) => {
        setReminderDays(days);
        await saveNotificationPreferences(enabled, days);
        
        if (enabled) {
            // Update all existing loans with new reminder timing
            await rescheduleAllLoans(true, days);
            await loadScheduledCount();
            
            Alert.alert(
                'Settings Updated',
                `All your loans have been updated to remind you ${days} day${days !== 1 ? 's' : ''} before each payment.`,
                [{ text: 'OK' }]
            );
        }
    };

    const rescheduleAllLoans = async (shouldEnable: boolean, days: number) => {
        try {
            const loans = await getAllLoans();
            const notificationPrefs = { enabled: shouldEnable, reminderDays: days };
            
            // Use the new checkAndScheduleNextPayments function
            await checkAndScheduleNextPayments(loans, notificationPrefs, generatePaymentSchedule);
            
            // Save all loans back to storage
            await AsyncStorage.setItem('loans', JSON.stringify(loans));
        } catch (error) {
            console.error('Error rescheduling loans:', error);
        }
    };

    const handleTestNotification = async () => {
        if (!permissionGranted) {
            Alert.alert(
                'Permission Required',
                'Please enable notifications first.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            await sendTestNotification();
            Alert.alert(
                'Test Sent',
                'Check your notifications! You should see a test notification now.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert(
                'Error',
                'Failed to send test notification. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <ScrollView 
                style={styles.content} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 80 }}
            >
                {/* Simulator Warning */}
                {!Device.isDevice && (
                    <View style={styles.warningCard}>
                        <View style={styles.warningIconContainer}>
                            <Ionicons name="warning" size={20} color={theme.colors.warning} />
                        </View>
                        <Text style={styles.warningText}>
                            Notifications don't work on simulator. Please test on a physical device.
                        </Text>
                    </View>
                )}

                {/* Master Toggle */}
                <View style={styles.card}>
                    <View style={styles.cardIconContainer}>
                        <Ionicons name="notifications" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Payment Reminders</Text>
                            <Text style={styles.settingDescription}>
                                Get notified before your loan payments are due
                            </Text>
                        </View>
                        <Switch
                            value={enabled}
                            onValueChange={handleToggle}
                            trackColor={{ false: theme.colors.gray300, true: theme.colors.primaryLight }}
                            thumbColor={enabled ? theme.colors.primary : theme.colors.surface}
                            ios_backgroundColor={theme.colors.gray300}
                        />
                    </View>
                </View>

                {/* Reminder Timing */}
                {enabled && (
                    <View style={styles.card}>
                        <View style={styles.cardIconContainer}>
                            <Ionicons name="time" size={24} color={theme.colors.secondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Remind me</Text>
                        <View style={styles.optionsGroup}>
                            {[1, 3, 7].map(days => (
                                <TouchableOpacity
                                    key={days}
                                    style={[
                                        styles.optionButton,
                                        reminderDays === days && styles.optionButtonActive
                                    ]}
                                    onPress={() => handleReminderDaysChange(days)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        reminderDays === days && styles.optionTextActive
                                    ]}>
                                        {days} day{days !== 1 ? 's' : ''} before
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Info Section */}
                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.secondary} />
                        <Text style={styles.infoTitle}>How it works</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>Notifications are scheduled when you create or update a loan</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>You'll receive a reminder {reminderDays} day{reminderDays !== 1 ? 's' : ''} before each payment</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>Reminders are sent at 9:00 AM on the reminder day</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>Delete a loan to cancel its reminders</Text>
                    </View>
                </View>

                {/* Debug Info */}
                {enabled && (
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Ionicons 
                                name={permissionGranted ? "checkmark-circle" : "close-circle"} 
                                size={18} 
                                color={permissionGranted ? theme.colors.success : theme.colors.error} 
                            />
                            <Text style={styles.statText}>
                                {permissionGranted ? 'Notifications enabled' : 'Permissions not granted'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Test Button */}
                {enabled && Device.isDevice && (
                    <TouchableOpacity
                        style={styles.testButton}
                        onPress={handleTestNotification}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="notifications-outline" size={20} color={theme.colors.surface} />
                        <Text style={styles.testButtonText}>Send Test Notification</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceGlass,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    headerTitle: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.surface,
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: theme.spacing.xl,
    },
    warningCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(254, 243, 199, 0.95)',
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.lg,
        alignItems: 'center',
        gap: theme.spacing.md,
        ...theme.shadows.md,
    },
    warningIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: '#78350F',
        lineHeight: 20,
    },
    card: {
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        ...theme.shadows.md,
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primaryGlass,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingInfo: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    settingTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    settingDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    optionsGroup: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    optionButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
    },
    optionButtonActive: {
        borderColor: theme.colors.surface,
        backgroundColor: theme.colors.surface,
    },
    optionText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.surface,
    },
    optionTextActive: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    infoCard: {
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        ...theme.shadows.sm,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    infoTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    infoBullet: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.secondary,
        fontWeight: theme.fontWeight.bold,
        width: 16,
    },
    infoText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    statsCard: {
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    statText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textPrimary,
        fontWeight: theme.fontWeight.medium,
    },
    testButton: {
        backgroundColor: theme.colors.surface,
        flexDirection: 'row',
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.xl,
        gap: theme.spacing.sm,
        ...theme.shadows.lg,
    },
    testButtonText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
    },
});
