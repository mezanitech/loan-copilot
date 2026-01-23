// WEB-SPECIFIC VERSION - Loan Comparison Dashboard
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/theme';
import { cancelLoanNotifications } from '../../utils/notificationUtils';
import { getCurrencyPreference, Currency } from '../../utils/storage';
import { formatCurrency } from '../../utils/currencyUtils';

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

type ViewMode = 'comparison' | 'grid' | 'list';

export default function ComparisonDashboard() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set());
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const [viewMode, setViewMode] = useState<ViewMode>('comparison');
    const [showInsights, setShowInsights] = useState(true);
    const router = useRouter();

    const loadLoans = async () => {
        try {
            const storedLoans = await AsyncStorage.getItem('loans');
            if (storedLoans) {
                const parsedLoans = JSON.parse(storedLoans);
                setLoans(parsedLoans);
                setSelectedLoans(new Set(parsedLoans.map((l: Loan) => l.id)));
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

    const toggleLoanSelection = (loanId: string) => {
        const newSelection = new Set(selectedLoans);
        if (newSelection.has(loanId)) {
            newSelection.delete(loanId);
        } else {
            newSelection.add(loanId);
        }
        setSelectedLoans(newSelection);
    };

    const selectedLoanObjects = loans.filter(loan => selectedLoans.has(loan.id));
    
    const totalBorrowed = selectedLoanObjects.reduce((sum, loan) => sum + loan.amount, 0);
    const totalMonthlyPayment = selectedLoanObjects.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    const totalToPay = selectedLoanObjects.reduce((sum, loan) => sum + loan.totalPayment, 0);
    const totalInterest = totalToPay - totalBorrowed;

    const highestRateLoan = selectedLoanObjects.length > 0 
        ? selectedLoanObjects.reduce((max, loan) => loan.interestRate > max.interestRate ? loan : max)
        : null;
    const lowestRateLoan = selectedLoanObjects.length > 0 
        ? selectedLoanObjects.reduce((min, loan) => loan.interestRate < min.interestRate ? loan : min)
        : null;

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
                            setSelectedLoans(new Set());
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
        <View style={styles.container}>
            {/* Left Sidebar */}
            <View style={styles.sidebar}>
                <View style={styles.sidebarHeader}>
                    <Text style={styles.appTitle}>💰 Loan Co-Pilot</Text>
                </View>

                <View style={styles.sidebarSection}>
                    <Text style={styles.sidebarLabel}>NAVIGATION</Text>
                    <TouchableOpacity 
                        style={[styles.sidebarButton, viewMode === 'comparison' && styles.sidebarButtonActive]}
                        onPress={() => setViewMode('comparison')}
                    >
                        <Text style={styles.sidebarButtonIcon}>📊</Text>
                        <Text style={[styles.sidebarButtonText, viewMode === 'comparison' && styles.sidebarButtonTextActive]}>Comparison</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.sidebarButton, viewMode === 'grid' && styles.sidebarButtonActive]}
                        onPress={() => setViewMode('grid')}
                    >
                        <Text style={styles.sidebarButtonIcon}>▦</Text>
                        <Text style={[styles.sidebarButtonText, viewMode === 'grid' && styles.sidebarButtonTextActive]}>Grid View</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sidebarSection}>
                    <Text style={styles.sidebarLabel}>MY LOANS ({loans.length})</Text>
                    <ScrollView style={styles.loansList}>
                        {loans.map((loan) => (
                            <TouchableOpacity
                                key={loan.id}
                                style={styles.loanItem}
                                onPress={() => router.push(`/${loan.id}/overview`)}
                            >
                                <Text style={styles.loanItemName} numberOfLines={1}>
                                    {loan.name || 'Unnamed Loan'}
                                </Text>
                                <Text style={styles.loanItemAmount}>
                                    {formatCurrency(loan.amount, currency, 0)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.sidebarFooter}>
                    <Link href="/createLoan" asChild>
                        <TouchableOpacity style={styles.newLoanButton}>
                            <Text style={styles.newLoanButtonText}>+ New Loan</Text>
                        </TouchableOpacity>
                    </Link>
                    {loans.length > 0 && (
                        <TouchableOpacity style={styles.deleteAllButton} onPress={deleteAllLoans}>
                            <Text style={styles.deleteAllButtonText}>Delete All</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.mainContent}>
                {loans.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📊</Text>
                        <Text style={styles.emptyTitle}>No Loans Yet</Text>
                        <Text style={styles.emptyText}>
                            Create your first loan to start comparing and optimizing your debt payoff strategy.
                        </Text>
                        <Link href="/createLoan" asChild>
                            <TouchableOpacity style={styles.emptyButton}>
                                <Text style={styles.emptyButtonText}>Create Your First Loan</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                )}

                {loans.length > 0 && (
                    <>
                        {/* Top Stats Bar */}
                        <View style={styles.statsBar}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatCurrency(totalBorrowed, currency, 0)}</Text>
                                <Text style={styles.statLabel}>Total Principal</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatCurrency(totalMonthlyPayment, currency, 0)}</Text>
                                <Text style={styles.statLabel}>Monthly Payment</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#e67e22' }]}>{formatCurrency(totalInterest, currency, 0)}</Text>
                                <Text style={styles.statLabel}>Total Interest</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatCurrency(totalToPay, currency, 0)}</Text>
                                <Text style={styles.statLabel}>Total Payoff</Text>
                            </View>
                        </View>

                        {/* Comparison Table View */}
                        {viewMode === 'comparison' && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Loan Comparison Table</Text>
                                    <TouchableOpacity 
                                        style={styles.toggleInsightsButton}
                                        onPress={() => setShowInsights(!showInsights)}
                                    >
                                        <Text style={styles.toggleInsightsText}>
                                            {showInsights ? '👁️ Hide' : '👁️ Show'} Insights
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.comparisonTable}>
                                    <View style={styles.tableHeader}>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>
                                            <Text style={styles.tableHeaderText}>Loan Name</Text>
                                        </View>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.3 }]}>
                                            <Text style={styles.tableHeaderText}>Principal</Text>
                                        </View>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 0.8 }]}>
                                            <Text style={styles.tableHeaderText}>Rate</Text>
                                        </View>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 0.8 }]}>
                                            <Text style={styles.tableHeaderText}>Term</Text>
                                        </View>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                                            <Text style={styles.tableHeaderText}>Monthly</Text>
                                        </View>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.3 }]}>
                                            <Text style={styles.tableHeaderText}>Interest</Text>
                                        </View>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.3 }]}>
                                            <Text style={styles.tableHeaderText}>Total</Text>
                                        </View>
                                        <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 0.6 }]}>
                                            <Text style={styles.tableHeaderText}>•</Text>
                                        </View>
                                    </View>

                                    {loans.map((loan, index) => {
                                        const isSelected = selectedLoans.has(loan.id);
                                        const loanInterest = loan.totalPayment - loan.amount;
                                        
                                        return (
                                            <View 
                                                key={loan.id} 
                                                style={[
                                                    styles.tableRow,
                                                    index % 2 === 0 && styles.tableRowEven,
                                                    isSelected && styles.tableRowSelected
                                                ]}
                                            >
                                                <TouchableOpacity 
                                                    style={[styles.tableCell, { flex: 2 }]}
                                                    onPress={() => router.push(`/${loan.id}/overview`)}
                                                >
                                                    <Text style={styles.loanNameCell}>{loan.name || 'Unnamed Loan'}</Text>
                                                </TouchableOpacity>
                                                <View style={[styles.tableCell, { flex: 1.3 }]}>
                                                    <Text style={styles.tableCellText}>{formatCurrency(loan.amount, currency, 0)}</Text>
                                                </View>
                                                <View style={[styles.tableCell, { flex: 0.8 }]}>
                                                    <Text style={styles.tableCellText}>{loan.interestRate}%</Text>
                                                </View>
                                                <View style={[styles.tableCell, { flex: 0.8 }]}>
                                                    <Text style={styles.tableCellText}>{loan.term} {loan.termUnit === 'years' ? 'yr' : 'mo'}</Text>
                                                </View>
                                                <View style={[styles.tableCell, { flex: 1.2 }]}>
                                                    <Text style={styles.tableCellText}>{formatCurrency(loan.monthlyPayment, currency)}</Text>
                                                </View>
                                                <View style={[styles.tableCell, { flex: 1.3 }]}>
                                                    <Text style={[styles.tableCellText, styles.interestText]}>{formatCurrency(loanInterest, currency, 0)}</Text>
                                                </View>
                                                <View style={[styles.tableCell, { flex: 1.3 }]}>
                                                    <Text style={styles.tableCellText}>{formatCurrency(loan.totalPayment, currency, 0)}</Text>
                                                </View>
                                                <TouchableOpacity 
                                                    style={[styles.tableCell, { flex: 0.6 }]}
                                                    onPress={() => toggleLoanSelection(loan.id)}
                                                >
                                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Grid View */}
                        {viewMode === 'grid' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>All Loans</Text>
                                <View style={styles.loansGrid}>
                                    {loans.map((loan) => {
                                        const loanInterest = loan.totalPayment - loan.amount;
                                        const isSelected = selectedLoans.has(loan.id);
                                        
                                        return (
                                            <TouchableOpacity
                                                key={loan.id}
                                                style={[styles.gridCard, isSelected && styles.gridCardSelected]}
                                                onPress={() => router.push(`/${loan.id}/overview`)}
                                            >
                                                <View style={styles.gridCardHeader}>
                                                    <Text style={styles.gridCardName}>{loan.name || 'Unnamed Loan'}</Text>
                                                    <TouchableOpacity 
                                                        style={styles.gridCardCheckbox}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            toggleLoanSelection(loan.id);
                                                        }}
                                                    >
                                                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={styles.gridCardAmount}>{formatCurrency(loan.amount, currency, 0)}</Text>
                                                <View style={styles.gridCardRow}>
                                                    <Text style={styles.gridCardLabel}>Rate:</Text>
                                                    <Text style={styles.gridCardValue}>{loan.interestRate}%</Text>
                                                </View>
                                                <View style={styles.gridCardRow}>
                                                    <Text style={styles.gridCardLabel}>Term:</Text>
                                                    <Text style={styles.gridCardValue}>{loan.term} {loan.termUnit}</Text>
                                                </View>
                                                <View style={styles.gridCardRow}>
                                                    <Text style={styles.gridCardLabel}>Monthly:</Text>
                                                    <Text style={styles.gridCardValue}>{formatCurrency(loan.monthlyPayment, currency)}</Text>
                                                </View>
                                                <View style={styles.gridCardRow}>
                                                    <Text style={styles.gridCardLabel}>Interest:</Text>
                                                    <Text style={[styles.gridCardValue, { color: '#e67e22' }]}>{formatCurrency(loanInterest, currency, 0)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Right Insights Panel */}
            {loans.length > 0 && showInsights && (
                <View style={styles.insightsPanel}>
                    <Text style={styles.insightsPanelTitle}>💡 Insights</Text>
                    
                    <View style={styles.insightCard}>
                        <Text style={styles.insightLabel}>Selected Loans</Text>
                        <Text style={styles.insightValue}>{selectedLoans.size} of {loans.length}</Text>
                    </View>

                    {highestRateLoan && (
                        <View style={styles.insightCard}>
                            <Text style={styles.insightBadge}>⚠️ Highest Rate</Text>
                            <Text style={styles.insightLoanName}>{highestRateLoan.name || 'Unnamed'}</Text>
                            <Text style={styles.insightRate}>{highestRateLoan.interestRate}%</Text>
                            <Text style={styles.insightText}>
                                Prioritize this loan for extra payments
                            </Text>
                        </View>
                    )}

                    {lowestRateLoan && highestRateLoan && lowestRateLoan.id !== highestRateLoan.id && (
                        <View style={styles.insightCard}>
                            <Text style={styles.insightBadgeGreen}>✅ Lowest Rate</Text>
                            <Text style={styles.insightLoanName}>{lowestRateLoan.name || 'Unnamed'}</Text>
                            <Text style={styles.insightRate}>{lowestRateLoan.interestRate}%</Text>
                            <Text style={styles.insightText}>
                                Most favorable terms
                            </Text>
                        </View>
                    )}

                    {selectedLoans.size > 1 && (
                        <View style={[styles.insightCard, { backgroundColor: '#f8f9fa' }]}>
                            <Text style={styles.insightBadge}>💰 Strategy</Text>
                            <Text style={styles.insightText}>
                                <Text style={{ fontWeight: '700' }}>Avalanche:</Text> Pay minimums on all, extra to highest rate ({highestRateLoan?.interestRate}%)
                            </Text>
                            <View style={styles.divider} />
                            <Text style={styles.insightText}>
                                <Text style={{ fontWeight: '700' }}>Snowball:</Text> Pay off smallest balance first for motivation
                            </Text>
                        </View>
                    )}

                    <View style={styles.insightCard}>
                        <Text style={styles.insightLabel}>Avg Interest Rate</Text>
                        <Text style={styles.insightValue}>
                            {selectedLoanObjects.length > 0 
                                ? (selectedLoanObjects.reduce((sum, l) => sum + l.interestRate, 0) / selectedLoanObjects.length).toFixed(2)
                                : '0.00'}%
                        </Text>
                    </View>

                    <View style={styles.insightCard}>
                        <Text style={styles.insightLabel}>Interest Ratio</Text>
                        <Text style={styles.insightValue}>
                            {totalBorrowed > 0 ? ((totalInterest / totalBorrowed) * 100).toFixed(1) : '0'}%
                        </Text>
                        <Text style={styles.insightSubtext}>of principal</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#f5f7fa',
    },
    // Left Sidebar
    sidebar: {
        width: 260,
        backgroundColor: '#1e293b',
        borderRightWidth: 1,
        borderRightColor: '#0f172a',
        flexDirection: 'column',
    },
    sidebarHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    appTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    sidebarSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    sidebarLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 12,
    },
    sidebarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 6,
        marginBottom: 4,
    },
    sidebarButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    sidebarButtonIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    sidebarButtonText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    sidebarButtonTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    loansList: {
        maxHeight: 300,
    },
    loanItem: {
        padding: 10,
        borderRadius: 6,
        marginBottom: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    loanItemName: {
        fontSize: 13,
        color: 'white',
        fontWeight: '500',
        marginBottom: 2,
    },
    loanItemAmount: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
    },
    sidebarFooter: {
        marginTop: 'auto',
        padding: 16,
        gap: 8,
    },
    newLoanButton: {
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    newLoanButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteAllButton: {
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    deleteAllButtonText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '500',
    },
    // Main Content
    mainContent: {
        flex: 1,
        padding: 24,
    },
    emptyState: {
        flex: 1,
        backgroundColor: 'white',
        padding: 60,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 22,
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 6,
    },
    emptyButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    toggleInsightsButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    toggleInsightsText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    comparisonTable: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderBottomWidth: 2,
        borderBottomColor: '#e5e7eb',
    },
    tableHeaderCell: {
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    tableRowEven: {
        backgroundColor: '#fafbfc',
    },
    tableRowSelected: {
        backgroundColor: '#eff6ff',
    },
    tableCell: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    loanNameCell: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    tableCellText: {
        fontSize: 13,
        color: theme.colors.textPrimary,
    },
    interestText: {
        color: '#e67e22',
        fontWeight: '500',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    checkmark: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    // Grid View
    loansGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 16,
    },
    gridCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 10,
        width: '31%' as any,
        minWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    gridCardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: '#f0f9ff',
    },
    gridCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    gridCardName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        flex: 1,
    },
    gridCardCheckbox: {
        marginLeft: 8,
    },
    gridCardAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 12,
    },
    gridCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    gridCardLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    gridCardValue: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    // Right Insights Panel
    insightsPanel: {
        width: 280,
        backgroundColor: 'white',
        borderLeftWidth: 1,
        borderLeftColor: '#e5e7eb',
        padding: 20,
    },
    insightsPanelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 16,
    },
    insightCard: {
        backgroundColor: 'white',
        padding: 14,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    insightLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    insightValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    insightSubtext: {
        fontSize: 10,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    insightBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: '#e67e22',
        textTransform: 'uppercase',
        backgroundColor: '#fef5e7',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    insightBadgeGreen: {
        fontSize: 9,
        fontWeight: '700',
        color: '#27ae60',
        textTransform: 'uppercase',
        backgroundColor: '#e8f8f5',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    insightLoanName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    insightRate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 6,
    },
    insightText: {
        fontSize: 11,
        lineHeight: 16,
        color: theme.colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 10,
    },
});
