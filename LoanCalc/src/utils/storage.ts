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
