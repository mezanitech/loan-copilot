// WEB-SPECIFIC VERSION - This file is ONLY used on web browsers
// The mobile app (iOS/Android) will continue using index.tsx

import { Link, useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/theme';
import PieChart from '../../components/PieChart';
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

    useFocusEffect(
        useCallback(() => {
            loadLoans();
            loadCurrency();
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
                                if (loan.scheduledNotificationIds && loan.scheduledNotificationIds.length > 0) {
                                    await cancelLoanNotifications(loan.scheduledNotificationIds);
                                }
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
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.webTitle}>Loan Co-Pilot</Text>
                        <Text style={styles.webSubtitle}>Your intelligent companion for loan management and financial freedom</Text>
                    </View>
                </View>
            </View>

            {/* Main Content - Centered with max width */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.webContentContainer}>
                
                {/* Hero Section for Empty State */}
                {loans.length === 0 && (
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>Take Control of Your Loans</Text>
                        <Text style={styles.heroDescription}>
                            Loan Co-Pilot helps you visualize, track, and optimize your loan payments. 
                            Whether you're managing a mortgage, student loan, car loan, or any other debt, 
                            our powerful calculator shows you exactly how your payments impact your balance over time.
                        </Text>
                        <View style={styles.featureGrid}>
                            <View style={styles.featureCard}>
                                <Text style={styles.featureIcon}>📊</Text>
                                <Text style={styles.featureTitle}>Visual Analytics</Text>
                                <Text style={styles.featureText}>
                                    See your loan progress with interactive charts and detailed payment schedules
                                </Text>
                            </View>
                            <View style={styles.featureCard}>
                                <Text style={styles.featureIcon}>💰</Text>
                                <Text style={styles.featureTitle}>Extra Payments</Text>
                                <Text style={styles.featureText}>
                                    Model the impact of extra payments and see how much interest you can save
                                </Text>
                            </View>
                            <View style={styles.featureCard}>
                                <Text style={styles.featureIcon}>📈</Text>
                                <Text style={styles.featureTitle}>Rate Adjustments</Text>
                                <Text style={styles.featureText}>
                                    Track variable rate changes and see how they affect your total payment
                                </Text>
                            </View>
                        </View>
                        <Link href="/createLoan" asChild>
                            <TouchableOpacity style={styles.heroCTA}>
                                <Text style={styles.heroCTAText}>Create Your First Loan</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                )}

                {/* Summary Cards - Only show if there are loans */}
                {loans.length > 0 && (
                    <>
                        <View style={styles.dashboardIntro}>
                            <Text style={styles.dashboardTitle}>Your Loan Portfolio</Text>
                            <Text style={styles.dashboardDescription}>
                                Track all your loans in one place. Below is a summary of your total debt, monthly obligations, and remaining balance.
                            </Text>
                        </View>
                        
                        <View style={styles.webSummaryRow}>
                            <View style={styles.webCard}>
                                <Text style={styles.cardIcon}>💳</Text>
                                <Text style={styles.cardLabel}>Total Principal Borrowed</Text>
                                <Text style={styles.cardValue}>{formatCurrency(totalBorrowed, currency, 0)}</Text>
                                <Text style={styles.cardDescription}>Original amount borrowed across all loans</Text>
                            </View>
                            <View style={styles.webCard}>
                                <Text style={styles.cardIcon}>📅</Text>
                                <Text style={styles.cardLabel}>Monthly Payment</Text>
                                <Text style={styles.cardValue}>{formatCurrency(totalMonthlyPayment, currency, 0)}</Text>
                                <Text style={styles.cardDescription}>Combined monthly payment across all loans</Text>
                            </View>
                            <View style={styles.webCard}>
                                <Text style={styles.cardIcon}>🎯</Text>
                                <Text style={styles.cardLabel}>Total Remaining</Text>
                                <Text style={styles.cardValue}>{formatCurrency(totalRemaining, currency, 0)}</Text>
                                <Text style={styles.cardDescription}>Total amount to be paid including interest</Text>
                            </View>
                        </View>
                    </>
                )}

                {/* Loans Grid */}
                {loans.length > 0 && (
                    <View style={styles.loansSection}>
                        <View style={styles.loansSectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Active Loans ({loans.length})</Text>
                                <Text style={styles.sectionDescription}>
                                    Click on any loan to view detailed payment schedules, charts, and make adjustments
                                </Text>
                            </View>
                            <Link href="/createLoan" asChild>
                                <TouchableOpacity style={styles.addButton}>
                                    <Text style={styles.addButtonText}>+ Add Loan</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>

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
                                    <View style={styles.loanMonthlyContainer}>
                                        <Text style={styles.loanMonthly}>{formatCurrency(loan.monthlyPayment, currency)}</Text>
                                        <Text style={styles.loanMonthlyLabel}>/month</Text>
                                    </View>
                                    <Text style={styles.viewDetailsText}>Click to view details →</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Actions */}
                {loans.length > 0 && (
                    <View style={styles.actionsSection}>
                        <TouchableOpacity style={styles.deleteButton} onPress={deleteAllLoans}>
                            <Text style={styles.deleteButtonText}>Delete All Loans</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © 2026 Loan Co-Pilot. All loan calculations are estimates. 
                        Please consult with a financial advisor for personalized advice.
                    </Text>
                </View>
            </ScrollView>
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
        paddingVertical: 50,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 4,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        maxWidth: 1200,
    },
    logo: {
        width: 70,
        height: 70,
    } as any,
    headerTextContainer: {
        flex: 1,
    },
    webTitle: {
        fontSize: 42,
        fontWeight: 'bold',
        color: 'white',
    },
    webSubtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.95)',
        marginTop: 8,
        maxWidth: 600,
    },
    scrollView: {
        flex: 1,
    },
    webContentContainer: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        padding: 40,
        paddingBottom: 80,
    },
    heroSection: {
        backgroundColor: 'white',
        padding: 60,
        borderRadius: 16,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 16,
        textAlign: 'center',
    },
    heroDescription: {
        fontSize: 18,
        lineHeight: 28,
        color: theme.colors.textSecondary,
        marginBottom: 40,
        textAlign: 'center',
        maxWidth: 800,
        alignSelf: 'center',
    },
    featureGrid: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 40,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    featureCard: {
        flex: 1,
        minWidth: 250,
        maxWidth: 300,
        backgroundColor: '#f8f9fa',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    featureIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    featureText: {
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    heroCTA: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 8,
        alignSelf: 'center',
    },
    heroCTAText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    dashboardIntro: {
        marginBottom: 24,
    },
    dashboardTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    dashboardDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.textSecondary,
    },
    webSummaryRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 50,
        flexWrap: 'wrap',
    },
    webCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: 'white',
        padding: 28,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardIcon: {
        fontSize: 32,
        marginBottom: 12,
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 13,
        color: theme.colors.textTertiary,
        lineHeight: 18,
    },
    loansSection: {
        marginBottom: 40,
    },
    loansSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 20,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        maxWidth: 600,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        flexShrink: 0,
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
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
        width: '31%' as any,
        minWidth: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        cursor: 'pointer' as any,
        borderWidth: 2,
        borderColor: 'transparent',
        transition: 'all 0.3s ease',
    },
    loanName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    loanAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 12,
    },
    loanDetails: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    loanDetail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    loanMonthlyContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    loanMonthly: {
        fontSize: 18,
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
    loanMonthlyLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    viewDetailsText: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '500',
        marginTop: 8,
    },
    actionsSection: {
        alignItems: 'center',
        marginTop: 40,
        paddingTop: 40,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
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
    footer: {
        marginTop: 60,
        paddingTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
