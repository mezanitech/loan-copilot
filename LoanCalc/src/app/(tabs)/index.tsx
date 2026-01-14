// Import necessary components and hooks from React Native and Expo Router
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, Platform, ActivityIndicator } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { theme } from '../../constants/theme';
import PieChart from '../../components/PieChart';
import OnboardingSlider from '../../components/OnboardingSlider';
import { cancelLoanNotifications } from '../../utils/notificationUtils';
import { getCurrencyPreference, Currency } from '../../utils/storage';
import { formatCurrency } from '../../utils/currencyUtils';

// Only import PDF generation on native platforms
const generateRobustLoanPDF = Platform.OS !== 'web' 
  ? require('../../utils/pdfLibReportUtils').generateRobustLoanPDF 
  : null;

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
    currentMonthlyPayment?: number;
    remainingBalance?: number;
    freedomDate?: string | null;
    rateAdjustments?: Array<{ month: string; newRate: string }>;
    earlyPayments?: Array<{ 
        name?: string;
        type: 'one-time' | 'recurring';
        amount: number;
        month: string;
        frequency?: string;
    }>;
};

export default function DashboardScreen() {
    // State to store all loans
    const [loans, setLoans] = useState<Loan[]>([]);
    const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const [isExportingPortfolio, setIsExportingPortfolio] = useState(false);
    const router = useRouter();

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
            loadCurrency();
        }, [])
    );

    const loadCurrency = async () => {
        const curr = await getCurrencyPreference();
        setCurrency(curr);
    };

    // Function to delete a loan by its ID
    const deleteLoan = async (id: string) => {
        try {
            // Find the loan to get its notification IDs
            const loan = loans.find(l => l.id === id);
            
            // Cancel notifications if they exist
            if (loan?.scheduledNotificationIds && loan.scheduledNotificationIds.length > 0) {
                await cancelLoanNotifications(loan.scheduledNotificationIds);
            }
            
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

    // Export all loans to PDF
    const exportAllLoansPDF = async () => {
        // PDF generation not available on web
        if (Platform.OS === 'web' || !generateRobustLoanPDF) {
            Alert.alert("Not Available", "PDF generation is only available on mobile devices.");
            return;
        }
        
        if (loans.length === 0) {
            Alert.alert("No Loans", "Add some loans first to export a report.");
            return;
        }

        Alert.alert(
            "📄 Export Portfolio",
            "This will export a summary of all your loans.\n\n💡 Tip: You can also export detailed reports for individual loans from their overview page.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Export All", 
                    onPress: () => {
                        setIsExportingPortfolio(true);
                        // Wrap in setTimeout to isolate from UI thread
                        setTimeout(async () => {
                            try {
                                // For portfolio summary, create comprehensive loan data
                                const portfolioData = {
                                    loanId: 'portfolio-summary',
                                    name: `Portfolio of ${loans.length} Loan${loans.length === 1 ? '' : 's'}`,
                                    amount: totalBorrowed,
                                    interestRate: 0, // Will be handled specially in header
                                    termInMonths: 0, // Will be handled specially in header
                                    monthlyPayment: totalMonthlyPayment,
                                    totalPayment: totalRemaining,
                                    payments: loans.map((loan, index) => {
                                        const termInMonths = loan.term * (loan.termUnit === 'years' ? 12 : 1);
                                        const totalPayment = loan.monthlyPayment * termInMonths;
                                        const totalInterest = totalPayment - loan.amount;
                                        const remaining = loan.remainingBalance ?? calculateRemainingPrincipal(loan);
                                        const currentRate = getCurrentInterestRate(loan);
                                        
                                        return {
                                            number: index + 1,
                                            principal: loan.amount, // Original loan amount
                                            interest: remaining, // Remaining balance
                                            balance: loan.currentMonthlyPayment ?? loan.monthlyPayment, // Current monthly payment
                                            date: loan.name || `Loan ${index + 1}`, // Loan name
                                            // Additional portfolio-specific fields
                                            loanName: loan.name || `Loan ${index + 1}`,
                                            interestRate: currentRate,
                                            term: `${loan.term}${loan.termUnit.charAt(0)}`,
                                            totalInterest: totalInterest,
                                            startDate: loan.startDate,
                                            freedomDate: loan.freedomDate,
                                            earlyPayments: loan.earlyPayments && Array.isArray(loan.earlyPayments) ? loan.earlyPayments : undefined,
                                            rateAdjustments: loan.rateAdjustments && Array.isArray(loan.rateAdjustments) ? loan.rateAdjustments : undefined
                                        };
                                    })
                                };
                                
                                // Generate PDF using robust pdf-lib
                                const pdfBytes = await generateRobustLoanPDF(portfolioData, currency);
                                
                                // Save to device
                                const filename = 'loan_portfolio_summary.pdf';
                                const uri = FileSystem.documentDirectory + filename;
                                
                                // Convert Uint8Array to base64 string
                                const base64String = btoa(String.fromCharCode(...pdfBytes));
                                
                                await FileSystem.writeAsStringAsync(uri, base64String, {
                                    encoding: 'base64',
                                });
                                
                                // Reset loading state before sharing (share dialog might be cancelled)
                                setIsExportingPortfolio(false);
                                
                                // Share - this may throw if user cancels, but loading state already reset
                                await Sharing.shareAsync(uri, { 
                                    mimeType: 'application/pdf',
                                    dialogTitle: 'Share Loan Portfolio Summary'
                                });
                            } catch (error) {
                                // Ensure loading state is reset even if error occurs
                                setIsExportingPortfolio(false);
                                // Only show alert for actual PDF generation errors
                                if (error instanceof Error && !error.message.includes('cancel')) {
                                    Alert.alert("Error", "Failed to generate PDF");
                                }
                            }
                        }, 0);
                    }
                }
            ]
        );
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
    const totalMonthlyPayment = loans.reduce((sum, loan) => sum + (loan.currentMonthlyPayment ?? loan.monthlyPayment), 0);
    
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
    
    // Calculate remaining principal for all loans
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
    
    const totalRemaining = loans.reduce((sum, loan) => sum + (loan.remainingBalance ?? calculateRemainingPrincipal(loan)), 0);

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

    // Memoize pie chart data to prevent recalculating on every render
    const totalBorrowedData = useMemo(() => 
        loans.map((loan, index) => ({
            value: loan.amount,
            color: pieColors[index % pieColors.length],
            label: loan.name || `Loan ${index + 1}`
        })),
        [loans]
    );

    const remainingData = useMemo(() => 
        loans.map((loan, index) => ({
            value: loan.remainingBalance ?? calculateRemainingPrincipal(loan),
            color: pieColors[index % pieColors.length],
            label: loan.name || `Loan ${index + 1}`
        })),
        [loans]
    );

    const monthlyPaymentData = useMemo(() => 
        loans.map((loan, index) => ({
            value: loan.currentMonthlyPayment ?? loan.monthlyPayment,
            color: pieColors[index % pieColors.length],
            label: loan.name || `Loan ${index + 1}`
        })),
        [loans]
    );

    return (
        <View style={styles.wrapper}>
            <ScrollView style={styles.container}>
        {/* Page header */}
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>My Loans</Text>
                <Text style={styles.subtitle}>Manage your financial journey</Text>
            </View>
            <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowSettings(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity>
        </View>

        {/* Summary cards if loans exist */}
        {loans.length > 0 && (
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Borrowed</Text>
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{formatCurrency(totalBorrowed, currency, 0)}</Text>
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
                    <Text style={styles.summaryLabel}>Remaining Principal</Text>
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{formatCurrency(totalRemaining, currency)}</Text>
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
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{formatCurrency(totalMonthlyPayment, currency)}</Text>
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

        {/* Extra Payment Button - shows only when loans exist */}
        {loans.length > 0 && (
            <Link href="/(tabs)/addExtraPayment" asChild>
                <TouchableOpacity style={styles.extraPaymentButton} activeOpacity={0.8}>
                    <Text style={styles.extraPaymentButtonText}>💰 Add Extra Payment</Text>
                </TouchableOpacity>
            </Link>
        )}

        {/* Show message if no loans exist */}
        {loans.length === 0 ? (
            <View style={styles.emptyState}>
                <Image 
                    source={require('../../../assets/icon.png')}
                    style={styles.emptyIllustration}
                    resizeMode="contain"
                />
                <Text style={styles.emptyText}>Start Your Financial Journey</Text>
                <Text style={styles.emptySubtext}>Track loans, visualize payments, and reach your goals faster</Text>
                
                <TouchableOpacity 
                    style={styles.emptyCTA}
                    onPress={() => router.push('/(tabs)/createLoan')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.emptyCTAText}>Create Your First Loan</Text>
                </TouchableOpacity>

                <View style={styles.emptyFeatures}>
                    <View style={styles.emptyFeature}>
                        <Text style={styles.emptyFeatureIcon}>✓</Text>
                        <Text style={styles.emptyFeatureText}>Track multiple loans in one place</Text>
                    </View>
                    <View style={styles.emptyFeature}>
                        <Text style={styles.emptyFeatureIcon}>✓</Text>
                        <Text style={styles.emptyFeatureText}>Visualize payment schedules & savings</Text>
                    </View>
                    <View style={styles.emptyFeature}>
                        <Text style={styles.emptyFeatureIcon}>✓</Text>
                        <Text style={styles.emptyFeatureText}>Plan extra payments to save interest</Text>
                    </View>
                </View>
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
                                    <Text style={styles.loanAmount}>{formatCurrency(loan.amount, currency, 0)}</Text>
                                    {!isExpanded && (
                                        <Text style={styles.loanSubtitle}>
                                            {formatCurrency(loan.currentMonthlyPayment ?? loan.monthlyPayment, currency)}/month • {loan.term} {loan.termUnit}
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
                                        <Text style={styles.loanSubtitle}>{loan.term} {loan.termUnit} @ {getCurrentInterestRate(loan)}%</Text>
                                        
                                        {/* Current Monthly payment highlight */}
                                        <View style={styles.paymentHighlight}>
                                            <Text style={styles.paymentLabel}>Current Monthly Payment</Text>
                                            <Text style={styles.paymentValue}>{formatCurrency(loan.currentMonthlyPayment ?? loan.monthlyPayment, currency)}</Text>
                                        </View>
                                        
                                        {/* Loan details section */}
                                        <View style={styles.loanDetails}>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Start Date</Text>
                                                <Text style={styles.detailValue}>{(() => { const [y, m, d] = loan.startDate.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })()}</Text>
                                            </View>
                                            {loan.freedomDate && (
                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>🎊 Freedom Day</Text>
                                                    <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                                                        {new Date(loan.freedomDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Remaining Balance</Text>
                                                <Text style={[styles.detailValue, { color: theme.colors.primary }]}>{formatCurrency(loan.remainingBalance ?? calculateRemainingPrincipal(loan), currency, 0)}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Total Payment</Text>
                                                <Text style={styles.detailValue}>{formatCurrency(loan.totalPayment, currency, 0)}</Text>
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
        
        <OnboardingSlider 
            visible={showOnboarding} 
            onComplete={() => setShowOnboarding(false)} 
        />

        {/* Settings Menu Modal */}
        <Modal
            visible={showSettings}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSettings(false)}
        >
            <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowSettings(false)}
            >
                <View style={styles.settingsMenu}>
                    <Text style={styles.settingsTitle}>Settings</Text>
                    
                    {loans.length > 0 && (
                        <TouchableOpacity 
                            style={[styles.menuItem, isExportingPortfolio && styles.menuItemDisabledState]}
                            onPress={() => {
                                if (!isExportingPortfolio) {
                                    setShowSettings(false);
                                    exportAllLoansPDF();
                                }
                            }}
                            disabled={isExportingPortfolio}
                        >
                            {isExportingPortfolio ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} style={styles.menuIcon} />
                            ) : (
                                <Text style={styles.menuIcon}>📄</Text>
                            )}
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>
                                    {isExportingPortfolio ? 'Generating...' : 'Export Portfolio'}
                                </Text>
                                <Text style={styles.menuSubtext}>Download PDF report of all loans</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => {
                            setShowSettings(false);
                            setShowOnboarding(true);
                        }}
                    >
                        <Text style={styles.menuIcon}>📚</Text>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuText}>View Tutorial</Text>
                            <Text style={styles.menuSubtext}>Learn how to use the app</Text>
                        </View>
                    </TouchableOpacity>
                    
                    <Link href="/(tabs)/notificationSettings" asChild>
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => setShowSettings(false)}
                        >
                            <Text style={styles.menuIcon}>🔔</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>Notifications</Text>
                                <Text style={styles.menuSubtext}>Manage payment reminders</Text>
                            </View>
                        </TouchableOpacity>
                    </Link>
                    
                    <Link href="/(tabs)/currencySettings" asChild>
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => setShowSettings(false)}
                        >
                            <Text style={styles.menuIcon}>💱</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>Currency</Text>
                                <Text style={styles.menuSubtext}>Change display currency</Text>
                            </View>
                        </TouchableOpacity>
                    </Link>
                    
                    <Link href="/(tabs)/about" asChild>
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => setShowSettings(false)}
                        >
                            <Text style={styles.menuIcon}>ℹ️</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>About</Text>
                                <Text style={styles.menuSubtext}>App information and privacy</Text>
                            </View>
                        </TouchableOpacity>
                    </Link>
                    
                    <TouchableOpacity 
                        style={[styles.menuItem, styles.menuItemDanger]}
                        onPress={() => {
                            setShowSettings(false);
                            clearAllData();
                        }}
                    >
                        <Text style={styles.menuIcon}>🗑️</Text>
                        <View style={styles.menuTextContainer}>
                            <Text style={[styles.menuText, styles.menuTextDanger]}>Clear All Data</Text>
                            <Text style={styles.menuSubtext}>Delete all loans permanently</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
        </View>
    );
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
    settingsButton: {
        backgroundColor: theme.colors.surfaceGlass,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.glassBorderPurple,
        ...theme.shadows.glass,
    },
    settingsButtonText: {
        fontSize: 20,
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
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        ...theme.shadows.glass,
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
    // Extra payment button
    extraPaymentButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        marginBottom: theme.spacing.lg,
    },
    extraPaymentButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
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
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
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
        marginTop: 40,
        paddingHorizontal: theme.spacing.xl,
    },
    emptyIllustration: {
        width: 120,
        height: 120,
        marginBottom: theme.spacing.xl,
    },
    emptyText: {
        fontSize: theme.fontSize.xxl,
        color: theme.colors.textPrimary,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.spacing.xl,
    },
    emptyCTA: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl * 1.5,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.md,
    },
    emptyCTAText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.semibold,
    },
    emptyFeatures: {
        width: '100%',
        gap: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    emptyFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    emptyFeatureIcon: {
        fontSize: 20,
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    emptyFeatureText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    // Container for all loan cards
    loansContainer: {
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    // Individual loan card styling
    loanCard: {
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        ...theme.shadows.glass,
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
    // Settings menu modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    settingsMenu: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        width: '100%',
        maxWidth: 400,
        ...theme.shadows.lg,
    },
    settingsTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.lg,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        ...theme.shadows.glass,
    },
    menuItemDanger: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    menuItemDisabledState: {
        opacity: 0.5,
    },
    menuIcon: {
        fontSize: 24,
        marginRight: theme.spacing.md,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuText: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    menuTextDanger: {
        color: theme.colors.error,
    },
    menuSubtext: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
});
