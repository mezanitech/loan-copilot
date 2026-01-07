// WEB-SPECIFIC VERSION - This file is ONLY used on web browsers
// The mobile app (iOS/Android) will continue using index.tsx

import { Link, useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/theme';
import PieChart from '../../components/PieChart';
import OnboardingSlider from '../../components/OnboardingSlider';
import { cancelLoanNotifications } from '../../utils/notificationUtils';
import { getCurrencyPreference, Currency } from '../../utils/storage';
import { formatCurrency } from '../../utils/currencyUtils';

// Define the structure of a Loan object
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
    scheduledNotificationIds?: string[];
};

export default function DashboardScreen() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const router = useRouter();

    const loadLoans = async () => {
        try {
            const storedLoans = await AsyncStorage.getItem('loans');
            if (storedLoans) {
                setLoans(JSON.parse(storedLoans));
            }
        } catch (error) {
            console.error('Failed to load loans:', error);
        }
    };

    const checkFirstLaunch = async () => {
        try {
            const hasLaunched = await AsyncStorage.getItem('hasLaunched');
            if (!hasLaunched) {
                setShowOnboarding(true);
                await AsyncStorage.setItem('hasLaunched', 'true');
            }
        } catch (error) {
            console.error('Failed to check first launch:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadLoans();
            loadCurrency();
            checkFirstLaunch();
        }, [])
    );

    const loadCurrency = async () => {
        const curr = await getCurrencyPreference();
        setCurrency(curr);
    };

    const totalBorrowed = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalMonthlyPayment = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    const totalRemaining = loans.reduce((sum, loan) => sum + loan.totalPayment, 0);

    const deleteAllLoans = async () => {
        Alert.alert(
            "Delete All Loans",
            "Are you sure you want to delete all loans? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            for (const loan of loans) {
                                await cancelLoanNotifications(loan.id);
                            }
                            await AsyncStorage.setItem('loans', JSON.stringify([]));
                            setLoans([]);
                            Alert.alert("Success", "All loans have been deleted.");
                        } catch (error) {
                            console.error('Failed to delete loans:', error);
                            Alert.alert("Error", "Failed to delete loans");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.webContainer}>
            {/* Header */}
            <View style={styles.webHeader}>
                <View style={styles.headerContent}>
                    <Image 
                        source={require('../../../assets/icon.png')} 
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View>
                        <Text style={styles.webTitle}>Loan Co-Pilot</Text>
                        <Text style={styles.webSubtitle}>Manage your loans with clarity</Text>
                    </View>
                </View>
            </View>

            {/* Main Content - Centered with max width */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.webContentContainer}>
                
                {/* Summary Cards */}
                <View style={styles.webSummaryRow}>
                    <View style={styles.webCard}>
                        <Text style={styles.cardLabel}>Total Borrowed</Text>
                        <Text style={styles.cardValue}>{formatCurrency(totalBorrowed, currency, 0)}</Text>
                    </View>
                    <View style={styles.webCard}>
                        <Text style={styles.cardLabel}>Monthly Payment</Text>
                        <Text style={styles.cardValue}>{formatCurrency(totalMonthlyPayment, currency, 0)}</Text>
                    </View>
                    <View style={styles.webCard}>
                        <Text style={styles.cardLabel}>Total Remaining</Text>
                        <Text style={styles.cardValue}>{formatCurrency(totalRemaining, currency, 0)}</Text>
                    </View>
                </View>

                {/* Loans Grid */}
                <View style={styles.loansSection}>
                    <View style={styles.loansSectionHeader}>
                        <Text style={styles.sectionTitle}>Your Loans ({loans.length})</Text>
                        <Link href="/createLoan" asChild>
                            <TouchableOpacity style={styles.addButton}>
                                <Text style={styles.addButtonText}>+ Add Loan</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    {loans.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No loans yet</Text>
                            <Text style={styles.emptyStateSubtext}>Click "Add Loan" to get started</Text>
                        </View>
                    ) : (
                        <View style={styles.webLoansGrid}>
                            {loans.map((loan) => (
                                <TouchableOpacity
                                    key={loan.id}
                                    style={styles.webLoanCard}
                                    onPress={() => router.push(`/${loan.id}/overview`)}
                                >
                                    <Text style={styles.loanName}>{loan.name || 'Unnamed Loan'}</Text>
                                    <Text style={styles.loanAmount}>{formatCurrency(loan.amount, currency, 0)}</Text>
                                    <View style={styles.loanDetails}>
                                        <Text style={styles.loanDetail}>{loan.interestRate}% APR</Text>
                                        <Text style={styles.loanDetail}>•</Text>
                                        <Text style={styles.loanDetail}>{loan.term} {loan.termUnit}</Text>
                                    </View>
                                    <Text style={styles.loanMonthly}>{formatCurrency(loan.monthlyPayment, currency)}/mo</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Actions */}
                {loans.length > 0 && (
                    <View style={styles.actionsSection}>
                        <TouchableOpacity style={styles.deleteButton} onPress={deleteAllLoans}>
                            <Text style={styles.deleteButtonText}>Delete All Loans</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Onboarding Modal */}
            <OnboardingSlider
                visible={showOnboarding}
                onComplete={() => setShowOnboarding(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    webContainer: {
        flex: 1,
        backgroundColor: '#f5f5f7',
    },
    webHeader: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    logo: {
        width: 60,
        height: 60,
    } as any,
    webTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
    },
    webSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
    },
    scrollView: {
        flex: 1,
    },
    webContentContainer: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        padding: 40,
    },
    webSummaryRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40,
    },
    webCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    loansSection: {
        marginBottom: 40,
    },
    loansSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyState: {
        backgroundColor: 'white',
        padding: 60,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 20,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: theme.colors.textTertiary,
    },
    webLoansGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    webLoanCard: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 12,
        width: '30%' as any, // 3 columns
        minWidth: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        cursor: 'pointer' as any,
    },
    loanName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    loanAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 12,
    },
    loanDetails: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    loanDetail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    loanMonthly: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
    actionsSection: {
        alignItems: 'center',
        marginTop: 20,
    },
    deleteButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    deleteButtonText: {
        color: theme.colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
});
