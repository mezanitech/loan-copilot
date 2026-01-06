// Import React hooks and React Native components
import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView, Alert, Platform, Modal } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../constants/theme';
// Import custom reusable components
import InputField from "../../components/InputField";
import TermSelector from "../../components/TermSelector";
import PaymentSummary from "../../components/PaymentSummary";
import LineChart from "../../components/LineChart";
import DualLineChart from "../../components/DualLineChart";
import PaymentDetailCard from "../../components/PaymentDetailCard";
// Import calculation utilities
import { calculatePayment, generatePaymentSchedule, convertTermToMonths } from "../../utils/loanCalculations";
// Import notification utilities
import { schedulePaymentReminders } from "../../utils/notificationUtils";
import { getNotificationPreferences } from "../../utils/storage";


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

    // Validation error states
    const [loanNameError, setLoanNameError] = useState(false);
    const [loanAmountError, setLoanAmountError] = useState(false);
    const [interestRateError, setInterestRateError] = useState(false);
    const [termError, setTermError] = useState(false);
    const [attempted, setAttempted] = useState(false); // Track if user has tried to save

    // Validation functions
    const validateLoanName = (value: string) => {
        if (attempted) {
            setLoanNameError(!value || value.trim() === '');
        }
    };

    const validateLoanAmount = (value: string) => {
        if (attempted) {
            const amount = parseFloat(value);
            setLoanAmountError(!value || isNaN(amount) || amount <= 0);
        }
    };

    const validateInterestRate = (value: string) => {
        if (attempted) {
            const rate = parseFloat(value);
            setInterestRateError(!value || isNaN(rate) || rate < 0);
        }
    };

    const validateTerm = (value: string) => {
        if (attempted) {
            const termValue = parseFloat(value);
            setTermError(!value || isNaN(termValue) || termValue <= 0);
        }
    };

    // Wrapped setters with validation
    const handleLoanNameChange = (value: string) => {
        setLoanName(value);
        validateLoanName(value);
    };

    const handleLoanAmountChange = (value: string) => {
        setLoanAmount(value);
        validateLoanAmount(value);
    };

    const handleInterestRateChange = (value: string) => {
        setInterestRate(value);
        validateInterestRate(value);
    };

    const handleTermChange = (value: string) => {
        setTerm(value);
        validateTerm(value);
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

    // Save the loan to device storage and navigate to dashboard
    const saveLoan = async () => {
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);

        // Mark that save was attempted
        setAttempted(true);

        // Validate all required fields
        const nameInvalid = !loanName || loanName.trim() === '';
        const amountInvalid = !loanAmount || isNaN(principal) || principal <= 0;
        const rateInvalid = !interestRate || isNaN(annualRate) || annualRate < 0;
        const termInvalid = !term || isNaN(termValue) || termValue <= 0;

        // Set error states
        setLoanNameError(nameInvalid);
        setLoanAmountError(amountInvalid);
        setInterestRateError(rateInvalid);
        setTermError(termInvalid);

        // If any field is invalid, show alert and return
        if (nameInvalid || amountInvalid || rateInvalid || termInvalid) {
            Alert.alert('Missing Information', 'Please fill in all fields with valid values before saving.');
            return;
        }

        // Create loan object with all details
        const newLoan = {
            id: Date.now().toString(), // Use timestamp as unique ID
            name: loanName,
            amount: principal,
            interestRate: annualRate,
            term: termValue,
            termUnit,
            startDate: getStartDate(),
            monthlyPayment,
            totalPayment,
            createdAt: new Date().toISOString(),
        };

        try {
            // Get existing loans from storage
            const existingLoans = await AsyncStorage.getItem('loans');
            const loans = existingLoans ? JSON.parse(existingLoans) : [];
            
            // Schedule notifications if enabled
            const notificationPrefs = await getNotificationPreferences();
            let scheduledNotificationIds: string[] = [];
            
            if (notificationPrefs.enabled) {
                const termInMonths = convertTermToMonths(termValue, termUnit);
                scheduledNotificationIds = await schedulePaymentReminders(
                    newLoan.id,
                    loanName,
                    monthlyPayment,
                    getStartDate(),
                    termInMonths,
                    notificationPrefs.reminderDays
                );
            }
            
            // Add notification IDs to loan object
            const loanWithNotifications = {
                ...newLoan,
                scheduledNotificationIds
            };
            
            // Add new loan to array
            loans.push(loanWithNotifications);
            // Save back to storage
            await AsyncStorage.setItem('loans', JSON.stringify(loans));
            
            // Clear the form fields
            setLoanName('');
            setLoanAmount('');
            setInterestRate('');
            setTerm('');
            setDate(new Date());
            setShowAllPayments(false);
            
            // Clear validation errors
            setAttempted(false);
            setLoanNameError(false);
            setLoanAmountError(false);
            setInterestRateError(false);
            setTermError(false);
            
            // Navigate back to dashboard
            router.push('/(tabs)');
        } catch (error) {
            Alert.alert('Error', 'Failed to save loan. Please try again.');
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
        
        {/* Loan name input */}
        <InputField
            label="Loan Name"
            value={loanName}
            onChangeText={handleLoanNameChange}
            placeholder="e.g., Car Loan, Mortgage, Student Loan"
            error={loanNameError}
            errorMessage="Please enter a loan name"
        />
        
        {/* Loan amount input */}
        <InputField
            label="Loan Amount"
            value={loanAmount}
            onChangeText={handleLoanAmountChange}
            placeholder="Enter loan amount"
            keyboardType="numeric"
            formatNumber={true}
            error={loanAmountError}
            errorMessage="Please enter a valid amount greater than 0"
        />

        {/* Interest rate input */}
        <InputField
            label="Interest Rate (%)"
            value={interestRate}
            onChangeText={handleInterestRateChange}
            placeholder="Enter interest rate"
            keyboardType="decimal-pad"
            error={interestRateError}
            errorMessage="Please enter a valid interest rate"
        />

        {/* Term input with months/years toggle */}
        <TermSelector
            term={term}
            termUnit={termUnit}
            onTermChange={handleTermChange}
            onTermUnitChange={setTermUnit}
            error={termError}
            errorMessage="Please enter a valid loan term"
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
                yAxisFormatter={(v) => `$${parseFloat(loanAmount) ? (v).toLocaleString() : '0'}`}
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
        
        {/* Fixed button at bottom */}
        <View style={styles.bottomButtonContainer}>
            <TouchableOpacity style={styles.createButton} onPress={saveLoan}>
                <Text style={styles.createButtonText}>Create Loan</Text>
            </TouchableOpacity>
        </View>
    </View>;
}

// Styles for the create loan screen
const styles = StyleSheet.create({
    // Wrapper to hold scrollview and fixed button
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
    // Bottom button container
    bottomButtonContainer: {
        padding: theme.spacing.xl,
        paddingBottom: theme.spacing.xxl,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
        ...theme.shadows.md,
    },
    // Primary "Create Loan" button
    createButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
    },
    createButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
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