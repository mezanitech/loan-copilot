// WEB-SPECIFIC VERSION - Loan Comparison Dashboard
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/theme';
import { cancelLoanNotifications } from '../../utils/notificationUtils';
import { getCurrencyPreference, Currency } from '../../utils/storage';
import { formatCurrency } from '../../utils/currencyUtils';
import EmptyState from '../../components/EmptyState.web';
import { DashboardSkeleton } from '../../components/LoadingSkeleton.web';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.web';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext.web';

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

function ComparisonDashboardContent() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set());
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const [viewMode, setViewMode] = useState<ViewMode>('comparison');
    const [showInsights, setShowInsights] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [insightsPanelWidth, setInsightsPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const router = useRouter();
    const { mode, toggleTheme, colors } = useTheme();
    
    // Create styles based on current theme
    const styles = createStyles(colors, mode);
    
    // Enable keyboard shortcuts
    useKeyboardShortcuts();

    // Handle insights panel resize
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            setInsightsPanelWidth(Math.max(250, Math.min(500, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Handle sidebar resize
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingSidebar) return;
            const newWidth = e.clientX;
            setSidebarWidth(Math.max(200, Math.min(400, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
        };

        if (isResizingSidebar) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingSidebar]);

    // Handle window resize for responsive behavior
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            // Auto-hide insights on smaller screens
            if (width < 1200) {
                setShowInsights(false);
            } else {
                setShowInsights(true);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadLoans = async () => {
        try {
            setIsLoading(true);
            const storedLoans = await AsyncStorage.getItem('loans');
            if (storedLoans) {
                const parsedLoans = JSON.parse(storedLoans);
                setLoans(parsedLoans);
                setSelectedLoans(new Set(parsedLoans.map((l: Loan) => l.id)));
            }
        } catch (error) {
            console.error('Failed to load loans:', error);
        } finally {
            setTimeout(() => setIsLoading(false), 300); // Small delay for smooth transition
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
        if (window.confirm("Are you sure you want to delete all loans? This cannot be undone.")) {
            try {
                for (const loan of loans) {
                    if (loan.scheduledNotificationIds && loan.scheduledNotificationIds.length > 0) {
                        await cancelLoanNotifications(loan.scheduledNotificationIds);
                    }
                }
                await AsyncStorage.setItem('loans', JSON.stringify([]));
                setLoans([]);
                setSelectedLoans(new Set());
                alert("All loans have been deleted.");
            } catch (error) {
                console.error('Failed to delete loans:', error);
                alert("Failed to delete loans");
            }
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Left Sidebar */}
            <View style={{ width: sidebarWidth, position: 'relative' }}>
                <ScrollView style={[styles.sidebar, { backgroundColor: colors.sidebar, width: '100%' }]}>
                    <View style={styles.sidebarHeader}>
                        <Text style={[styles.appTitle, { color: colors.sidebarTextActive }]}>💰 Loan Co-Pilot</Text>
                    </View>

                <View style={styles.sidebarSection}>
                    <Text style={styles.sidebarLabel}>NAVIGATION</Text>
                    <TouchableOpacity 
                        style={[styles.sidebarButton, viewMode === 'comparison' && styles.sidebarButtonActive]}
                        onPress={() => setViewMode('comparison')}
                    >
                        <Text style={styles.sidebarButtonIcon}></Text>
                        <Text style={[styles.sidebarButtonText, viewMode === 'comparison' && styles.sidebarButtonTextActive]}>Comparison View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.sidebarButton, viewMode === 'grid' && styles.sidebarButtonActive]}
                        onPress={() => setViewMode('grid')}
                    >
                        <Text style={styles.sidebarButtonIcon}></Text>
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
                    <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
                        <Text style={styles.themeToggleIcon}>{mode === 'light' ? '🌙' : '☀️'}</Text>
                        <Text style={styles.themeToggleText}>{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</Text>
                    </TouchableOpacity>
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
                </ScrollView>
                {/* Resize Handle */}
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        cursor: 'ew-resize',
                        backgroundColor: isResizingSidebar ? colors.primary : 'transparent',
                        zIndex: 10,
                    }}
                    onMouseDown={() => setIsResizingSidebar(true)}
                />
            </View>

            {/* Main Content */}
            <ScrollView style={[styles.mainContent, { backgroundColor: colors.backgroundSecondary }]}>
                {isLoading ? (
                    <DashboardSkeleton />
                ) : loans.length === 0 ? (
                    <EmptyState
                        icon="📊"
                        title="No Loans Yet"
                        description="Create your first loan to start comparing and optimizing your debt payoff strategy. Track multiple loans, compare interest rates, and visualize your path to being debt-free."
                        actionText="Create Your First Loan"
                        actionLink="/createLoan"
                    />
                ) : (
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

            {/* Right Insights Panel - Conditionally shown */}
            {windowWidth >= 1200 && showInsights && loans.length > 0 && (
                <View style={{ width: insightsPanelWidth, position: 'relative' }}>
                    {/* Resize Handle */}
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            cursor: 'ew-resize',
                            backgroundColor: isResizing ? colors.primary : 'transparent',
                            zIndex: 10,
                        }}
                        onMouseDown={() => setIsResizing(true)}
                    />
                    <ScrollView style={[styles.insightsPanel, { backgroundColor: colors.card, borderLeftColor: colors.border, width: '100%' }]}>
                        <Text style={[styles.insightsPanelTitle, { color: colors.textPrimary }]}>💡 Insights</Text>
                    
                    <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                        <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Selected Loans</Text>
                        <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{selectedLoans.size} of {loans.length}</Text>
                    </View>

                    {highestRateLoan && (
                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={styles.insightBadge}>⚠️ Highest Rate</Text>
                            <Text style={[styles.insightLoanName, { color: colors.textPrimary }]}>{highestRateLoan.name || 'Unnamed'}</Text>
                            <Text style={[styles.insightRate, { color: colors.primary }]}>{highestRateLoan.interestRate}%</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                Prioritize this loan for extra payments
                            </Text>
                        </View>
                    )}

                    {lowestRateLoan && highestRateLoan && lowestRateLoan.id !== highestRateLoan.id && (
                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={styles.insightBadgeGreen}>✅ Lowest Rate</Text>
                            <Text style={[styles.insightLoanName, { color: colors.textPrimary }]}>{lowestRateLoan.name || 'Unnamed'}</Text>
                            <Text style={[styles.insightRate, { color: colors.primary }]}>{lowestRateLoan.interestRate}%</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                Most favorable terms
                            </Text>
                        </View>
                    )}

                    {selectedLoans.size > 1 && (
                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#f8f9fa', borderColor: colors.border }]}>
                            <Text style={styles.insightBadge}>💰 Strategy</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                <Text style={{ fontWeight: '700' }}>Avalanche:</Text> Pay minimums on all, extra to highest rate ({highestRateLoan?.interestRate}%)
                            </Text>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                <Text style={{ fontWeight: '700' }}>Snowball:</Text> Pay off smallest balance first for motivation
                            </Text>
                        </View>
                    )}

                    <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                        <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Interest Rate</Text>
                        <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                            {selectedLoanObjects.length > 0 
                                ? (selectedLoanObjects.reduce((sum, l) => sum + l.interestRate, 0) / selectedLoanObjects.length).toFixed(2)
                                : '0.00'}%
                        </Text>
                    </View>

                    <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                        <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Interest Ratio</Text>
                        <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                            {totalBorrowed > 0 ? ((totalInterest / totalBorrowed) * 100).toFixed(1) : '0'}%
                        </Text>
                        <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>of principal</Text>
                    </View>
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const createStyles = (colors: any, mode: string) => StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.background,
    },
    // Left Sidebar
    sidebar: {
        flex: 1,
        backgroundColor: colors.sidebar,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        flexDirection: 'column',
    },
    sidebarHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    appTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    sidebarSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sidebarLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.sidebarText,
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
        backgroundColor: colors.primary,
    },
    sidebarButtonIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    sidebarButtonText: {
        fontSize: 14,
        color: colors.sidebarText,
    },
    sidebarButtonTextActive: {
        color: colors.sidebarTextActive,
        fontWeight: '600',
    },
    loansList: {
        maxHeight: 300,
    },
    loanItem: {
        padding: 10,
        borderRadius: 6,
        marginBottom: 4,
        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    loanItemName: {
        fontSize: 13,
        color: colors.sidebarTextActive,
        fontWeight: '500',
        marginBottom: 2,
    },
    loanItemAmount: {
        fontSize: 11,
        color: colors.sidebarText,
    },
    sidebarFooter: {
        marginTop: 'auto',
        padding: 16,
        gap: 8,
    },
    newLoanButton: {
        backgroundColor: colors.primary,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    newLoanButtonText: {
        color: colors.textInverse,
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
        backgroundColor: colors.background,
    },
    emptyState: {
        flex: 1,
        backgroundColor: colors.card,
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
        color: colors.textPrimary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 22,
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: colors.primary,
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
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
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
        color: colors.textPrimary,
    },
    toggleInsightsButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: colors.backgroundSecondary,
    },
    toggleInsightsText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    comparisonTable: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.backgroundSecondary,
        borderBottomWidth: 2,
        borderBottomColor: colors.border,
    },
    tableHeaderCell: {
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableRowEven: {
        backgroundColor: colors.backgroundSecondary,
    },
    tableRowSelected: {
        backgroundColor: mode === 'dark' ? 'rgba(167, 139, 250, 0.1)' : '#eff6ff',
    },
    tableCell: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    loanNameCell: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    tableCellText: {
        fontSize: 13,
        color: colors.textPrimary,
    },
    interestText: {
        color: '#e67e22',
        fontWeight: '500',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
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
        backgroundColor: colors.card,
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
        borderColor: colors.border,
    },
    gridCardSelected: {
        borderColor: colors.primary,
        backgroundColor: mode === 'dark' ? 'rgba(167, 139, 250, 0.1)' : '#f0f9ff',
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
        color: colors.textPrimary,
        flex: 1,
    },
    gridCardCheckbox: {
        marginLeft: 8,
    },
    gridCardAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 12,
    },
    gridCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    gridCardLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    gridCardValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    // Right Insights Panel
    insightsPanel: {
        flex: 1,
        backgroundColor: colors.background,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        padding: 20,
    },
    insightsPanelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    insightCard: {
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    insightLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    insightValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    insightSubtext: {
        fontSize: 10,
        color: colors.textTertiary,
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
        color: colors.textPrimary,
        marginBottom: 4,
    },
    insightRate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 6,
    },
    insightText: {
        fontSize: 11,
        lineHeight: 16,
        color: colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 10,
    },
    themeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
        gap: 10,
    },
    themeToggleIcon: {
        fontSize: 18,
    },
    themeToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.sidebarTextActive,
    },
    fadeIn: {
        opacity: 1,
    },
});

export default function ComparisonDashboard() {
    return (
        <ThemeProvider>
            <ComparisonDashboardContent />
        </ThemeProvider>
    );
}
