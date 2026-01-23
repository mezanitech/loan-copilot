// WEB-SPECIFIC VERSION - Create Loan Page
import { useState, useRef, useCallback, useEffect } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, Link } from 'expo-router';
import { theme } from '../../constants/theme';
import InputField from "../../components/InputField";
import TermSelector from "../../components/TermSelector";
import PaymentSummary from "../../components/PaymentSummary";
import LineChart from "../../components/LineChart";
import DualLineChart from "../../components/DualLineChart";
import { AutoSaveIndicator, AutoSaveHandle } from "../../components/AutoSaveIndicator";
import { calculatePayment, generatePaymentSchedule, convertTermToMonths } from "../../utils/loanCalculations";
import { scheduleNextPaymentReminder } from "../../utils/notificationUtils";
import { getNotificationPreferences } from "../../utils/storage";
import { formatCurrency } from "../../utils/currencyUtils";
import { incrementProgress } from "../../utils/achievementUtils";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { ThemeProvider, useTheme } from "../../contexts/ThemeContext";

function CreateLoanScreenWebContent() {
    const [loanName, setLoanName] = useState("");
    const [loanAmount, setLoanAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("years");
    const [date, setDate] = useState(new Date());
    const dateRef = useRef(new Date());
    const [showViewDetailsButton, setShowViewDetailsButton] = useState(false);
    const createdLoanId = useRef<string | null>(null);
    const autoSaveRef = useRef<AutoSaveHandle>(null);
    const hasNavigatedAway = useRef(false);
    const [activeStep, setActiveStep] = useState(1);
    const [showInsights, setShowInsights] = useState(true);
    const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { mode, toggleTheme, colors } = useTheme();
    
    // Enable keyboard shortcuts
    useKeyboardShortcuts();

    // Fade in animation on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    // Handle window resize for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            const width = Dimensions.get('window').width;
            setWindowWidth(width);
            // Auto-hide insights on smaller screens
            if (width < 1200) {
                setShowInsights(false);
            }
        };

        const subscription = Dimensions.addEventListener('change', handleResize);
        handleResize(); // Initial check

        return () => subscription?.remove();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (hasNavigatedAway.current && createdLoanId.current) {
                setLoanName('');
                setLoanAmount('');
                setInterestRate('');
                setTerm('');
                setTermUnit('years');
                const newDate = new Date();
                setDate(newDate);
                dateRef.current = newDate;
                setShowViewDetailsButton(false);
                createdLoanId.current = null;
                hasNavigatedAway.current = false;
                setActiveStep(1);
            }
            
            return () => {
                if (createdLoanId.current) {
                    hasNavigatedAway.current = true;
                }
            };
        }, [])
    );

    // Handle date change from HTML date input
    const handleDateChange = (dateString: string) => {
        if (dateString) {
            const newDate = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone issues
            if (!isNaN(newDate.getTime())) {
                setDate(newDate);
                dateRef.current = newDate;
                setTimeout(() => triggerAutoSave(), 100);
            }
        }
    };

    const isValidLoanData = () => {
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);
        
        return loanName.trim() !== '' && 
               loanAmount.trim() !== '' && 
               !isNaN(principal) && 
               principal > 0 &&
               interestRate.trim() !== '' && 
               !isNaN(annualRate) && 
               annualRate >= 0 &&
               term.trim() !== '' && 
               !isNaN(termValue) && 
               termValue > 0;
    };

    const isValidName = () => loanName.trim() !== '';
    const isValidAmount = () => {
        const amount = parseFloat(loanAmount);
        return loanAmount.trim() !== '' && !isNaN(amount) && amount > 0;
    };
    const isValidRate = () => {
        const rate = parseFloat(interestRate);
        return interestRate.trim() !== '' && !isNaN(rate) && rate >= 0;
    };
    const isValidTerm = () => {
        const termValue = parseFloat(term);
        return term.trim() !== '' && !isNaN(termValue) && termValue > 0;
    };

    const triggerAutoSave = () => {
        if (isValidLoanData() && autoSaveRef.current) {
            autoSaveRef.current.trigger();
        }
    };

    // Format date for HTML input (YYYY-MM-DD)
    const getDateInputValue = (): string => {
        const currentDate = dateRef.current;
        if (!currentDate || isNaN(currentDate.getTime())) {
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleLoanNameChange = (value: string) => {
        setLoanName(value);
        triggerAutoSave();
    };

    const handleLoanAmountChange = (value: string) => {
        setLoanAmount(value);
        triggerAutoSave();
    };

    const handleInterestRateChange = (value: string) => {
        setInterestRate(value);
        triggerAutoSave();
    };

    const handleTermChange = (value: string) => {
        setTerm(value);
        triggerAutoSave();
    };

    const getStartDate = (): string => {
        const currentDate = dateRef.current;
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    const termValue = parseFloat(term);
    const termInMonths = convertTermToMonths(termValue, termUnit);
    
    const { monthlyPayment, totalPayment } = calculatePayment({ 
        principal, 
        annualRate, 
        termInMonths 
    });
    
    const paymentSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: date 
    });

    const saveLoan = async () => {
        if (!isValidLoanData()) {
            return;
        }

        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);
        const termInMonths = convertTermToMonths(termValue, termUnit);

        const { monthlyPayment, totalPayment } = calculatePayment({ 
            principal, 
            annualRate, 
            termInMonths 
        });
        
        const paymentSchedule = generatePaymentSchedule({ 
            principal, 
            annualRate, 
            termInMonths, 
            startDate: dateRef.current 
        });

        try {
            const existingLoans = await AsyncStorage.getItem('loans');
            const loans = existingLoans ? JSON.parse(existingLoans) : [];
            
            const loanId = createdLoanId.current || Date.now().toString();
            const existingLoanIndex = loans.findIndex((l: any) => l.id === loanId);
            
            const currentMonthlyPayment = monthlyPayment;
            const remainingBalance = principal;
            
            const freedomDate = (() => {
                const finalDate = new Date(dateRef.current);
                finalDate.setMonth(finalDate.getMonth() + termInMonths - 1);
                return finalDate.toISOString();
            })();
            
            const loanData = {
                id: loanId,
                name: loanName,
                amount: principal,
                interestRate: annualRate,
                term: termValue,
                termUnit,
                startDate: getStartDate(),
                monthlyPayment,
                totalPayment,
                earlyPayments: existingLoanIndex !== -1 ? loans[existingLoanIndex].earlyPayments || [] : [],
                rateAdjustments: existingLoanIndex !== -1 ? loans[existingLoanIndex].rateAdjustments || [] : [],
                createdAt: existingLoanIndex !== -1 ? loans[existingLoanIndex].createdAt : new Date().toISOString(),
                currentMonthlyPayment,
                remainingBalance,
                freedomDate,
            };
            
            const notificationPrefs = await getNotificationPreferences();
            let scheduledNotificationIds: string[] = [];
            
            if (notificationPrefs.enabled) {
                scheduledNotificationIds = await scheduleNextPaymentReminder(
                    loanId,
                    loanName,
                    paymentSchedule,
                    getStartDate(),
                    notificationPrefs.reminderDays
                );
            }
            
            const loanWithNotifications = {
                ...loanData,
                scheduledNotificationIds
            };
            
            if (existingLoanIndex !== -1) {
                loans[existingLoanIndex] = loanWithNotifications;
            } else {
                loans.push(loanWithNotifications);
                createdLoanId.current = loanId;
                setShowViewDetailsButton(true);
                await incrementProgress('loans_created');
            }
            
            await AsyncStorage.setItem('loans', JSON.stringify(loans));
        } catch (error) {
            console.error('Error saving loan:', error);
            throw error;
        }
    };

    return (
        <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
            {/* Left Sidebar - Hide on mobile */}
            {windowWidth >= 768 && (
                <View style={[styles.sidebar, { backgroundColor: colors.sidebar }]}>
                    <View style={styles.sidebarHeader}>
                        <Text style={[styles.appTitle, { color: colors.sidebarTextActive }]}>💰 Loan Co-Pilot</Text>
                        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                            <Text style={styles.themeToggleIcon}>{mode === 'light' ? '🌙' : '☀️'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sidebarSection}>
                        <Text style={styles.sidebarLabel}>NAVIGATION</Text>
                        <Link href="/(tabs)" asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}>📊</Text>
                                <Text style={styles.sidebarButtonText}>Dashboard</Text>
                            </TouchableOpacity>
                        </Link>
                        <TouchableOpacity style={[styles.sidebarButton, styles.sidebarButtonActive]}>
                            <Text style={styles.sidebarButtonIcon}>➕</Text>
                            <Text style={[styles.sidebarButtonText, styles.sidebarButtonTextActive]}>Create Loan</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sidebarSection}>
                        <Text style={styles.sidebarLabel}>PROGRESS</Text>
                        <View style={styles.progressSteps}>
                            <View style={[styles.progressStep, activeStep >= 1 && styles.progressStepActive]}>
                                <View style={[styles.stepNumber, activeStep >= 1 && styles.stepNumberActive]}>
                                    <Text style={[styles.stepNumberText, activeStep >= 1 && styles.stepNumberTextActive]}>1</Text>
                                </View>
                                <Text style={styles.stepLabel}>Loan Details</Text>
                            </View>
                            <View style={[styles.progressStep, activeStep >= 2 && styles.progressStepActive]}>
                                <View style={[styles.stepNumber, activeStep >= 2 && styles.stepNumberActive]}>
                                    <Text style={[styles.stepNumberText, activeStep >= 2 && styles.stepNumberTextActive]}>2</Text>
                                </View>
                                <Text style={styles.stepLabel}>Review</Text>
                            </View>
                            <View style={[styles.progressStep, activeStep >= 3 && styles.progressStepActive]}>
                                <View style={[styles.stepNumber, activeStep >= 3 && styles.stepNumberActive]}>
                                    <Text style={[styles.stepNumberText, activeStep >= 3 && styles.stepNumberTextActive]}>3</Text>
                                </View>
                                <Text style={styles.stepLabel}>Saved</Text>
                            </View>
                        </View>
                    </View>

                    {isValidLoanData() && windowWidth >= 1024 && (
                        <View style={styles.sidebarQuickView}>
                            <Text style={styles.quickViewLabel}>QUICK PREVIEW</Text>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Monthly</Text>
                                <Text style={styles.quickViewValue}>{formatCurrency(monthlyPayment, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' })}</Text>
                            </View>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Total</Text>
                                <Text style={styles.quickViewValue}>{formatCurrency(totalPayment, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' }, 0)}</Text>
                            </View>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Interest</Text>
                                <Text style={[styles.quickViewValue, { color: '#e67e22' }]}>
                                    {formatCurrency(totalPayment - principal, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' }, 0)}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Main Content */}
            <ScrollView style={styles.mainContent} contentContainerStyle={styles.contentContainer}>
                <AutoSaveIndicator ref={autoSaveRef} onSave={saveLoan} />
                
                <View style={styles.pageHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageTitle}>Create New Loan</Text>
                        <Text style={styles.pageSubtitle}>
                            Enter your loan details to calculate payments and see projections
                        </Text>
                    </View>
                    {!isValidLoanData() && (
                        <View style={styles.validationBadge}>
                            <Text style={styles.validationText}>⚠️ Fill all required fields</Text>
                        </View>
                    )}
                </View>

                {/* Input Form */}
                <View style={styles.formSection}>
                    <View style={styles.formGrid}>
                        <View style={[styles.formField, styles.formFieldFull]}>
                            <InputField
                                label="Loan Name"
                                value={loanName}
                                onChangeText={handleLoanNameChange}
                                placeholder="e.g., Car Loan, Mortgage, Student Loan"
                            />
                        </View>

                        <View style={[styles.formField, windowWidth < 1100 && styles.formFieldFull]}>
                            <InputField
                                label="Loan Amount"
                                value={loanAmount}
                                onChangeText={handleLoanAmountChange}
                                placeholder="Enter loan amount"
                                keyboardType="numeric"
                                formatNumber={true}
                            />
                        </View>

                        <View style={[styles.formField, windowWidth < 1100 && styles.formFieldFull]}>
                            <InputField
                                label="Interest Rate (%)"
                                value={interestRate}
                                onChangeText={handleInterestRateChange}
                                placeholder="Enter interest rate"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={[styles.formField, windowWidth < 1100 && styles.formFieldFull]}>
                            <TermSelector
                                term={term}
                                termUnit={termUnit}
                                onTermChange={handleTermChange}
                                onTermUnitChange={(unit) => {
                                    setTermUnit(unit);
                                    triggerAutoSave();
                                }}
                            />
                        </View>

                        <View style={[styles.formField, styles.formFieldFull]}>
                            <Text style={styles.dateLabel}>Starting Date</Text>
                            <input
                                type="date"
                                style={{
                                    backgroundColor: '#f8f9fa',
                                    borderWidth: 1.5,
                                    borderStyle: 'solid',
                                    borderColor: '#dee2e6',
                                    borderRadius: 8,
                                    padding: 14,
                                    fontSize: 14,
                                    color: '#1f2937',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    width: '100%',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    minWidth: 0,
                                }}
                                value={getDateInputValue()}
                                onChange={(e) => {
                                    handleDateChange(e.target.value);
                                }}
                            />
                        </View>
                    </View>
                </View>

                {/* Payment Summary */}
                {monthlyPayment > 0 && (
                    <View style={styles.summarySection}>
                        <PaymentSummary
                            monthlyPayment={monthlyPayment}
                            totalPayment={totalPayment}
                            loanAmount={loanAmount}
                        />
                    </View>
                )}

                {/* Charts Section */}
                {paymentSchedule.length > 0 && (
                    <View style={[styles.chartsSection, windowWidth < 1024 && { flexDirection: 'column' }]}>
                        <View style={[styles.chartCard, windowWidth < 1024 && { minWidth: '100%' }]}>
                            <LineChart
                                title="Principal Balance Over Time"
                                data={paymentSchedule.map(p => ({ value: p.balance }))}
                                color={theme.colors.primary}
                                yAxisFormatter={(v) => formatCurrency(v, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' }, 0)}
                            />
                        </View>

                        <View style={[styles.chartCard, windowWidth < 1024 && { minWidth: '100%' }]}>
                            <DualLineChart
                                title="Principal & Interest Payments"
                                data={paymentSchedule}
                            />
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                {showViewDetailsButton && createdLoanId.current && (
                    <View style={[styles.actionSection, windowWidth < 768 && { flexDirection: 'column' }]}>
                        <TouchableOpacity 
                            style={[styles.viewDetailsButton, windowWidth < 768 && { flex: 0 }]}
                            onPress={async () => {
                                await saveLoan();
                                router.push(`/(tabs)/${createdLoanId.current}/overview`);
                            }}
                        >
                            <Text style={styles.viewDetailsButtonText}>✓ View Loan Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.createAnotherButton, windowWidth < 768 && { flex: 0 }]}
                            onPress={() => {
                                setLoanName('');
                                setLoanAmount('');
                                setInterestRate('');
                                setTerm('');
                                setTermUnit('years');
                                const newDate = new Date();
                                setDate(newDate);
                                dateRef.current = newDate;
                                setShowViewDetailsButton(false);
                                createdLoanId.current = null;
                                setActiveStep(1);
                            }}
                        >
                            <Text style={styles.createAnotherButtonText}>+ Create Another Loan</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Right Insights Panel - Conditionally shown */}
            {windowWidth >= 1200 && showInsights && isValidLoanData() && (
                <View style={styles.insightsPanel}>
                    <View style={styles.insightsPanelHeader}>
                        <Text style={styles.insightsPanelTitle}>💡 Insights</Text>
                        <TouchableOpacity onPress={() => setShowInsights(false)}>
                            <Text style={styles.closeInsightsButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.insightCard}>
                        <Text style={styles.insightLabel}>Monthly Payment</Text>
                        <Text style={styles.insightValue}>{formatCurrency(monthlyPayment, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' })}</Text>
                        <Text style={styles.insightSubtext}>per month</Text>
                    </View>

                    <View style={styles.insightCard}>
                        <Text style={styles.insightLabel}>Total Interest</Text>
                        <Text style={[styles.insightValue, { color: '#e67e22' }]}>
                            {formatCurrency(totalPayment - principal, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' }, 0)}
                        </Text>
                        <Text style={styles.insightSubtext}>over {term} {termUnit}</Text>
                    </View>

                    <View style={styles.insightCard}>
                        <Text style={styles.insightLabel}>Total Repayment</Text>
                        <Text style={styles.insightValue}>
                            {formatCurrency(totalPayment, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' }, 0)}
                        </Text>
                        <Text style={styles.insightSubtext}>principal + interest</Text>
                    </View>

                    <View style={styles.insightCard}>
                        <Text style={styles.insightLabel}>Interest Ratio</Text>
                        <Text style={styles.insightValue}>
                            {principal > 0 ? (((totalPayment - principal) / principal) * 100).toFixed(1) : '0'}%
                        </Text>
                        <Text style={styles.insightSubtext}>of principal amount</Text>
                    </View>

                    <View style={[styles.insightCard, { backgroundColor: '#f0f9ff', borderColor: '#3b82f6' }]}>
                        <Text style={[styles.insightBadge, { backgroundColor: '#dbeafe', color: '#1e40af' }]}>💡 TIP</Text>
                        <Text style={styles.insightText}>
                            Making extra payments can significantly reduce your total interest. Try adding extra payments in the loan details view!
                        </Text>
                    </View>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#f5f7fa',
    },
    // Sidebar
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
    progressSteps: {
        gap: 16,
    },
    progressStep: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressStepActive: {
        opacity: 1,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },
    stepNumberTextActive: {
        color: 'white',
    },
    stepLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
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
    // Main Content
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
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    pageSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    toggleInsightsButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    toggleInsightsText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    validationBadge: {
        backgroundColor: '#fef5e7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e67e22',
    },
    validationText: {
        fontSize: 12,
        color: '#e67e22',
        fontWeight: '600',
    },
    formSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    formGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    formField: {
        flex: 1,
        minWidth: 280,
    },
    formFieldFull: {
        minWidth: '100%',
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: theme.colors.textPrimary,
    },
    dateInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 1.5,
        borderColor: theme.colors.gray200,
        borderRadius: 8,
        padding: 14,
        fontSize: 14,
        color: theme.colors.textPrimary,
        outlineStyle: 'none',
    } as any,
    summarySection: {
        marginBottom: 24,
    },
    chartsSection: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 24,
        flexWrap: 'wrap',
    },
    chartCard: {
        flex: 1,
        minWidth: 350,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    actionSection: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 24,
    },
    viewDetailsButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    viewDetailsButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    createAnotherButton: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    createAnotherButtonText: {
        color: theme.colors.primary,
        fontSize: 15,
        fontWeight: '600',
    },
    // Insights Panel
    insightsPanel: {
        width: 280,
        backgroundColor: 'white',
        borderLeftWidth: 1,
        borderLeftColor: '#e5e7eb',
        padding: 20,
    },
    insightsPanelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    insightsPanelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    closeInsightsButton: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        padding: 4,
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
    insightText: {
        fontSize: 11,
        lineHeight: 16,
        color: theme.colors.textSecondary,
    },
    themeToggle: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    themeToggleIcon: {
        fontSize: 20,
    },
});

export default function CreateLoanScreenWeb() {
    return (
        <ThemeProvider>
            <CreateLoanScreenWebContent />
        </ThemeProvider>
    );
}
