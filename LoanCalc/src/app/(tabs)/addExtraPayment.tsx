import { useState, useCallback, useRef, useEffect } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, router } from 'expo-router';
import { theme } from '../../constants/theme';

import { getCurrencyPreference, Currency } from "../../utils/storage";
import { formatCurrency } from "../../utils/currencyUtils";

type Loan = {
    id: string;
    name?: string;
    amount: number;
    interestRate: number;
    term: number;
    termUnit: 'months' | 'years';
    startDate: string;
    monthlyPayment: number;
    totalPayment: number;
    createdAt: string;
    earlyPayments?: EarlyPayment[];
    rateAdjustments?: Array<{ month: string; newRate: string }>;
    remainingBalance?: number;
};

type EarlyPayment = {
    id: string;
    name?: string;
    type: "one-time" | "recurring";
    amount: string;
    month: string;
    frequency?: string;
};

export default function AddExtraPaymentScreen() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });

    // Load loans from storage
    const loadLoans = async () => {
        try {
            const storedLoans = await AsyncStorage.getItem('loans');
            if (storedLoans) {
                const parsedLoans = JSON.parse(storedLoans);
                // Validate that parsed data is an array
                if (Array.isArray(parsedLoans)) {
                    setLoans(parsedLoans);
                } else {
                    console.error('Invalid loans data format');
                    setLoans([]);
                }
            }
        } catch (error) {
            console.error('Failed to load loans:', error);
            // Set empty array on parse error to prevent crash
            setLoans([]);
        }
    };

    // Function to get current interest rate considering rate adjustments
    const getCurrentInterestRate = (loan: Loan): number => {
        if (!loan.rateAdjustments || loan.rateAdjustments.length === 0) {
            return loan.interestRate;
        }

        // Calculate months elapsed since loan start
        // Parse date in local time to avoid timezone shifts
        const [year, month, day] = loan.startDate.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        const currentDate = new Date();
        const monthsElapsed = Math.max(0,
            (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
            (currentDate.getMonth() - startDate.getMonth())
        ) + 1; // +1 because first payment is month 1

        // Find the most recent rate adjustment that has occurred
        let currentRate = loan.interestRate;
        for (const adjustment of loan.rateAdjustments) {
            const adjustmentMonth = parseInt(adjustment.month);
            if (!isNaN(adjustmentMonth) && adjustmentMonth <= monthsElapsed) {
                const newRate = parseFloat(adjustment.newRate);
                if (!isNaN(newRate)) {
                    currentRate = newRate;
                }
            }
        }

        return currentRate;
    };

    // Calculate remaining principal for a loan
    const calculateRemainingPrincipal = (loan: Loan): number => {
        // Parse date in local time to avoid timezone shifts
        const [year, month, day] = loan.startDate.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        const currentDate = new Date();
        const monthsPassed = Math.max(0, 
            (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
            (currentDate.getMonth() - startDate.getMonth())
        );
        
        const termInMonths = loan.termUnit === 'years' ? loan.term * 12 : loan.term;
        const paymentsMade = Math.min(monthsPassed, termInMonths);
        
        if (paymentsMade >= termInMonths || loan.interestRate === 0) {
            return Math.max(0, loan.amount - (loan.monthlyPayment * paymentsMade));
        }
        
        const monthlyRate = loan.interestRate / 100 / 12;
        const totalPayments = termInMonths;
        const remaining = loan.amount * 
            (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, paymentsMade)) /
            (Math.pow(1 + monthlyRate, totalPayments) - 1);
        
        return Math.max(0, remaining);
    };

    useFocusEffect(
        useCallback(() => {
            loadLoans();
            loadCurrency();
        }, [])
    );

    // Auto-redirect to payments screen if only one loan exists
    useEffect(() => {
        if (loans.length === 1) {
            router.push(`/(tabs)/${loans[0].id}/payments`);
        }
    }, [loans]);

    const loadCurrency = async () => {
        const curr = await getCurrencyPreference();
        setCurrency(curr);
    };

    // Navigate to payments screen for selected loan
    const selectLoan = (loanId: string) => {
        router.push(`/(tabs)/${loanId}/payments`);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Manage Extra Payments</Text>
            <Text style={styles.subtitle}>
                Select a loan to add extra payments and see their impact on your payoff timeline
            </Text>

                {/* Payment Strategy Suggestions */}
                {loans.length > 1 && (
                    <View style={styles.section}>
                        <Text style={styles.label}>💡 Recommended Payment Strategies</Text>
                        
                        {/* Avalanche Method */}
                        <TouchableOpacity
                            style={styles.strategyCard}
                            onPress={() => {
                                const highestInterestLoan = loans.reduce((highest, current) => 
                                    getCurrentInterestRate(current) > getCurrentInterestRate(highest) ? current : highest
                                );
                                selectLoan(highestInterestLoan.id);
                            }}
                        >
                            <View style={styles.strategyHeader}>
                                <Text style={styles.strategyTitle}>🔥 Avalanche Method</Text>
                                <Text style={styles.strategyBadge}>Saves Most Interest</Text>
                            </View>
                            <Text style={styles.strategyDescription}>
                                Pay off loans with the highest interest rate first to minimize total interest paid.
                            </Text>
                            {(() => {
                                const highestInterestLoan = loans.reduce((highest, current) => 
                                    getCurrentInterestRate(current) > getCurrentInterestRate(highest) ? current : highest
                                );
                                return (
                                    <View style={styles.strategyRecommendation}>
                                        <Text style={styles.strategyRecommendText}>Recommended loan:</Text>
                                        <Text style={styles.strategyLoanName}>
                                            {highestInterestLoan.name || 'Unnamed Loan'} ({getCurrentInterestRate(highestInterestLoan)}% APR)
                                        </Text>
                                    </View>
                                );
                            })()}
                        </TouchableOpacity>

                        {/* Snowball Method */}
                        <TouchableOpacity
                            style={styles.strategyCard}
                            onPress={() => {
                                const smallestBalanceLoan = loans.reduce((smallest, current) => {
                                    const smallestRemaining = smallest.remainingBalance ?? calculateRemainingPrincipal(smallest);
                                    const currentRemaining = current.remainingBalance ?? calculateRemainingPrincipal(current);
                                    return currentRemaining < smallestRemaining ? current : smallest;
                                });
                                selectLoan(smallestBalanceLoan.id);
                            }}
                        >
                            <View style={styles.strategyHeader}>
                                <Text style={styles.strategyTitle}>⛄ Snowball Method</Text>
                                <Text style={styles.strategyBadge}>Quick Wins</Text>
                            </View>
                            <Text style={styles.strategyDescription}>
                                Pay off smallest balance first to build momentum and motivation with quick wins.
                            </Text>
                            {(() => {
                                const smallestBalanceLoan = loans.reduce((smallest, current) => {
                                    const smallestRemaining = smallest.remainingBalance ?? calculateRemainingPrincipal(smallest);
                                    const currentRemaining = current.remainingBalance ?? calculateRemainingPrincipal(current);
                                    return currentRemaining < smallestRemaining ? current : smallest;
                                });
                                const remainingBalance = smallestBalanceLoan.remainingBalance ?? calculateRemainingPrincipal(smallestBalanceLoan);
                                return (
                                    <View style={styles.strategyRecommendation}>
                                        <Text style={styles.strategyRecommendText}>Recommended loan:</Text>
                                        <Text style={styles.strategyLoanName}>
                                            {smallestBalanceLoan.name || 'Unnamed Loan'} ({formatCurrency(remainingBalance, currency, 0)} remaining)
                                        </Text>
                                    </View>
                                );
                            })()}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Disclaimer for strategies */}
                {loans.length > 1 && (
                    <View style={styles.disclaimerBox}>
                        <Text style={styles.disclaimerText}>
                            ⚠️ These are general strategies for informational purposes only. Results may vary based on your specific situation. This is not professional financial advice. Please consult with a qualified financial advisor for personalized guidance.
                        </Text>
                    </View>
                )}

                {/* Loan Selection */}
                <View style={styles.section}>
                    <Text style={styles.label}>Select Loan</Text>
                    {loans.length === 0 ? (
                        <Text style={styles.noLoansText}>No loans available</Text>
                    ) : (
                        loans.map((loan) => (
                            <TouchableOpacity
                                key={loan.id}
                                style={styles.loanItem}
                                onPress={() => selectLoan(loan.id)}
                            >
                                <View style={styles.loanItemContent}>
                                    <Text style={styles.loanItemName}>{loan.name || 'Unnamed Loan'}</Text>
                                    <Text style={styles.loanItemDetails}>
                                        {formatCurrency(loan.amount, currency, 0)} @ {getCurrentInterestRate(loan)}%
                                    </Text>
                                </View>
                                <Text style={styles.arrowIcon}>→</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <Text style={styles.infoText}>
                        Extra payments go directly toward your principal balance, reducing the total interest you'll pay over the life of the loan.
                    </Text>
                </View>
            </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    title: {
        fontSize: theme.fontSize.huge,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.xs,
        color: theme.colors.textPrimary,
    },
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xxl,
        lineHeight: 20,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textPrimary,
    },
    loanItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
    },
    loanItemContent: {
        flex: 1,
    },
    loanItemName: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    loanItemDetails: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    arrowIcon: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.textSecondary,
    },
    strategyCard: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
    },
    strategyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    strategyTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    strategyBadge: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
        backgroundColor: theme.colors.gray50,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    strategyDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: theme.spacing.md,
    },
    strategyRecommendation: {
        backgroundColor: theme.colors.gray50,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    strategyRecommendText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    strategyLoanName: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
    },
    disclaimerBox: {
        backgroundColor: '#FFF3CD',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
        marginBottom: theme.spacing.lg,
    },
    disclaimerText: {
        fontSize: theme.fontSize.xs,
        color: '#856404',
        lineHeight: 18,
    },
    noLoansText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        padding: theme.spacing.xl,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.gray50,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.xl,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    infoIcon: {
        fontSize: theme.fontSize.xl,
        marginRight: theme.spacing.md,
    },
    infoText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
});
