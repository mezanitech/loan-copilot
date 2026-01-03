// Import necessary components and hooks from React Native and Expo Router
import { Link, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/theme';
import PieChart from '../../components/PieChart';

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
};

export default function DashboardScreen() {
    // State to store all loans
    const [loans, setLoans] = useState<Loan[]>([]);
    const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());

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

    // Toggle expand/collapse for loan cards
    const toggleExpand = (id: string, e: any) => {
        e.preventDefault();
        e.stopPropagation();
        const newExpanded = new Set(expandedLoans);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedLoans(newExpanded);
    };

    // Debug function to clear all data
    const clearAllData = () => {
        Alert.alert(
            '🗑️ Clear All Data',
            'This will delete all loans and reset the app to first-run state (including onboarding). Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.clear();
                            setLoans([]);
                            Alert.alert('Success', 'All data cleared. Restart the app to see onboarding.');
                        } catch (error) {
                            console.error('Failed to clear data:', error);
                            Alert.alert('Error', 'Failed to clear data');
                        }
                    }
                }
            ]
        );
    };

    // Calculate total loan statistics
    const totalBorrowed = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalMonthlyPayment = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    
    // Calculate remaining principal for all loans
    const calculateRemainingPrincipal = (loan: Loan): number => {
        const startDate = new Date(loan.startDate);
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
    
    const totalRemaining = loans.reduce((sum, loan) => sum + calculateRemainingPrincipal(loan), 0);

    // Generate colors for pie charts
    const pieColors = [
        '#4A90E2', // Blue
        '#7ED321', // Green
        '#F5A623', // Orange
        '#BD10E0', // Purple
        '#50E3C2', // Teal
        '#FF6B6B', // Red
        '#4ECDC4', // Cyan
        '#FFE66D', // Yellow
        '#A8E6CF', // Mint
        '#FF8B94'  // Pink
    ];

    // Prepare data for pie charts
    const totalBorrowedData = loans.map((loan, index) => ({
        value: loan.amount,
        color: pieColors[index % pieColors.length],
        label: loan.name || `Loan ${index + 1}`
    }));

    const remainingData = loans.map((loan, index) => ({
        value: calculateRemainingPrincipal(loan),
        color: pieColors[index % pieColors.length],
        label: loan.name || `Loan ${index + 1}`
    }));

    const monthlyPaymentData = loans.map((loan, index) => ({
        value: loan.monthlyPayment,
        color: pieColors[index % pieColors.length],
        label: loan.name || `Loan ${index + 1}`
    }));

    return <View style={styles.wrapper}>
        <ScrollView style={styles.container}>
        {/* Page header */}
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>My Loans</Text>
                <Text style={styles.subtitle}>Manage your financial journey</Text>
            </View>
            <TouchableOpacity 
                style={styles.debugButton}
                onPress={clearAllData}
                activeOpacity={0.7}
            >
                <Text style={styles.debugButtonText}>🗑️</Text>
            </TouchableOpacity>
        </View>

        {/* Summary cards if loans exist */}
        {loans.length > 0 && (
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Borrowed</Text>
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>${totalBorrowed.toLocaleString()}</Text>
                    <View style={styles.pieChartWrapper}>
                        <PieChart data={totalBorrowedData} size={120} strokeWidth={15} />
                        <View style={styles.legendContainer}>
                            {totalBorrowedData.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText} numberOfLines={1}>{item.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Remaining</Text>
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>${totalRemaining.toLocaleString()}</Text>
                    <View style={styles.pieChartWrapper}>
                        <PieChart data={remainingData} size={120} strokeWidth={15} />
                        <View style={styles.legendContainer}>
                            {remainingData.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText} numberOfLines={1}>{item.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Monthly Payment</Text>
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>${totalMonthlyPayment.toLocaleString()}</Text>
                    <View style={styles.pieChartWrapper}>
                        <PieChart data={monthlyPaymentData} size={120} strokeWidth={15} />
                        <View style={styles.legendContainer}>
                            {monthlyPaymentData.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText} numberOfLines={1}>{item.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>
        )}

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
                {loans.map((loan) => {
                    const isExpanded = expandedLoans.has(loan.id);
                    return (
                    <View key={loan.id} style={styles.loanCard}>
                        {/* Collapsible header - tap to expand/collapse */}
                        <TouchableOpacity 
                            onPress={(e) => toggleExpand(loan.id, e)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.loanHeader}>
                                <View style={styles.loanHeaderLeft}>
                                    {loan.name && <Text style={styles.loanName}>{loan.name}</Text>}
                                    <Text style={styles.loanAmount}>${loan.amount.toLocaleString()}</Text>
                                    {!isExpanded && (
                                        <Text style={styles.loanSubtitle}>
                                            ${loan.monthlyPayment.toFixed(2)}/month • {loan.term} {loan.termUnit}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.loanHeaderRight}>
                                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                                    <TouchableOpacity 
                                        style={styles.deleteButton}
                                        activeOpacity={0.7}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            Alert.alert(
                                                'Delete Loan',
                                                `Are you sure you want to delete this loan${loan.name ? ` "${loan.name}"` : ''}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Delete',
                                                        style: 'destructive',
                                                        onPress: () => deleteLoan(loan.id)
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <Text style={styles.deleteButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Expanded content */}
                        {isExpanded && (
                            <Link href={`/(tabs)/${loan.id}/overview`} asChild>
                                <TouchableOpacity activeOpacity={0.7}>
                                    <View style={styles.expandedContent}>
                                        <Text style={styles.loanSubtitle}>{loan.term} {loan.termUnit} @ {loan.interestRate}%</Text>
                                        
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
                                        
                                        <Text style={styles.tapToView}>Tap to view details →</Text>
                                    </View>
                                </TouchableOpacity>
                            </Link>
                        )}
                    </View>
                    );
                })}
            </View>
        )}
        </ScrollView>
        
        {/* Fixed button at bottom */}
        <View style={styles.bottomButtonContainer}>
            <Link href="/(tabs)/createLoan" asChild>
                <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
                    <Text style={styles.addButtonText}>+ Create New Loan</Text>
                </TouchableOpacity>
            </Link>
        </View>
    </View>;
}

// Styles for the dashboard screen
const styles = StyleSheet.create({
    // Wrapper to hold scrollview and fixed button
    wrapper: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    // Main container with padding
    container: {
        flex: 1,
        padding: theme.spacing.xl,
    },
    // Page header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xxl,
    },
    debugButton: {
        backgroundColor: theme.colors.gray200,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    debugButtonText: {
        fontSize: 18,
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
        padding: theme.spacing.md,
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
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
    },
    pieChartWrapper: {
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    legendContainer: {
        marginTop: theme.spacing.md,
        width: '100%',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: theme.spacing.xs,
    },
    legendText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    // Bottom button container
    bottomButtonContainer: {
        padding: theme.spacing.xl,
        paddingBottom: theme.spacing.xxl,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
        ...theme.shadows.md,
    },
    // Primary "Create New Loan" button
    addButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
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
    loanHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    expandIcon: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
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
    expandedContent: {
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
        marginTop: theme.spacing.md,
    },
    tapToView: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        textAlign: 'center',
        marginTop: theme.spacing.lg,
        fontWeight: theme.fontWeight.semibold,
    },
});
