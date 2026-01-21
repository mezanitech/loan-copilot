import { Platform } from 'react-native';
import { formatDateForStorage, parseDateFromStorage } from './dateUtils';
import { getCurrencyPreference } from './storage';
import { formatCurrency } from './currencyUtils';

// Notifications are not supported in Expo Go (SDK 53+)
// They work in production builds and development builds
let Notifications: any;
let Device: any;

// Don't even try to load notifications in Expo Go - it will fail
// In production builds, this will work fine
try {
    const ExpoNotifications = require('expo-notifications');
    const ExpoDevice = require('expo-device');
    Notifications = ExpoNotifications;
    Device = ExpoDevice;
} catch (e) {
    // Silently fail in Expo Go
    Notifications = null;
    Device = null;
}

/**
 * Configure notification behavior
 */
export function setupNotificationHandler() {
    if (!Notifications) return;
    
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
    if (!Notifications || !Device) {
        console.log('Notifications not available in this environment');
        return false;
    }
    
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
    if (!Notifications || !Device) {
        return false;
    }
    
    if (!Device.isDevice) {
        return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}

/**
 * Schedule notification for the next upcoming payment based on actual payment schedule
 * Returns the notification ID if scheduled, empty array otherwise
 */
export async function scheduleNextPaymentReminder(
    loanId: string,
    loanName: string,
    paymentSchedule: Array<{ payment: number; date?: string | Date }>,
    startDate: string,
    reminderDaysBefore: number
): Promise<string[]> {
    if (!Notifications) {
        return [];
    }
    
    if (!paymentSchedule || paymentSchedule.length === 0) {
        return [];
    }

    const start = parseDateFromStorage(startDate);
    const now = new Date();
    
    // Find the next payment that hasn't occurred yet
    for (let i = 0; i < paymentSchedule.length; i++) {
        const payment = paymentSchedule[i];
        
        // Calculate payment date
        const paymentDate = new Date(start);
        paymentDate.setMonth(start.getMonth() + i);
        
        // Skip if payment date is in the past
        if (paymentDate < now) {
            continue;
        }
        
        // Calculate reminder date (X days before payment)
        const reminderDate = new Date(paymentDate);
        reminderDate.setDate(paymentDate.getDate() - reminderDaysBefore);
        reminderDate.setHours(9, 0, 0, 0);
        
        // Skip if reminder date is in the past
        if (reminderDate < now) {
            continue;
        }
        
        const dateStr = formatDateForStorage(paymentDate);
        const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);
        
        if (secondsUntilReminder <= 0) {
            continue;
        }
        
        try {
            const currency = await getCurrencyPreference();
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💳 Payment Reminder',
                    body: `Your ${loanName} payment of ${formatCurrency(payment.payment, currency)} is due in ${reminderDaysBefore} day${reminderDaysBefore !== 1 ? 's' : ''}`,
                    data: { loanId, paymentDate: dateStr },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntilReminder,
                    repeats: false,
                },
            });
            
            return [notificationId];
        } catch (error) {
            console.error('Error scheduling notification:', error);
            return [];
        }
    }
    
    return [];
}

/**
 * DEPRECATED: Old function that scheduled all payments at once
 * Kept for backward compatibility but should not be used
 */
export async function schedulePaymentReminders(
    loanId: string,
    loanName: string,
    monthlyPayment: number,
    startDate: string,
    termInMonths: number,
    reminderDaysBefore: number
): Promise<string[]> {
    // This function is deprecated - use scheduleNextPaymentReminder instead
    console.warn('schedulePaymentReminders is deprecated, use scheduleNextPaymentReminder instead');
    return [];
}

/**
 * Cancel all notifications for a loan
 */
export async function cancelLoanNotifications(notificationIds: string[]): Promise<void> {
    if (!Notifications) {
        return;
    }
    
    if (!notificationIds || notificationIds.length === 0) {
        return;
    }

    try {
        // Try to cancel each notification by ID
        for (const id of notificationIds) {
            try {
                await Notifications.cancelScheduledNotificationAsync(id);
            } catch (error) {
                // Ignore errors for individual notifications (they might not exist)
                console.log(`Could not cancel notification ${id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error canceling notifications:', error);
    }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    if (!Notifications) {
        return;
    }
    
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error canceling all notifications:', error);
    }
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getAllScheduledNotifications(): Promise<any[]> {
    if (!Notifications) {
        return [];
    }
    
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
    if (!Notifications) {
        console.log('Notifications not available');
        return;
    }
    
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

/**
 * Check and schedule next payment notifications for all loans
 * Should be called when the app opens or when loans are updated
 */
export async function checkAndScheduleNextPayments(
    loans: any[],
    notificationPrefs: { enabled: boolean; reminderDays: number },
    generatePaymentSchedule: (params: any) => any[]
): Promise<void> {
    if (!Notifications) {
        return;
    }
    
    // First, cancel ALL scheduled notifications to clean up any old ones
    try {
        await cancelAllNotifications();
    } catch (error) {
        console.error('Error clearing old notifications:', error);
    }
    
    if (!notificationPrefs.enabled) {
        // Clear notification IDs from all loans
        for (const loan of loans) {
            loan.scheduledNotificationIds = [];
        }
        return;
    }
    
    for (const loan of loans) {
        try {
            // Generate the actual payment schedule with adjustments
            const termInMonths = loan.termUnit === 'years' ? loan.term * 12 : loan.term;
            const [year, month, day] = loan.startDate.split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            
            const rateAdjustmentsForCalc = (loan.rateAdjustments || []).map((adj: any) => ({
                month: parseInt(adj.month),
                newRate: parseFloat(adj.newRate)
            }));
            
            const schedule = generatePaymentSchedule({
                principal: loan.amount,
                annualRate: loan.interestRate,
                termInMonths,
                startDate,
                earlyPayments: loan.earlyPayments || [],
                rateAdjustments: rateAdjustmentsForCalc
            });
            
            // Schedule next payment notification
            const notificationIds = await scheduleNextPaymentReminder(
                loan.id,
                loan.name || 'Loan',
                schedule,
                loan.startDate,
                notificationPrefs.reminderDays
            );
            
            // Update loan with new notification ID
            loan.scheduledNotificationIds = notificationIds;
        } catch (error) {
            console.error(`Error scheduling notification for loan ${loan.id}:`, error);
        }
    }
}
