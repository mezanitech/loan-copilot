// WEB-SPECIFIC VERSION - Payments Page
import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image as RNImage } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalSearchParams, router, useFocusEffect, Link } from 'expo-router';
import { theme } from '../../../constants/theme';
import EarlyPaymentList, { EarlyPayment, EarlyPaymentListRef } from "../../../components/EarlyPaymentList.web";
import RateAdjustmentList, { RateAdjustment, RateAdjustmentListRef } from "../../../components/RateAdjustmentList.web";
import { AutoSaveIndicator, AutoSaveHandle } from "../../../components/AutoSaveIndicator";
import { calculatePayment, generatePaymentSchedule } from "../../../utils/loanCalculations";
import { incrementProgress, updateProgress } from "../../../utils/achievementUtils";
import { useKeyboardShortcuts } from "../../../hooks/useKeyboardShortcuts.web";
import { ThemeProvider, useTheme } from "../../../contexts/ThemeContext.web";
import MobileAppPromotion from "../../../components/MobileAppPromotion.web";

function PaymentsScreenWebContent() {
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    const earlyPaymentListRef = useRef<EarlyPaymentListRef>(null);
    const rateAdjustmentListRef = useRef<RateAdjustmentListRef>(null);
    const autoSaveRef = useRef<AutoSaveHandle>(null);
    const earlyPaymentsRef = useRef<EarlyPayment[]>([]);
    const rateAdjustmentsRef = useRef<RateAdjustment[]>([]);
    
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]);
    const [rateAdjustments, setRateAdjustments] = useState<RateAdjustment[]>([]);
    const [startDate, setStartDate] = useState(new Date());
    const [loanAmount, setLoanAmount] = useState("");
    const [loanTermInMonths, setLoanTermInMonths] = useState(0);
    const [loanName, setLoanName] = useState("");
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

    // Load loan data when component mounts
    useEffect(() => {
        if (loanId) {
            loadLoan(loanId);
        }
        
        // Cleanup function to reset state when loanId changes
        return () => {
            // Clear state when switching to different loan
            setEarlyPayments([]);
            setRateAdjustments([]);
            earlyPaymentsRef.current = [];
            rateAdjustmentsRef.current = [];
        };
    }, [loanId]);

    // Reload loan data when navigating to this page (e.g., after changing start date in overview)
    useFocusEffect(
        useCallback(() => {
            // Only reload loan metadata (startDate, amount, term) but NOT earlyPayments/rateAdjustments
            // to avoid overwriting user changes
            loadLoanMetadata();
            
            // Save any pending changes when navigating away (without debounce)
            return () => {
                if ((earlyPaymentsRef.current.length > 0 || rateAdjustmentsRef.current.length > 0) && autoSaveRef.current) {
                    autoSaveRef.current.forceSave();
                }
            };
        }, [loanId])
    );

    // Load only loan metadata (startDate, amount, term) without earlyPayments
    const loadLoanMetadata = async () => {
        if (!loanId) return;
        
        try {
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                if (!Array.isArray(loans)) {
                    console.error('Invalid loans data');
                    return;
                }
                const loan = loans.find((l: any) => l?.id === loanId);
                if (loan) {
                    setLoanName(loan.name || "");
                    if (loan.startDate && typeof loan.startDate === 'string') {
                        try {
                            // Parse date in local time to avoid timezone shifts
                            const parts = loan.startDate.split('-');
                            if (parts.length === 3) {
                                const [year, month, day] = parts.map(Number);
                                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                                    setStartDate(new Date(year, month - 1, day));
                                }
                            }
                        } catch (dateError) {
                            console.error('Error parsing date:', dateError);
                        }
                    }
                    if (loan.amount != null) {
                        setLoanAmount(loan.amount.toString());
                    }
                    // Calculate term in months
                    const termValue = parseFloat(loan.term);
                    if (!isNaN(termValue)) {
                        const termInMonths = loan.termUnit === 'years' ? termValue * 12 : termValue;
                        setLoanTermInMonths(termInMonths);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading loan metadata:', error);
        }
    };

    // Load loan details from AsyncStorage
    const loadLoan = async (id: string) => {
        try {
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                if (!Array.isArray(loans)) {
                    console.error('Invalid loans data');
                    return;
                }
                const loan = loans.find((l: any) => l?.id === id);
                if (loan) {
                    setLoanName(loan.name || "");
                    const loadedEarlyPayments = loan.earlyPayments || [];
                    const loadedRateAdjustments = loan.rateAdjustments || [];
                    
                    setEarlyPayments(loadedEarlyPayments);
                    setRateAdjustments(loadedRateAdjustments);
                    
                    // IMPORTANT: Update refs to match loaded state
                    earlyPaymentsRef.current = loadedEarlyPayments;
                    rateAdjustmentsRef.current = loadedRateAdjustments;
                    
                    if (loan.startDate) {
                        // Parse date in local time to avoid timezone shifts
                        const [year, month, day] = loan.startDate.split('-').map(Number);
                        setStartDate(new Date(year, month - 1, day));
                    }
                    setLoanAmount(loan.amount.toString());
                    // Calculate term in months
                    const termValue = parseFloat(loan.term);
                    const termInMonths = loan.termUnit === 'years' ? termValue * 12 : termValue;
                    setLoanTermInMonths(termInMonths);
                }
            }
        } catch (error) {
            console.error('Error loading loan:', error);
        }
    };

    // Save early payments and rate adjustments to AsyncStorage
    const saveAdjustments = async () => {
        try {
            const loansData = await AsyncStorage.getItem('loans');
            const loans = loansData ? JSON.parse(loansData) : [];
            const loanIndex = loans.findIndex((l: any) => l.id === loanId);
            
            if (loanIndex !== -1) {
                // Preserve the existing loan data and only update adjustments
                const existingLoan = loans[loanIndex];
                
                // Recalculate schedule-dependent values
                const principal = existingLoan.amount;
                const annualRate = existingLoan.interestRate;
                const termInMonths = existingLoan.termUnit === 'years' ? existingLoan.term * 12 : existingLoan.term;
                
                // Convert rate adjustments to calculation format
                const rateAdjustmentsForCalc = rateAdjustmentsRef.current.map(adj => ({
                    month: parseInt(adj.month),
                    newRate: parseFloat(adj.newRate)
                }));
                
                // Generate payment schedule with adjustments
                // Parse date in local time to avoid timezone shifts
                const [year, month, day] = existingLoan.startDate.split('-').map(Number);
                const loanStartDate = new Date(year, month - 1, day);
                const schedule = generatePaymentSchedule({
                    principal,
                    annualRate,
                    termInMonths,
                    startDate: loanStartDate,
                    earlyPayments: earlyPaymentsRef.current,
                    rateAdjustments: rateAdjustmentsForCalc
                });
                
                // Calculate current monthly payment from schedule
                const monthsElapsed = Math.max(0, Math.floor((Date.now() - loanStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
                const { monthlyPayment } = calculatePayment({ principal, annualRate, termInMonths });
                const currentMonthlyPayment = schedule.length === 0 || monthsElapsed >= schedule.length
                    ? monthlyPayment
                    : schedule[monthsElapsed]?.payment || monthlyPayment;
                
                // Calculate remaining balance from schedule
                const remainingBalance = schedule.length === 0 || monthsElapsed === 0
                    ? principal
                    : monthsElapsed >= schedule.length
                        ? 0
                        : Math.max(0, schedule[monthsElapsed]?.balance || 0);
                
                // Calculate freedom date
                const freedomDate = schedule.length > 0 ? (() => {
                    const finalDate = new Date(loanStartDate);
                    finalDate.setMonth(finalDate.getMonth() + schedule.length - 1);
                    return finalDate.toISOString();
                })() : null;
                
                // Create a new loan object to avoid mutation issues
                loans[loanIndex] = {
                    ...existingLoan,
                    earlyPayments: JSON.parse(JSON.stringify(earlyPaymentsRef.current)), // Deep clone
                    rateAdjustments: JSON.parse(JSON.stringify(rateAdjustmentsRef.current)), // Deep clone
                    currentMonthlyPayment,
                    remainingBalance,
                    freedomDate,
                };
                
                await AsyncStorage.setItem('loans', JSON.stringify(loans));
                
                // Track achievements - always update counts
                // Count total early payments across all loans (after saving)
                const totalEarlyPayments = loans.reduce((sum: number, loan: any) => 
                    sum + (loan.earlyPayments?.length || 0), 0
                );
                await updateProgress('total_early_payments', totalEarlyPayments);
                
                // Check for recurring payments in current loan
                if (earlyPaymentsRef.current.length > 0) {
                    const hasRecurring = earlyPaymentsRef.current.some(ep => ep.type === 'recurring');
                    if (hasRecurring) {
                        await updateProgress('recurring_payments_added', 1);
                    }
                }
                
                // Count total rate adjustments across all loans (after saving)
                const totalRateAdjustments = loans.reduce((sum: number, loan: any) => 
                    sum + (loan.rateAdjustments?.length || 0), 0
                );
                if (totalRateAdjustments > 0) {
                    await updateProgress('rate_adjustments_added', totalRateAdjustments);
                }
                
                // Calculate total interest saved and time saved for savings achievements
                // Only count savings from EARLY PAYMENTS, not from rate changes
                if (schedule.length > 0 && earlyPaymentsRef.current.length > 0) {
                    // Generate schedule WITH rate adjustments but WITHOUT early payments
                    const scheduleWithOnlyRates = generatePaymentSchedule({
                        principal,
                        annualRate,
                        termInMonths,
                        startDate: loanStartDate,
                        rateAdjustments: rateAdjustmentsForCalc
                    });
                    
                    // Compare to schedule with BOTH rate adjustments AND early payments
                    const interestWithOnlyRates = scheduleWithOnlyRates.reduce((sum, payment) => sum + payment.interest, 0);
                    const interestWithBoth = schedule.reduce((sum, payment) => sum + payment.interest, 0);
                    const interestSaved = Math.max(0, interestWithOnlyRates - interestWithBoth);
                    const monthsSaved = Math.max(0, scheduleWithOnlyRates.length - schedule.length);
                    
                    await updateProgress('max_interest_saved', interestSaved);
                    await updateProgress('max_months_saved', monthsSaved);
                }
            }
        } catch (error) {
            console.error('Error saving adjustments:', error);
            throw error;
        }
    };

    // Handle early payment changes
    const handleEarlyPaymentsChange = (payments: EarlyPayment[]) => {
        setEarlyPayments(payments);
        earlyPaymentsRef.current = payments; // Keep ref in sync
    };

    // Handle rate adjustment changes
    const handleRateAdjustmentsChange = (adjustments: RateAdjustment[]) => {
        setRateAdjustments(adjustments);
        rateAdjustmentsRef.current = adjustments; // Keep ref in sync
    };

    // Trigger save when modal closes
    const handleModalClose = () => {
        autoSaveRef.current?.forceSave();
    };

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
                        <TouchableOpacity style={[styles.sidebarButton, styles.sidebarButtonActive]}>
                            <Text style={styles.sidebarButtonIcon}></Text>
                            <Text style={[styles.sidebarButtonText, styles.sidebarButtonTextActive]}>Adjustments</Text>
                        </TouchableOpacity>
                        <Link href={`/(tabs)/${loanId}/schedule`} asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}></Text>
                                <Text style={styles.sidebarButtonText}>Payment Schedule</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    {windowWidth >= 1024 && (
                        <View style={styles.sidebarQuickView}>
                            <Text style={styles.quickViewLabel}>ADJUSTMENTS</Text>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Early Payments</Text>
                                <Text style={styles.quickViewValue}>{earlyPayments.length}</Text>
                            </View>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Rate Changes</Text>
                                <Text style={styles.quickViewValue}>{rateAdjustments.length}</Text>
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
                <AutoSaveIndicator ref={autoSaveRef} onSave={saveAdjustments} />

                <View style={styles.pageHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageTitle}>{loanName ? `${loanName} - Adjustments` : 'Loan Adjustments'}</Text>
                        <Text style={styles.pageSubtitle}>
                            Adjust your loan with extra payments or interest rate changes to see their impact on your payoff timeline and total interest.
                        </Text>
                    </View>
                </View>

                {/* Early Payments Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Early Payments</Text>
                    <View style={styles.noteBox}>
                        <Text style={styles.noteIcon}>ℹ️</Text>
                        <Text style={styles.noteText}>
                            Early payments reduce your loan term (pay off faster) while keeping your monthly payment the same.
                        </Text>
                    </View>
                    
                    <EarlyPaymentList
                        ref={earlyPaymentListRef}
                        payments={earlyPayments}
                        onPaymentsChange={handleEarlyPaymentsChange}
                        onModalClose={handleModalClose}
                        loanStartDate={startDate}
                        loanTermInMonths={loanTermInMonths}
                    />
                </View>

                {/* Rate Adjustments Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Interest Rate Changes</Text>
                    <View style={styles.noteBox}>
                        <Text style={styles.noteIcon}>ℹ️</Text>
                        <Text style={styles.noteText}>
                            Rate changes adjust your monthly payment while keeping the same payoff timeline.
                        </Text>
                    </View>
                    
                    <RateAdjustmentList
                        ref={rateAdjustmentListRef}
                        adjustments={rateAdjustments}
                        onAdjustmentsChange={handleRateAdjustmentsChange}
                        onModalClose={handleModalClose}
                        loanStartDate={startDate}
                        loanTermInMonths={loanTermInMonths}
                    />
                </View>

                {/* Info box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <Text style={styles.infoText}>
                        Extra payments go directly toward your principal balance, reducing the total interest you'll pay over the life of the loan.
                    </Text>
                </View>
            </ScrollView>

            {/* Right Insights Panel */}
            {windowWidth >= 1200 && showInsights && (
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
                        <Text style={[styles.insightsPanelTitle, { color: colors.textPrimary }]}>💡 Tips</Text>
                    
                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#f0f9ff', borderColor: colors.primary }]}>
                            <Text style={styles.insightBadge}>💰 EARLY PAYMENTS</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                Making extra payments reduces your principal balance faster, which means you'll pay less interest over the life of the loan and become debt-free sooner.
                            </Text>
                        </View>

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#fef5e7', borderColor: '#e67e22' }]}>
                            <Text style={[styles.insightBadge, { backgroundColor: '#fef5e7', color: '#e67e22' }]}>📈 RATE CHANGES</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                If you have a variable-rate loan or are refinancing, you can add rate adjustments to see how they affect your monthly payment and total cost.
                            </Text>
                        </View>

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#f0fdf4', borderColor: '#22c55e' }]}>
                            <Text style={[styles.insightBadge, { backgroundColor: '#f0fdf4', color: '#22c55e' }]}>⚡ RECURRING PAYMENTS</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                Set up recurring extra payments to automatically pay down your loan faster. Even small amounts add up over time!
                            </Text>
                        </View>

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightBadge, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8f4fd', color: colors.primary }]}>💡 PRO TIP</Text>
                            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                Try making bi-weekly half-payments instead of monthly full payments. This may result in one extra payment per year and can save you thousands in interest! It may not reflect here in this app but check with your lender.
                            </Text>
                        </View>

                        {earlyPayments.length > 0 && (
                            <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                                <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Your Progress</Text>
                                <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                                    {earlyPayments.length} {earlyPayments.length === 1 ? 'adjustment' : 'adjustments'}
                                </Text>
                                <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                    You're taking control of your debt!
                                </Text>
                            </View>
                        )}

                        {/* Mobile App Promotional Banner */}
                        <MobileAppPromotion 
                            insightCardStyle={styles.insightCard}
                            insightBadgeStyle={styles.insightBadge}
                            insightTextStyle={styles.insightText}
                        />
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
        lineHeight: 22,
    },
    section: {
        marginBottom: theme.spacing.xxl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    noteBox: {
        backgroundColor: mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : theme.colors.info + '15',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : theme.colors.info + '30',
        marginBottom: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    noteIcon: {
        fontSize: theme.fontSize.base,
        marginRight: theme.spacing.sm,
    },
    noteText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    infoBox: {
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : theme.colors.surfaceGlass,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        fontSize: theme.fontSize.xl,
        marginRight: theme.spacing.md,
    },
    infoText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 20,
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

export default function PaymentsScreenWeb() {
    return (
        <ThemeProvider>
            <PaymentsScreenWebContent />
        </ThemeProvider>
    );
}
