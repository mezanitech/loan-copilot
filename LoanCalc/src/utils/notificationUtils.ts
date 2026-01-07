import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { formatDateForStorage, parseDateFromStorage } from './dateUtils';
import { getCurrencyPreference } from './storage';
import { formatCurrency } from './currencyUtils';

/**
 * Configure notification behavior
 */
export function setupNotificationHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    // Notifications don't work on simulator
    if (!Device.isDevice) {
        console.log('Notifications are not supported on simulator');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions');
        return false;
    }

    // Android requires notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('loan-reminders', {
            name: 'Payment Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#8B7BC4',
        });
    }

    return true;
}

/**
 * Check if notifications are enabled (permissions granted)
 */
export async function areNotificationsEnabled(): Promise<boolean> {
    if (!Device.isDevice) {
        return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}

/**
 * Schedule payment reminder notifications for a loan
 */
export async function schedulePaymentReminders(
    loanId: string,
    loanName: string,
    monthlyPayment: number,
    startDate: string,
    termInMonths: number,
    reminderDaysBefore: number
): Promise<string[]> {
    const notificationIds: string[] = [];
    const start = parseDateFromStorage(startDate);

    for (let i = 0; i < termInMonths; i++) {
        // Calculate payment date
        const paymentDate = new Date(start);
        paymentDate.setMonth(start.getMonth() + i);

        // Calculate reminder date (X days before payment)
        const reminderDate = new Date(paymentDate);
        reminderDate.setDate(paymentDate.getDate() - reminderDaysBefore);

        // Set notification time to 9:00 AM
        reminderDate.setHours(9, 0, 0, 0);

        // Skip if reminder date is in the past
        if (reminderDate < new Date()) {
            continue;
        }

        const dateStr = formatDateForStorage(paymentDate);
        
        // Calculate seconds until the reminder
        const secondsUntilReminder = Math.floor((reminderDate.getTime() - Date.now()) / 1000);
        
        // Skip if reminder date is in the past
        if (secondsUntilReminder <= 0) {
            continue;
        }

        try {
            const currency = await getCurrencyPreference();
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💳 Payment Reminder',
                    body: `Your ${loanName} payment of ${formatCurrency(monthlyPayment, currency)} is due in ${reminderDaysBefore} day${reminderDaysBefore !== 1 ? 's' : ''}`,
                    data: { loanId, paymentDate: dateStr },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntilReminder,
                    repeats: false,
                },
            });

            const identifier = `loan-${loanId}-${dateStr}`;
            notificationIds.push(identifier);
        } catch (error) {
            console.error('Error scheduling notification:', error);
        }
    }

    return notificationIds;
}

/**
 * Cancel all notifications for a loan
 */
export async function cancelLoanNotifications(notificationIds: string[]): Promise<void> {
    if (!notificationIds || notificationIds.length === 0) {
        return;
    }

    try {
        for (const id of notificationIds) {
            await Notifications.cancelScheduledNotificationAsync(id);
        }
    } catch (error) {
        console.error('Error canceling notifications:', error);
    }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error canceling all notifications:', error);
    }
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
        return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error getting scheduled notifications:', error);
        return [];
    }
}

/**
 * Send a test notification immediately
 */
export async function sendTestNotification(): Promise<void> {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🔔 Test Notification',
                body: 'Payment reminders are working! You\'ll receive notifications before your loan payments are due.',
                sound: true,
            },
            trigger: null, // Send immediately
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        throw error;
    }
}
