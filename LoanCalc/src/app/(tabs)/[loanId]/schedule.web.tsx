// WEB-SPECIFIC VERSION - Payment Schedule Page
import { useState, useEffect, useCallback } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Image as RNImage } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalSearchParams, useFocusEffect, Link } from 'expo-router';
import PaymentDetailCard from "../../../components/PaymentDetailCard";
import { EarlyPayment } from "../../../components/EarlyPaymentList";
import { RateAdjustment } from "../../../components/RateAdjustmentList";
import { theme } from '../../../constants/theme';
import { calculatePayment, generatePaymentSchedule, convertTermToMonths } from "../../../utils/loanCalculations";
import { updateProgress } from "../../../utils/achievementUtils";
import { getCurrencyPreference, Currency } from "../../../utils/storage";
import { formatCurrency } from "../../../utils/currencyUtils";
import { useKeyboardShortcuts } from "../../../hooks/useKeyboardShortcuts.web";
import { ThemeProvider, useTheme } from "../../../contexts/ThemeContext.web";
import MobileAppPromotion from "../../../components/MobileAppPromotion.web";

function LoanScheduleScreenWebContent() {
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    
    const [loanAmount, setLoanAmount] = useState("");
    const [loanName, setLoanName] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("months");
    const [startDate, setStartDate] = useState("");
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]);
    const [rateAdjustments, setRateAdjustments] = useState<RateAdjustment[]>([]);
    const [showAllPayments, setShowAllPayments] = useState(false);
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [insightsPanelWidth, setInsightsPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [showInsights, setShowInsights] = useState(true);
    const { mode, toggleTheme, colors } = useTheme();
    
    const styles = createStyles(colors, mode);
    
    useKeyboardShortcuts();

    // Handle window resize for responsive behavior
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            if (width < 1200) {
                setShowInsights(false);
            } else {
                setShowInsights(true);
            }
            if (width < 768) {
                setIsSidebarCollapsed(true);
            } else {
                setIsSidebarCollapsed(false);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    // Load loan data when component mounts or loanId changes
    useEffect(() => {
        if (loanId) {
            loadLoan(loanId);
        }
    }, [loanId]);

    // Reload loan data when tab comes into focus (to reflect changes from payments tab)
    useFocusEffect(
        useCallback(() => {
            if (loanId) {
                loadLoan(loanId);
            }
            loadCurrency();
            // Reset to collapsed view when returning to this tab
            setShowAllPayments(false);
            
            // Track achievement: viewed schedule (fire and forget)
            updateProgress('schedules_viewed', 1);
        }, [loanId])
    );

    const loadCurrency = async () => {
        const curr = await getCurrencyPreference();
        setCurrency(curr);
    };

    // Load loan details from AsyncStorage
    const loadLoan = async (id: string) => {
        try {
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                const loan = loans.find((l: any) => l.id === id);
                if (loan) {
                    setLoanName(loan.name || "");
                    setLoanAmount(loan.amount.toString());
                    setInterestRate(loan.interestRate.toString());
                    setTerm(loan.term.toString());
                    setTermUnit(loan.termUnit);
                    setStartDate(loan.startDate);
                    setEarlyPayments(loan.earlyPayments || []);
                    setRateAdjustments(loan.rateAdjustments || []);
                }
            }
        } catch (error) {
            console.error('Error loading loan:', error);
        }
    };

    // Generate full payment schedule using centralized utility
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    const termValue = parseFloat(term);
    const termInMonths = convertTermToMonths(termValue, termUnit);
    
    // Convert RateAdjustment[] (strings) to calculation format (numbers)
    const getRateAdjustmentsForCalc = () => {
        return rateAdjustments.map(adj => ({
            month: parseInt(adj.month),
            newRate: parseFloat(adj.newRate)
        }));
    };
    
    // Parse start date from YYYY-MM-DD format
    const [year, month, day] = startDate ? startDate.split('-').map(Number) : [0, 0, 0];
    const startDateObj = year && month && day ? new Date(year, month - 1, day) : new Date();
    
    const paymentSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: startDateObj,
        earlyPayments,
        rateAdjustments: getRateAdjustmentsForCalc()
    });
    
    // Calculate current payment number based on months elapsed
    const monthsElapsed = Math.max(0, Math.floor((new Date().getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    const currentPaymentIndex = Math.min(monthsElapsed, paymentSchedule.length - 1);
    
    // Show first 5, current payment (if not already shown), and last 5 payments when collapsed
    const displayedPayments = showAllPayments || paymentSchedule.length <= 10
        ? paymentSchedule
        : (() => {
            const firstFive = paymentSchedule.slice(0, 5);
            const lastFive = paymentSchedule.slice(-5);
            
            // Check if current payment is already in first 5 or last 5
            const isInFirstFive = currentPaymentIndex < 5;
            const isInLastFive = currentPaymentIndex >= paymentSchedule.length - 5;
            
            if (isInFirstFive || isInLastFive || monthsElapsed === 0) {
                return [...firstFive, ...lastFive];
            }
            
            // Insert current payment between first and last
            return [...firstFive, paymentSchedule[currentPaymentIndex], ...lastFive];
        })();

    // Calculate schedule summary for insights
    const totalPayments = paymentSchedule.reduce((sum, p) => sum + p.payment, 0);
    const totalPrincipal = paymentSchedule.reduce((sum, p) => sum + p.principal, 0);
    const totalInterest = paymentSchedule.reduce((sum, p) => sum + p.interest, 0);
    const paymentsRemaining = Math.max(0, paymentSchedule.length - monthsElapsed);
    const progressPercentage = paymentSchedule.length > 0 ? Math.min(100, Math.round((monthsElapsed / paymentSchedule.length) * 100)) : 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Overlay for small screens when sidebar is open */}
            {!isSidebarCollapsed && windowWidth < 768 && (
                <TouchableOpacity
                    style={styles.overlay}
                    onPress={() => setIsSidebarCollapsed(true)}
                    activeOpacity={1}
                />
            )}
            
            {/* Hamburger Menu Button */}
            {isSidebarCollapsed && (
                <TouchableOpacity 
                    style={[
                        styles.hamburgerButton, 
                        { 
                            backgroundColor: mode === 'dark' ? colors.sidebar : colors.card,
                            borderWidth: mode === 'dark' ? 0 : 1,
                            borderColor: mode === 'dark' ? 'transparent' : colors.border,
                        }
                    ]}
                    onPress={() => setIsSidebarCollapsed(false)}
                >
                    <Text style={[styles.hamburgerIcon, { color: colors.textPrimary }]}>☰</Text>
                </TouchableOpacity>
            )}

            {/* Left Sidebar */}
            {!isSidebarCollapsed && (
                <View style={{ 
                    width: windowWidth < 768 ? 280 : sidebarWidth, 
                    position: windowWidth < 768 ? 'absolute' : 'relative',
                    zIndex: windowWidth < 768 ? 999 : 1,
                    height: windowWidth < 768 ? '100%' : 'auto',
                }}>
                <ScrollView style={[styles.sidebar, { backgroundColor: colors.sidebar, width: '100%' }]}>
                    <View style={styles.sidebarHeader}>
                        <View style={styles.appTitleContainer}>
                            <RNImage source={require('../../../../assets/icon.png')} style={{ width: 32, height: 32, marginRight: 12, borderRadius: 6 }} />
                            <Text style={[styles.appTitle, { color: colors.sidebarTextActive }]}>Loan Co-Pilot</Text>
                        </View>
                        {windowWidth < 768 && (
                            <TouchableOpacity 
                                style={styles.closeSidebarButton}
                                onPress={() => setIsSidebarCollapsed(true)}
                            >
                                <Text style={[styles.closeSidebarIcon, { color: colors.textPrimary }]}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.sidebarSection}>
                        <Text style={styles.sidebarLabel}>NAVIGATION</Text>
                        <Link href="/(tabs)" asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}>←</Text>
                                <Text style={styles.sidebarButtonText}>Dashboard</Text>
                            </TouchableOpacity>
                        </Link>
                        <Link href={`/(tabs)/${loanId}/overview`} asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}></Text>
                                <Text style={styles.sidebarButtonText}>Loan Details</Text>
                            </TouchableOpacity>
                        </Link>
                        <Link href={`/(tabs)/${loanId}/payments`} asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}></Text>
                                <Text style={styles.sidebarButtonText}>Adjustments</Text>
                            </TouchableOpacity>
                        </Link>
                        <TouchableOpacity style={[styles.sidebarButton, styles.sidebarButtonActive]}>
                            <Text style={styles.sidebarButtonIcon}></Text>
                            <Text style={[styles.sidebarButtonText, styles.sidebarButtonTextActive]}>Payment Schedule</Text>
                        </TouchableOpacity>
                    </View>

                    {paymentSchedule.length > 0 && windowWidth >= 1024 && (
                        <View style={styles.sidebarQuickView}>
                            <Text style={styles.quickViewLabel}>SCHEDULE SUMMARY</Text>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Total Payments</Text>
                                <Text style={styles.quickViewValue}>{paymentSchedule.length}</Text>
                            </View>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Progress</Text>
                                <Text style={styles.quickViewValue}>{progressPercentage}%</Text>
                            </View>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Remaining</Text>
                                <Text style={styles.quickViewValue}>{paymentsRemaining}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.sidebarFooter}>
                        <TouchableOpacity 
                            style={styles.appStoreBanner}
                            onPress={() => typeof window !== 'undefined' && window.open('https://apps.apple.com/app/apple-store/id6757390003?pt=128423727&ct=WebRef&mt=8', '_blank')}
                        >
                            <View style={styles.appStoreBannerContent}>
                                <View style={styles.appStoreIconContainer}>
                                    <RNImage 
                                        source={require('../../../../assets/icon.png')} 
                                        style={styles.appStoreIconImage}
                                    />
                                </View>
                                <View style={styles.appStoreBannerText}>
                                    <Text style={styles.appStoreBadgeSmall}>Download on the</Text>
                                    <Text style={styles.appStoreBadgeLarge}>App Store</Text>
                                    <Text style={styles.appStoreBannerSubtitle}>Get the full iOS experience with offline support, widgets, and more!</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
                            <Text style={styles.themeToggleIcon}>{mode === 'light' ? '🌙' : '☀️'}</Text>
                            <Text style={styles.themeToggleText}>{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</Text>
                        </TouchableOpacity>
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
            )}

            {/* Main Content */}
            <ScrollView style={styles.mainContent} contentContainerStyle={styles.contentContainer}>
                <View style={styles.pageHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageTitle}>{loanName ? `${loanName} - Schedule` : 'Payment Schedule'}</Text>
                        <Text style={styles.pageSubtitle}>
                            Detailed breakdown of each payment over the life of your loan
                        </Text>
                    </View>
                </View>

                {/* Show payment schedule or empty message */}
                {paymentSchedule.length > 0 ? (
                    <View style={styles.paymentDetailsContainer}>
                        {displayedPayments.map((payment, index) => (
                            <View key={index}>
                                {/* Individual payment card */}
                                <PaymentDetailCard 
                                    paymentNumber={payment.paymentNumber}
                                    date={payment.date}
                                    payment={payment.payment}
                                    principal={payment.principal}
                                    interest={payment.interest}
                                    balance={payment.balance}
                                    isCurrentPayment={payment.paymentNumber === currentPaymentIndex + 1}
                                />
                                {/* Show separator (...) between sections */}
                                {!showAllPayments && (
                                    <>
                                        {/* After first 5 */}
                                        {index === 4 && paymentSchedule.length > 10 && currentPaymentIndex >= 5 && currentPaymentIndex < paymentSchedule.length - 5 && (
                                            <View style={styles.separator}>
                                                <Text style={styles.separatorText}>⋮</Text>
                                            </View>
                                        )}
                                        {/* After current payment (if shown separately) */}
                                        {index === 5 && paymentSchedule.length > 10 && currentPaymentIndex >= 5 && currentPaymentIndex < paymentSchedule.length - 5 && (
                                            <View style={styles.separator}>
                                                <Text style={styles.separatorText}>⋮</Text>
                                            </View>
                                        )}
                                        {/* Between first and last when no current payment shown */}
                                        {index === 4 && paymentSchedule.length > 10 && (currentPaymentIndex < 5 || currentPaymentIndex >= paymentSchedule.length - 5 || monthsElapsed === 0) && (
                                            <View style={styles.separator}>
                                                <Text style={styles.separatorText}>⋮</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        ))}
                        {/* "Show All" button (only shown when collapsed and more than 10 payments) */}
                        {!showAllPayments && paymentSchedule.length > 10 && (
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={() => setShowAllPayments(true)}
                            >
                                <Text style={styles.expandButtonText}>
                                    Show All {paymentSchedule.length} Payments
                                </Text>
                            </TouchableOpacity>
                        )}
                        {/* "Show Less" button (only shown when expanded and more than 10 payments) */}
                        {showAllPayments && paymentSchedule.length > 10 && (
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={() => setShowAllPayments(false)}
                            >
                                <Text style={styles.expandButtonText}>
                                    Show Less
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <Text style={styles.emptyText}>No payment schedule available</Text>
                )}
            </ScrollView>

            {/* Right Insights Panel */}
            {windowWidth >= 1200 && showInsights && paymentSchedule.length > 0 && (
                <View style={{ width: insightsPanelWidth, position: 'relative' }}>
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
                        <Text style={[styles.insightsPanelTitle, { color: colors.textPrimary }]}>📊 Schedule Summary</Text>
                    
                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Total Payments</Text>
                            <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                                {formatCurrency(totalPayments, currency, 0)}
                            </Text>
                            <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                over {paymentSchedule.length} months
                            </Text>
                        </View>

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Principal Paid</Text>
                            <Text style={[styles.insightValue, { color: colors.success }]}>
                                {formatCurrency(totalPrincipal, currency, 0)}
                            </Text>
                            <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                actual loan amount
                            </Text>
                        </View>

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Interest Paid</Text>
                            <Text style={[styles.insightValue, { color: '#e67e22' }]}>
                                {formatCurrency(totalInterest, currency, 0)}
                            </Text>
                            <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                {principal > 0 ? `${((totalInterest / principal) * 100).toFixed(1)}% of principal` : ''}
                            </Text>
                        </View>

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Progress</Text>
                            <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                                {progressPercentage}%
                            </Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: colors.primary }]} />
                            </View>
                            <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                {monthsElapsed} of {paymentSchedule.length} payments made
                            </Text>
                        </View>

                        {earlyPayments.length > 0 && (
                            <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#f0fdf4', borderColor: '#22c55e' }]}>
                                <Text style={[styles.insightBadge, { backgroundColor: '#f0fdf4', color: '#22c55e' }]}>✅ EXTRA PAYMENTS</Text>
                                <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                    You have {earlyPayments.length} extra payment{earlyPayments.length !== 1 ? 's' : ''} scheduled. This will help you pay off your loan faster and save on interest!
                                </Text>
                            </View>
                        )}

                        {rateAdjustments.length > 0 && (
                            <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#fef5e7', borderColor: '#e67e22' }]}>
                                <Text style={[styles.insightBadge, { backgroundColor: '#fef5e7', color: '#e67e22' }]}>📈 RATE CHANGES</Text>
                                <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                    Your interest rate changes {rateAdjustments.length} time{rateAdjustments.length !== 1 ? 's' : ''} during this loan period, affecting your monthly payments.
                                </Text>
                            </View>
                        )}

                        {/* Mobile App Promotional Banner */}
                        <MobileAppPromotion 
                            insightCardStyle={styles.insightCard}
                            insightBadgeStyle={styles.insightBadge}
                            insightTextStyle={styles.insightText}
                        />

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#f0f9ff', borderColor: colors.primary }]}>
                            <Text style={styles.insightBadge}>💡 TIP</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                Notice how your early payments go mostly toward interest at first, then shift to more principal later. Extra payments help reduce the principal faster!
                            </Text>
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
    overlay: {
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 998,
    },
    hamburgerButton: {
        position: 'absolute' as any,
        top: 16,
        left: 16,
        zIndex: 1000,
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    hamburgerIcon: {
        fontSize: 24,
        fontWeight: 'bold',
    },
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    appTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    closeSidebarButton: {
        padding: 8,
        borderRadius: 4,
    },
    closeSidebarIcon: {
        fontSize: 18,
        fontWeight: 'bold',
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
    sidebarQuickView: {
        marginTop: 'auto',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    quickViewLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 12,
    },
    quickViewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    quickViewKey: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    quickViewValue: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    sidebarFooter: {
        marginTop: 'auto',
        padding: 16,
        gap: 8,
    },
    appStoreBanner: {
        marginBottom: 12,
        backgroundColor: mode === 'dark' ? '#000000' : '#000000',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: mode === 'dark' ? '#333333' : '#000000',
        overflow: 'hidden',
    },
    appStoreBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    appStoreIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    appStoreIconImage: {
        width: 40,
        height: 40,
    },
    appStoreBannerText: {
        flex: 1,
    },
    appStoreBadgeSmall: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '400',
        letterSpacing: 0.5,
        marginBottom: -2,
    },
    appStoreBadgeLarge: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    appStoreBannerSubtitle: {
        fontSize: 10,
        color: '#A0A0A0',
        lineHeight: 14,
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
    mainContent: {
        flex: 1,
    },
    contentContainer: {
        padding: 32,
        maxWidth: 1000,
        width: '100%',
        alignSelf: 'center',
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    pageSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    paymentDetailsContainer: {
        marginBottom: theme.spacing.xl,
    },
    separator: {
        alignItems: "center",
        paddingVertical: theme.spacing.sm,
    },
    separatorText: {
        fontSize: theme.fontSize.xl,
        color: colors.textTertiary,
        fontWeight: theme.fontWeight.bold,
    },
    expandButton: {
        backgroundColor: colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        marginTop: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    expandButtonText: {
        color: colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    emptyText: {
        fontSize: theme.fontSize.base,
        color: colors.textSecondary,
        textAlign: "center",
        marginTop: theme.spacing.xxxl,
    },
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
    progressBar: {
        height: 6,
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderRadius: 3,
        marginVertical: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
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
    insightText: {
        fontSize: 11,
        lineHeight: 16,
        color: colors.textSecondary,
    },
});

export default function LoanScheduleScreenWeb() {
    return (
        <ThemeProvider>
            <LoanScheduleScreenWebContent />
        </ThemeProvider>
    );
}
