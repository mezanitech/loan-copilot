// Import React hooks for state management and side effects
import { useState, useEffect, useCallback } from "react";
// Import React Native UI components
import { Text, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView, Alert, Platform, Modal } from "react-native";
// Import AsyncStorage for saving/loading loan data
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import routing utilities from expo-router
import { router, useGlobalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { theme } from '../../../constants/theme';
// Import custom reusable components
import InputField from "../../../components/InputField";
import TermSelector from "../../../components/TermSelector";
import PaymentSummary from "../../../components/PaymentSummary";
import DualLineChart from "../../../components/DualLineChart";
import { EarlyPayment, isValidEarlyPayment } from "../../../components/EarlyPaymentList";
// Import calculation utilities
import { calculatePayment, generatePaymentSchedule, calculateSavings, convertTermToMonths } from "../../../utils/loanCalculations";
// Import notification utilities
import { schedulePaymentReminders, cancelLoanNotifications } from "../../../utils/notificationUtils";
import { getNotificationPreferences } from "../../../utils/storage";
// Import PDF utilities - only on native platforms
const generateRobustLoanPDF = Platform.OS !== 'web'
  ? require("../../../utils/pdfLibReportUtils").generateRobustLoanPDF
  : null;
import { formatPeriod } from "../../../utils/reportUtils";

export default function LoanOverviewScreen() {
    // Get the loan ID from URL parameters (using useGlobalSearchParams for dynamic routes in tabs)
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    
    // Loan form input states
    const [loanName, setLoanName] = useState("");
    const [loanAmount, setLoanAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("months"); // Can be months or years
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]); // List of additional payments

    // Handle date selection from date picker
    const onDateChange = (event: any, selectedDate?: Date) => {
        // On Android, always close the picker when user interacts
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        
        // Update date if a valid date was selected
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    // Format date as YYYY-MM-DD for storage
    const getStartDate = (): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Format date for display (MM/DD/YYYY)
    const formatDateDisplay = (): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

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
        }, [loanId])
    );

    // Load loan details from AsyncStorage and populate form fields
    const loadLoan = async (id: string) => {
        try {
            // Retrieve all loans from storage
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                // Find the specific loan by ID
                const loan = loans.find((l: any) => l.id === id);
                if (loan) {
                    // Populate form fields with loan data
                    setLoanName(loan.name || "");
                    setLoanAmount(loan.amount.toString());
                    setInterestRate(loan.interestRate.toString());
                    setTerm(loan.term.toString());
                    setTermUnit(loan.termUnit);
                    if (loan.startDate) {
                        setDate(new Date(loan.startDate));
                    }
                    setEarlyPayments(loan.earlyPayments || []);
                }
            }
        } catch (error) {
            console.error('Error loading loan:', error);
        }
    };

    // Calculate remaining principal using the standard amortization formula
    const calculateRemainingPrincipal = (): number => {
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);
        
        if (isNaN(principal) || isNaN(annualRate) || isNaN(termValue)) {
            return principal || 0;
        }

        const termInMonths = convertTermToMonths(termValue, termUnit);
        const monthlyRate = annualRate / 100 / 12;
        
        // Handle zero interest rate edge case
        if (monthlyRate === 0) {
            const monthsElapsed = Math.max(0, Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
            return Math.max(0, principal - (principal / termInMonths) * monthsElapsed);
        }

        // Calculate how many months have passed since the loan start date
        const monthsElapsed = Math.max(0, Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
        
        // If loan term has elapsed, remaining balance is 0
        if (monthsElapsed >= termInMonths) {
            return 0;
        }

        // Standard amortization formula for remaining balance
        // Remaining = P * [(1 + r)^n - (1 + r)^p] / [(1 + r)^n - 1]
        // where P = principal, r = monthly rate, n = total periods, p = periods elapsed
        const futureValue = Math.pow(1 + monthlyRate, termInMonths);
        const paymentsMade = Math.pow(1 + monthlyRate, monthsElapsed);
        
        const remaining = principal * (futureValue - paymentsMade) / (futureValue - 1);
        return Math.max(0, remaining);
    };

    // Calculate monthly payment using standard loan amortization formula
    // Save updated loan data to AsyncStorage and navigate back to dashboard
    const updateLoan = async () => {
        // Validate all required fields are filled
        if (!loanName || !loanAmount || !interestRate || !term) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        // Calculate payment amounts using centralized utility
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);
        const termInMonths = convertTermToMonths(termValue, termUnit);
        
        const { monthlyPayment } = calculatePayment({ principal, annualRate, termInMonths });
        const schedule = generatePaymentSchedule({ 
            principal, 
            annualRate, 
            termInMonths, 
            startDate: date, 
            earlyPayments 
        });
        // Calculate actual total based on payment schedule (includes early payments)
        const actualTotal = schedule.length > 0 
            ? schedule.reduce((sum, payment) => sum + payment.payment, 0)
            : monthlyPayment * (termUnit === "years" ? parseFloat(term) * 12 : parseFloat(term));

        // Create updated loan object with all details
        const updatedLoan = {
            id: loanId,
            name: loanName,
            amount: parseFloat(loanAmount),
            interestRate: parseFloat(interestRate),
            term: parseFloat(term),
            termUnit,
            startDate: getStartDate(),
            monthlyPayment,
            totalPayment: actualTotal,
            earlyPayments,
            createdAt: new Date().toISOString(),
        };

        try {
            // Get existing loans from storage
            const loansData = await AsyncStorage.getItem('loans');
            const loans = loansData ? JSON.parse(loansData) : [];
            // Find the index of the loan to update
            const loanIndex = loans.findIndex((l: any) => l.id === loanId);
            
            if (loanIndex !== -1) {
                // Cancel existing notifications
                const existingLoan = loans[loanIndex];
                if (existingLoan.scheduledNotificationIds && existingLoan.scheduledNotificationIds.length > 0) {
                    await cancelLoanNotifications(existingLoan.scheduledNotificationIds);
                }
                
                // Schedule new notifications if enabled
                const notificationPrefs = await getNotificationPreferences();
                let scheduledNotificationIds: string[] = [];
                
                if (notificationPrefs.enabled) {
                    scheduledNotificationIds = await schedulePaymentReminders(
                        loanId,
                        loanName,
                        monthlyPayment,
                        getStartDate(),
                        termInMonths,
                        notificationPrefs.reminderDays
                    );
                }
                
                // Add notification IDs to updated loan
                const loanWithNotifications = {
                    ...updatedLoan,
                    scheduledNotificationIds
                };
                
                // Replace old loan with updated loan
                loans[loanIndex] = loanWithNotifications;
                // Save back to storage
                await AsyncStorage.setItem('loans', JSON.stringify(loans));
                Alert.alert("Success", "Loan updated successfully");
                // Navigate back to dashboard
                router.push('/(tabs)');
            }
        } catch (error) {
            Alert.alert("Error", "Failed to update loan");
            console.error(error);
        }
    };

    // Robust PDF generation function using pdf-lib
    const generateTestPDF = async () => {
        // PDF generation not available on web
        if (Platform.OS === 'web' || !generateRobustLoanPDF) {
            Alert.alert("Not Available", "PDF generation is only available on mobile devices.");
            return;
        }
        
        setTimeout(async () => {
            try {
                // Filter out invalid early payments before generating PDF
                const validEarlyPayments = earlyPayments.filter(isValidEarlyPayment);
                
                // Prepare loan data for pdf-lib
                const loanData = {
                    loanId: loanId || 'unknown',
                    name: loanName || 'Loan',
                    amount: parseFloat(loanAmount || '0'),
                    interestRate: parseFloat(interestRate || '0'),
                    termInMonths,
                    monthlyPayment,
                    totalPayment: actualTotalPayment,
                    interestSaved,
                    periodDecrease,
                    earlyPayments: validEarlyPayments.map(ep => ({
                        name: ep.name,
                        type: ep.type,
                        amount: parseFloat(ep.amount),
                        month: ep.month,
                        frequency: ep.frequency
                    })),
                    payments: paymentSchedule.map((payment, index) => {
                        const paymentDate = new Date(date);
                        paymentDate.setMonth(paymentDate.getMonth() + index);
                        return {
                            number: index + 1,
                            principal: payment.principal,
                            interest: payment.interest,
                            balance: payment.balance,
                            date: paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        };
                    })
                };
                
                // Generate PDF using robust pdf-lib
                const pdfBytes = await generateRobustLoanPDF(loanData, date);
                
                // Save to device
                const filename = `${loanData.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`;
                const uri = FileSystem.documentDirectory + filename;
                
                // Convert Uint8Array to base64 string
                const base64String = btoa(String.fromCharCode(...pdfBytes));
                
                await FileSystem.writeAsStringAsync(uri, base64String, {
                    encoding: 'base64',
                });
                
                // Share - completely isolated with try-catch
                try {
                    await Sharing.shareAsync(uri, { 
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Loan Report'
                    });
                } catch {
                    // Silently ignore all share errors including dismissals
                }
            } catch (error) {
                // Only show alert for actual PDF generation errors
                if (error instanceof Error && !error.message.includes('cancel')) {
                    Alert.alert("Error", "Failed to generate PDF");
                }
            }
        }, 0);
    };

    // Calculate payment amounts and schedules using centralized utilities
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    const termValue = parseFloat(term);
    const termInMonths = convertTermToMonths(termValue, termUnit);
    
    const { monthlyPayment, totalPayment } = calculatePayment({ principal, annualRate, termInMonths });
    
    // Generate payment schedules (with and without early payments)
    const paymentSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: date, 
        earlyPayments 
    });
    const originalSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: date 
    });
    
    // Calculate savings using centralized utility
    const { actualTotalPayment, totalInterest, interestSaved, periodDecrease } = calculateSavings({
        principal,
        annualRate,
        termInMonths,
        startDate: date,
        earlyPayments
    });

    // Extract principal balance data for both original and early payment schedules
    const originalBalanceData = originalSchedule.map(p => p.balance);
    const earlyPaymentBalanceData = paymentSchedule.map(p => p.balance);
    
    // Create dual balance data for the balance chart
    // Pad the shorter array with the last value to match lengths
    const maxLength = Math.max(originalBalanceData.length, earlyPaymentBalanceData.length);
    const balanceComparisonData = Array.from({ length: maxLength }, (_, i) => ({
        principal: originalBalanceData[i] ?? originalBalanceData[originalBalanceData.length - 1] ?? 0,
        interest: earlyPaymentBalanceData[i] ?? earlyPaymentBalanceData[earlyPaymentBalanceData.length - 1] ?? 0
    }));
    
    // Extract principal and interest data for dual chart (with early payment impact)
    const principalInterestData = paymentSchedule.map(p => ({
        principal: p.principal,
        interest: p.interest
    }));

    // Dismiss keyboard when tapping outside
    return <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.container}>
            {/* Action buttons at top */}
            <View style={styles.topButtonContainer}>
                <TouchableOpacity style={styles.exportButtonTop} onPress={generateTestPDF}>
                    <Text style={styles.exportButtonTopText}>Export Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={updateLoan}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>

            {/* Loan name input */}
            <InputField
                label="💼 Loan Name"
                value={loanName}
                onChangeText={setLoanName}
                placeholder="e.g., Car Loan, Mortgage, Student Loan"
            />

            {/* Loan amount input */}
            <InputField
                label="💵 Loan Amount"
                value={loanAmount}
                onChangeText={setLoanAmount}
                placeholder="Enter loan amount"
                keyboardType="numeric"
                formatNumber={true}
            />

            {/* Interest rate input */}
            <InputField
                label="📈 Interest Rate (%)"
                value={interestRate}
                onChangeText={setInterestRate}
                placeholder="Enter interest rate"
                keyboardType="numeric"
            />

            {/* Term input with months/years toggle */}
            <TermSelector
                term={term}
                onTermChange={setTerm}
                termUnit={termUnit}
                onTermUnitChange={setTermUnit}
            />

            {/* Start date picker */}
            <View>
                <Text style={styles.dateLabel}>📅 Starting Date</Text>
                <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.dateButtonText}>{formatDateDisplay()}</Text>
                </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
                <Modal
                    visible={showDatePicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowDatePicker(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowDatePicker(false)}
                    >
                        <View style={styles.datePickerContainer}>
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="spinner"
                                onChange={onDateChange}
                                textColor={theme.colors.textPrimary}
                                themeVariant="light"
                            />
                            <TouchableOpacity 
                                style={styles.closeButton}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.closeButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Show payment summary if calculation is complete */}
            {monthlyPayment > 0 && (
                <PaymentSummary
                    monthlyPayment={monthlyPayment}
                    totalPayment={actualTotalPayment}
                    loanAmount={loanAmount}
                    remainingBalance={calculateRemainingPrincipal()}
                />
            )}

            {/* Show charts and savings if schedule is generated */}
            {paymentSchedule.length > 0 && (
                <>
                    {/* Savings section - always show */}
                    <View style={styles.savingsContainer}>
                        <Text style={styles.sectionTitle}>
                            {earlyPayments.length > 0 ? '🎉 Your Savings!' : '💡 Potential Savings'}
                        </Text>
                        
                        {earlyPayments.length > 0 ? (
                            <>
                                <View style={styles.savingsRow}>
                                    <Text style={styles.savingsLabel}>💰 Money Saved:</Text>
                                    <Text style={styles.savingsValue}>${interestSaved.toFixed(2)}</Text>
                                </View>
                                <View style={styles.savingsRow}>
                                    <Text style={styles.savingsLabel}>⚡ Time Saved:</Text>
                                    <Text style={styles.savingsValue}>
                                        {periodDecrease >= 12 
                                            ? `${Math.floor(periodDecrease / 12)} year${Math.floor(periodDecrease / 12) !== 1 ? 's' : ''}${periodDecrease % 12 > 0 ? ` ${periodDecrease % 12} month${periodDecrease % 12 !== 1 ? 's' : ''}` : ''}`
                                            : `${periodDecrease} month${periodDecrease !== 1 ? 's' : ''}`
                                        }
                                    </Text>
                                </View>
                                <View style={styles.savingsRow}>
                                    <Text style={styles.savingsLabel}>🎊 Freedom Day:</Text>
                                    <Text style={styles.savingsValue}>
                                        {(() => {
                                            const lastPayment = paymentSchedule[paymentSchedule.length - 1];
                                            if (!lastPayment) return 'N/A';
                                            const finalDate = new Date(date);
                                            finalDate.setMonth(finalDate.getMonth() + paymentSchedule.length - 1);
                                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                            return `${monthNames[finalDate.getMonth()]} ${finalDate.getFullYear()}`;
                                        })()}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptySavingsMessage}>
                                <Text style={styles.emptySavingsText}>
                                    💸 Add extra payments to save money on interest and pay off your loan faster!
                                </Text>
                                <TouchableOpacity 
                                    style={styles.addPaymentsButton}
                                    onPress={() => router.push(`/(tabs)/${loanId}/payments`)}
                                >
                                    <Text style={styles.addPaymentsButtonText}>+ Add Extra Payments</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        
                        {earlyPayments.length > 0 && (
                            <TouchableOpacity 
                                style={styles.addAnotherPaymentButton}
                                onPress={() => router.push(`/(tabs)/${loanId}/payments`)}
                            >
                                <Text style={styles.addAnotherPaymentButtonText}>+ Add Another Early Payment</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.subtleLink}
                            onPress={() => router.push(`/(tabs)/${loanId}/schedule`)}
                        >
                            <Text style={styles.subtleLinkText}>View detailed schedule</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Chart showing how principal balance decreases over time - comparing original vs early payments */}
                    <DualLineChart
                        title="📉 Watch Your Balance Shrink"
                        data={balanceComparisonData}
                        earlyPayments={[]} // Don't hide any points for balance comparison
                        legendLabels={{ principal: "Original", interest: "With Extra Payments" }}
                        colors={{ principal: theme.colors.warning, interest: theme.colors.primary }}
                        yAxisFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                    />

                    {/* Chart showing principal vs interest per payment */}
                    <DualLineChart
                        title="💵 Where Your Money Goes"
                        data={principalInterestData}
                        earlyPayments={[]} // Show all points
                    />

                    
                </>
            )}
        </ScrollView>
    </TouchableWithoutFeedback>;
}

// Styles for the loan overview screen
const styles = StyleSheet.create({
    // Main scrollable container
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    // Top action buttons container
    topButtonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    // Export Report button (top)
    exportButtonTop: {
        flex: 1,
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.glassBorderBlue,
        ...theme.shadows.glass,
    },
    exportButtonTopText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    // "Save Changes" button (top)
    saveButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.glassBorderPurple,
        ...theme.shadows.glass,
    },
    saveButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    // Page title
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xxl,
    },
    // Test PDF button
    testPdfButton: {
        backgroundColor: theme.colors.info,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        marginBottom: theme.spacing.xxxl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...theme.shadows.md,
    },
    testPdfButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
    },
    // Section headers
    sectionTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.lg,
        color: theme.colors.textPrimary,
    },
    // Savings container with success colors
    savingsContainer: {
        marginTop: theme.spacing.xl,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success,
        ...theme.shadows.glass,
    },
    // Row for each savings metric
    savingsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray100,
    },
    // Label for savings metrics
    savingsLabel: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    // Value for savings metrics
    savingsValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.success,
    },
    dateLabel: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textPrimary,
    },
    dateButton: {
        backgroundColor: theme.colors.surfaceGlass,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    dateButtonText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        padding: theme.spacing.xl,
        margin: theme.spacing.xl,
        ...theme.shadows.glass,
    },
    closeButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        marginTop: theme.spacing.lg,
    },
    closeButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    subtleLink: {
        padding: theme.spacing.sm,
        alignItems: "center",
        marginTop: theme.spacing.md,
    },
    subtleLinkText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        textDecorationLine: 'underline',
    },
    addAnotherPaymentButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        marginTop: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...theme.shadows.md,
    },
    addAnotherPaymentButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    emptySavingsMessage: {
        alignItems: 'center',
        paddingVertical: theme.spacing.lg,
    },
    emptySavingsText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
    },
    addPaymentsButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...theme.shadows.md,
    },
    addPaymentsButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    exportButton: {
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        borderWidth: 2,
        borderColor: 'rgba(96, 165, 250, 0.3)',
        shadowColor: '#60A5FA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
        alignSelf: 'flex-end',
        marginBottom: theme.spacing.lg,
    },
    exportButtonText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
    },
});
