import AsyncStorage from '@react-native-async-storage/async-storage';

export type Loan = {
    id: string;
    name: string;
    amount: number;
    interestRate: number;
    term: number;
    termUnit: 'months' | 'years';
    startDate: string;
    monthlyPayment: number;
    totalPayment: number;
    createdAt: string;
    earlyPayments?: any[];
    scheduledNotificationIds?: string[];
};

const LOANS_STORAGE_KEY = 'loans';

/**
 * Get all loans from storage
 */
export async function getAllLoans(): Promise<Loan[]> {
    try {
        const loansData = await AsyncStorage.getItem(LOANS_STORAGE_KEY);
        return loansData ? JSON.parse(loansData) : [];
    } catch (error) {
        console.error('Error loading loans:', error);
        return [];
    }
}

/**
 * Get a specific loan by ID
 */
export async function getLoanById(id: string): Promise<Loan | null> {
    try {
        const loans = await getAllLoans();
        return loans.find(loan => loan.id === id) || null;
    } catch (error) {
        console.error('Error loading loan:', error);
        return null;
    }
}

/**
 * Save all loans to storage
 */
export async function saveAllLoans(loans: Loan[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
        return true;
    } catch (error) {
        console.error('Error saving loans:', error);
        return false;
    }
}

/**
 * Add a new loan
 */
export async function addLoan(loan: Loan): Promise<boolean> {
    try {
        const loans = await getAllLoans();
        loans.push(loan);
        return await saveAllLoans(loans);
    } catch (error) {
        console.error('Error adding loan:', error);
        return false;
    }
}

/**
 * Update an existing loan
 */
export async function updateLoan(updatedLoan: Loan): Promise<boolean> {
    try {
        const loans = await getAllLoans();
        const index = loans.findIndex(loan => loan.id === updatedLoan.id);
        
        if (index !== -1) {
            loans[index] = updatedLoan;
            return await saveAllLoans(loans);
        }
        return false;
    } catch (error) {
        console.error('Error updating loan:', error);
        return false;
    }
}

/**
 * Delete a loan by ID
 */
export async function deleteLoan(id: string): Promise<boolean> {
    try {
        const loans = await getAllLoans();
        const updatedLoans = loans.filter(loan => loan.id !== id);
        return await saveAllLoans(updatedLoans);
    } catch (error) {
        console.error('Error deleting loan:', error);
        return false;
    }
}

/**
 * Clear all loans (for debugging/reset)
 */
export async function clearAllLoans(): Promise<boolean> {
    try {
        await AsyncStorage.removeItem(LOANS_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing loans:', error);
        return false;
    }
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<{ enabled: boolean; reminderDays: number }> {
    try {
        const enabled = await AsyncStorage.getItem('@notifications_enabled');
        const reminderDays = await AsyncStorage.getItem('@notification_reminder_days');
        return {
            enabled: enabled === 'true',
            reminderDays: reminderDays ? parseInt(reminderDays) : 3
        };
    } catch (error) {
        console.error('Error loading notification preferences:', error);
        return { enabled: false, reminderDays: 3 };
    }
}

/**
 * Save notification preferences
 */
export async function saveNotificationPreferences(enabled: boolean, reminderDays: number): Promise<boolean> {
    try {
        await AsyncStorage.setItem('@notifications_enabled', enabled.toString());
        await AsyncStorage.setItem('@notification_reminder_days', reminderDays.toString());
        return true;
    } catch (error) {
        console.error('Error saving notification preferences:', error);
        return false;
    }
}

export type Currency = {
    code: string;
    symbol: string;
    name: string;
    position: 'before' | 'after';
};

export const CURRENCIES: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' },
    { code: 'EUR', symbol: '€', name: 'Euro', position: 'before' },
    { code: 'GBP', symbol: '£', name: 'British Pound', position: 'before' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', position: 'before' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', position: 'before' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', position: 'before' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', position: 'before' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', position: 'after' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'before' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', position: 'before' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand', position: 'before' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', position: 'before' },
    { code: 'AED', symbol: 'Dhs', name: 'UAE Dirham', position: 'after' },
    { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', position: 'after' },
    { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', position: 'before' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira', position: 'before' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won', position: 'before' },
    { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', position: 'before' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble', position: 'before' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', position: 'after' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', position: 'after' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', position: 'before' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', position: 'before' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', position: 'before' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht', position: 'before' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', position: 'after' },
];

/**
 * Get currency preference
 */
export async function getCurrencyPreference(): Promise<Currency> {
    try {
        const currencyCode = await AsyncStorage.getItem('@currency_preference');
        const currency = CURRENCIES.find(c => c.code === currencyCode);
        return currency || CURRENCIES[0]; // Default to USD
    } catch (error) {
        console.error('Error loading currency preference:', error);
        return CURRENCIES[0];
    }
}

/**
 * Save currency preference
 */
export async function saveCurrencyPreference(currencyCode: string): Promise<boolean> {
    try {
        await AsyncStorage.setItem('@currency_preference', currencyCode);
        return true;
    } catch (error) {
        console.error('Error saving currency preference:', error);
        return false;
    }
}
