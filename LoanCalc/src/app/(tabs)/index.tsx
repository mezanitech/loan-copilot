// Import necessary components and hooks from React Native and Expo Router
import { Link, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/theme';

// Define the structure of a Loan object
type Loan = {
    id: string;
    amount: number;
    interestRate: number;
    term: number;
    termUnit: 'months' | 'years';
    startDate: string;
    monthlyPayment: number;
    totalPayment: number;
    createdAt: string;
};

export default function DashboardScreen() {
    // State to store all loans
    const [loans, setLoans] = useState<Loan[]>([]);

    // Function to load loans from device storage
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

    // Load loans every time this screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadLoans();
        }, [])
    );

    // Function to delete a loan by its ID
    const deleteLoan = async (id: string) => {
        try {
            const updatedLoans = loans.filter(loan => loan.id !== id);
            await AsyncStorage.setItem('loans', JSON.stringify(updatedLoans));
            setLoans(updatedLoans);
        } catch (error) {
            console.error('Failed to delete loan:', error);
        }
    };

    // Calculate total loan statistics
    const totalBorrowed = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalMonthlyPayment = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

    return <ScrollView style={styles.container}>
        {/* Page header */}
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>My Loans</Text>
                <Text style={styles.subtitle}>Manage your financial journey</Text>
            </View>
        </View>

        {/* Summary cards if loans exist */}
        {loans.length > 0 && (
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Borrowed</Text>
                    <Text style={styles.summaryValue}>${totalBorrowed.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Monthly Payment</Text>
                    <Text style={styles.summaryValue}>${totalMonthlyPayment.toLocaleString()}</Text>
                </View>
            </View>
        )}
        
        {/* Button to create a new loan */}
        <Link href="/(tabs)/createLoan" asChild>
            <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
                <Text style={styles.addButtonText}>+ Create New Loan</Text>
            </TouchableOpacity>
        </Link>

        {/* Show message if no loans exist */}
        {loans.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No loans yet</Text>
                <Text style={styles.emptySubtext}>Create your first loan to start tracking your financial goals</Text>
            </View>
        ) : (
            // Display all loans as cards
            <View style={styles.loansContainer}>
                {loans.map((loan) => (
                    // Each loan card is clickable and navigates to loan details
                    <Link key={loan.id} href={`/(tabs)/${loan.id}/overview`} asChild>
                        <TouchableOpacity style={styles.loanCard} activeOpacity={0.7}>
                            {/* Loan header with name/amount and delete button */}
                            <View style={styles.loanHeader}>
                                <View style={styles.loanHeaderLeft}>
                                    {loan.name && <Text style={styles.loanName}>{loan.name}</Text>}
                                    <Text style={styles.loanAmount}>${loan.amount.toLocaleString()}</Text>
                                    <Text style={styles.loanSubtitle}>{loan.term} {loan.termUnit} @ {loan.interestRate}%</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.deleteButton}
                                    activeOpacity={0.7}
                                    onPress={(e) => {
                                        e.stopPropagation(); // Prevent navigation when deleting
                                        deleteLoan(loan.id);
                                    }}
                                >
                                    <Text style={styles.deleteButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {/* Monthly payment highlight */}
                            <View style={styles.paymentHighlight}>
                                <Text style={styles.paymentLabel}>Monthly Payment</Text>
                                <Text style={styles.paymentValue}>${loan.monthlyPayment.toFixed(2)}</Text>
                            </View>
                            
                            {/* Loan details section */}
                            <View style={styles.loanDetails}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Start Date</Text>
                                    <Text style={styles.detailValue}>{new Date(loan.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Total Payment</Text>
                                    <Text style={styles.detailValue}>${loan.totalPayment.toLocaleString()}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Link>
                ))}
            </View>
        )}
    </ScrollView>;
}

// Styles for the dashboard screen
const styles = StyleSheet.create({
    // Main container with padding
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    // Page header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xxl,
    },
    // Page title style
    title: {
        fontSize: theme.fontSize.huge,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    // Summary cards container
    summaryContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.sm,
    },
    summaryLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
    },
    // Primary "Create New Loan" button
    addButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        marginBottom: theme.spacing.xl,
        ...theme.shadows.md,
    },
    addButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    // Empty state shown when no loans exist
    emptyState: {
        alignItems: "center",
        marginTop: 80,
        paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: theme.spacing.lg,
    },
    emptyText: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.textPrimary,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    // Container for all loan cards
    loansContainer: {
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    // Individual loan card styling
    loanCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        ...theme.shadows.md,
    },
    // Header section of loan card (amount and delete button)
    loanHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: theme.spacing.lg,
    },
    loanHeaderLeft: {
        flex: 1,
    },
    // Loan name (displayed above amount if provided)
    loanName: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
        marginBottom: theme.spacing.xs,
    },
    // Loan amount (large primary text)
    loanAmount: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    loanSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    // Delete button
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        color: theme.colors.error,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.medium,
    },
    // Payment highlight section
    paymentHighlight: {
        backgroundColor: theme.colors.gray50,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
    },
    paymentLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    paymentValue: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.success,
    },
    // Loan details section
    loanDetails: {
        gap: theme.spacing.md,
    },
    // Each row in loan details (label: value)
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: 'center',
    },
    // Left side labels
    detailLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    // Right side values
    detailValue: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
    },
});