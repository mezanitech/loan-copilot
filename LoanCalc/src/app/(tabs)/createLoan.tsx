// Import React hooks and React Native components
import { useState, useRef, useEffect, useCallback } from "react";
import { Text, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView, Alert, Platform, Modal } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../constants/theme';
// Import custom reusable components
import InputField from "../../components/InputField";
import TermSelector from "../../components/TermSelector";
import PaymentSummary from "../../components/PaymentSummary";
import LineChart from "../../components/LineChart";
import DualLineChart from "../../components/DualLineChart";
import PaymentDetailCard from "../../components/PaymentDetailCard";
import { AutoSaveIndicator, AutoSaveHandle } from "../../components/AutoSaveIndicator";
// Import calculation utilities
import { calculatePayment, generatePaymentSchedule, convertTermToMonths } from "../../utils/loanCalculations";
// Import notification utilities
import { schedulePaymentReminders } from "../../utils/notificationUtils";
import { getNotificationPreferences } from "../../utils/storage";
import { formatCurrency } from "../../utils/currencyUtils";


export default function CreateLoanScreen() {
    // Form input states
    const [loanName, setLoanName] = useState("");
    const [loanAmount, setLoanAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("years"); // Can be months or years
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showAllPayments, setShowAllPayments] = useState(false); // Toggle for expanding payment details
    const [createdLoanId, setCreatedLoanId] = useState<string | null>(null); // Track created loan ID
    const autoSaveRef = useRef<AutoSaveHandle>(null);
    const hasNavigatedAway = useRef(false); // Track if user has left the screen

    // Clear form when user returns to page after creating a loan
    useFocusEffect(
        useCallback(() => {
            // When screen comes into focus
            if (hasNavigatedAway.current && createdLoanId) {
                // Clear all form fields
                setLoanName('');
                setLoanAmount('');
                setInterestRate('');
                setTerm('');
                setDate(new Date());
                setShowAllPayments(false);
                setCreatedLoanId(null);
                hasNavigatedAway.current = false;
            }
            
            // Return cleanup that sets the flag when leaving
            return () => {
                if (createdLoanId) {
                    hasNavigatedAway.current = true;
                }
            };
        }, [createdLoanId])
    );

    // Validation helper
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

    // Individual field validation for highlighting
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

    // Trigger auto-save
    const triggerAutoSave = () => {
        if (isValidLoanData() && autoSaveRef.current) {
            autoSaveRef.current.trigger();
        }
    };

    // Wrapped setters with auto-save trigger
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

    // Handle date selection from date picker
    const onDateChange = (event: any, selectedDate?: Date) => {
        // On Android, always close the picker when user interacts
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        
        // Update date if a valid date was selected
        if (selectedDate) {
            setDate(selectedDate);
            triggerAutoSave();
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
        // Ensure date is valid before formatting
        if (!date || isNaN(date.getTime())) {
            return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        }
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // Calculate payment amounts based on current inputs
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    const termValue = parseFloat(term);
    const termInMonths = convertTermToMonths(termValue, termUnit);
    
    const { monthlyPayment, totalPayment } = calculatePayment({ 
        principal, 
        annualRate, 
        termInMonths 
    });
    
    // Generate full payment schedule
    const paymentSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: date 
    });

    // Auto-save loan to device storage
    const saveLoan = async () => {
        if (!isValidLoanData()) {
            return;
        }

        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);

        try {
            // Get existing loans from storage
            const existingLoans = await AsyncStorage.getItem('loans');
            const loans = existingLoans ? JSON.parse(existingLoans) : [];
            
            // Determine loan ID - use existing if already created, otherwise create new
            const loanId = createdLoanId || Date.now().toString();
            
            // Find if loan already exists
            const existingLoanIndex = loans.findIndex((l: any) => l.id === loanId);
            
            // Create/update loan object with all details
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
                createdAt: existingLoanIndex !== -1 ? loans[existingLoanIndex].createdAt : new Date().toISOString(),
            };
            
            // Schedule notifications if enabled
            const notificationPrefs = await getNotificationPreferences();
            let scheduledNotificationIds: string[] = [];
            
            if (notificationPrefs.enabled) {
                const termInMonths = convertTermToMonths(termValue, termUnit);
                scheduledNotificationIds = await schedulePaymentReminders(
                    loanId,
                    loanName,
                    monthlyPayment,
                    getStartDate(),
                    termInMonths,
                    notificationPrefs.reminderDays
                );
            }
            
            // Add notification IDs to loan object
            const loanWithNotifications = {
                ...loanData,
                scheduledNotificationIds
            };
            
            if (existingLoanIndex !== -1) {
                // Update existing loan
                loans[existingLoanIndex] = loanWithNotifications;
            } else {
                // Add new loan to array
                loans.push(loanWithNotifications);
                // Store the loan ID so subsequent saves update instead of create
                setCreatedLoanId(loanId);
            }
            
            // Save back to storage
            await AsyncStorage.setItem('loans', JSON.stringify(loans));
        } catch (error) {
            console.error('Error saving loan:', error);
            throw error;
        }
    };

    // Dismiss keyboard when tapping outside
    return <View style={styles.wrapper}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView style={styles.container}>
        {/* Page title */}
        <Text style={styles.title}>
            Calculate your loan payments
        </Text>
        
        <AutoSaveIndicator ref={autoSaveRef} onSave={saveLoan} />
        {!isValidLoanData() && (
            <View style={styles.errorIndicator}>
                <Text style={styles.errorText}>⚠️ Fill in all fields</Text>
            </View>
        )}

        {/* Loan name input */}
        <View style={!isValidName() && loanName !== '' ? styles.fieldError : undefined}>
            <InputField
                label="Loan Name"
                value={loanName}
                onChangeText={handleLoanNameChange}
                placeholder="e.g., Car Loan, Mortgage, Student Loan"
            />
        </View>
        
        {/* Loan amount input */}
        <View style={!isValidAmount() && loanAmount !== '' ? styles.fieldError : undefined}>
            <InputField
                label="Loan Amount"
                value={loanAmount}
                onChangeText={handleLoanAmountChange}
                placeholder="Enter loan amount"
                keyboardType="numeric"
                formatNumber={true}
            />
        </View>

        {/* Interest rate input */}
        <View style={!isValidRate() && interestRate !== '' ? styles.fieldError : undefined}>
            <InputField
                label="Interest Rate (%)"
                value={interestRate}
                onChangeText={handleInterestRateChange}
                placeholder="Enter interest rate"
                keyboardType="decimal-pad"
            />
        </View>

        {/* Term input with months/years toggle */}
        <View style={!isValidTerm() && term !== '' ? styles.fieldError : undefined}>
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
                totalPayment={totalPayment}
                loanAmount={loanAmount}
            />
        )}

        {/* Chart showing how principal balance decreases over time */}
        {paymentSchedule.length > 0 && (
            <LineChart
                title="Principal Balance Over Time"
                data={paymentSchedule.map(p => ({ value: p.balance }))}
                color={theme.colors.primary}
                yAxisFormatter={(v) => formatCurrency(v, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' }, 0)}
            />
        )}

        {/* Chart showing principal vs interest payments each month */}
        {paymentSchedule.length > 0 && (
            <DualLineChart
                title="Principal & Interest Payments Over Time"
                data={paymentSchedule}
            />
        )}

        {/* Detailed payment schedule section */}
        {paymentSchedule.length > 0 && (
            <View style={styles.paymentDetailsContainer}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                {(() => {
                    // Show first 5 and last 5 payments if more than 10 total
                    let displayPayments = paymentSchedule;
                    const shouldShowToggle = paymentSchedule.length > 10;
                    
                    if (!showAllPayments && shouldShowToggle) {
                        const firstFive = paymentSchedule.slice(0, 5);
                        const lastFive = paymentSchedule.slice(-5);
                        displayPayments = [...firstFive, ...lastFive];
                    }
                    
                    return (
                        <>
                            {displayPayments.map((payment, index) => {
                                // Show separator (...) between first 5 and last 5
                                const showSeparator = !showAllPayments && shouldShowToggle && index === 5;
                                
                                return (
                                    <View key={payment.paymentNumber}>
                                        {showSeparator && (
                                            <View style={styles.separator}>
                                                <Text style={styles.separatorText}>...</Text>
                                            </View>
                                        )}
                                        <PaymentDetailCard
                                            paymentNumber={payment.paymentNumber}
                                            date={payment.date}
                                            payment={payment.payment}
                                            principal={payment.principal}
                                            interest={payment.interest}
                                            balance={payment.balance}
                                        />
                                    </View>
                                );
                            })}
                            {shouldShowToggle && (
                                <TouchableOpacity 
                                    style={styles.expandButton}
                                    onPress={() => setShowAllPayments(!showAllPayments)}
                                >
                                    <Text style={styles.expandButtonText}>
                                        {showAllPayments ? 'Show Less' : `Show All ${paymentSchedule.length} Payments`}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    );
                })()}
            </View>
        )}

            </ScrollView>
        </TouchableWithoutFeedback>
    </View>;
}

// Styles for the create loan screen
const styles = StyleSheet.create({
    // Wrapper to hold scrollview
    wrapper: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    // Main scrollable container
    container: {
        flex: 1,
        padding: theme.spacing.xl,
    },
    // Page title
    title: {
        fontSize: theme.fontSize.huge,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.xxl,
        color: theme.colors.textPrimary,
    },
    // Error indicator
    errorIndicator: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.sm,
        minHeight: 30,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
    fieldError: {
        borderWidth: 2,
        borderColor: theme.colors.error,
        borderRadius: theme.borderRadius.md,
        padding: 2,
        marginBottom: theme.spacing.sm,
    },
    // Container for payment schedule section
    paymentDetailsContainer: {
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    // Section headers
    sectionTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.lg,
        color: theme.colors.textPrimary,
    },
    // Separator between first and last 5 payments
    separator: {
        alignItems: "center",
        paddingVertical: theme.spacing.md,
    },
    separatorText: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.gray400,
        fontWeight: theme.fontWeight.bold,
    },
    // Expand/collapse button
    expandButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        marginTop: theme.spacing.md,
    },
    expandButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    dateLabel: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textPrimary,
    },
    dateButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1.5,
        borderColor: theme.colors.gray200,
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
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        margin: theme.spacing.xl,
        ...theme.shadows.lg,
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
});