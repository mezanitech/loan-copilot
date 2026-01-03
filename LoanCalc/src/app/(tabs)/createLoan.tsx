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


export default function CreateLoanScreen() {
    // Form input states
    const [loanName, setLoanName] = useState("");
    const [loanAmount, setLoanAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("months"); // Can be months or years
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showAllPayments, setShowAllPayments] = useState(false); // Toggle for expanding payment details

    // Handle date selection from date picker
    const onDateChange = (event: any, selectedDate?: Date) => {
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

    // Calculate monthly payment using loan amortization formula
    const calculatePayment = () => {
        // Convert string inputs to numbers
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);

        // Return zeros if any input is missing
        if (!principal || !annualRate || !termValue) {
            return { monthlyPayment: 0, totalPayment: 0 };
        }

        // Convert term to months if it's in years
        const termInMonths = termUnit === "years" ? termValue * 12 : termValue;
        const monthlyRate = annualRate / 100 / 12; // Convert annual rate to monthly decimal

        // Handle 0% interest rate (simple division)
        if (monthlyRate === 0) {
            const monthlyPayment = principal / termInMonths;
            return {
                monthlyPayment,
                totalPayment: monthlyPayment * termInMonths,
            };
        }

        // Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) / (Math.pow(1 + monthlyRate, termInMonths) - 1);
        const totalPayment = monthlyPayment * termInMonths;

        return { monthlyPayment, totalPayment };
    };

    // Generate detailed payment schedule showing how each payment is split between principal and interest
    const generatePaymentSchedule = () => {
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);

        // Return empty if missing any required field
        if (!principal || !annualRate || !termValue) {
            return [];
        }

        const termInMonths = termUnit === "years" ? termValue * 12 : termValue;
        const monthlyRate = annualRate / 100 / 12;
        const { monthlyPayment } = calculatePayment();

        const schedule = [];
        let remainingBalance = principal;
        // Get year, month, day from date object
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        if (!year || !month || !day) return [];

        // Generate payment details for each month
        for (let i = 0; i < termInMonths; i++) {
            // Interest is calculated on remaining balance
            const interestPayment = remainingBalance * monthlyRate;
            // Rest of payment goes toward principal
            const principalPayment = monthlyPayment - interestPayment;
            remainingBalance -= principalPayment;

            // Calculate payment date (add i months to start date)
            const paymentDate = new Date(year, month - 1 + i, day);
            // Push payment details into schedule array
            schedule.push({
                paymentNumber: i + 1,
                date: paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                payment: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, remainingBalance),
            });
        }

        return schedule;
    };

    // Save the loan to device storage and navigate to dashboard
    const saveLoan = async () => {
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);

        // Validate all required fields are filled
        if (!loanName || !principal || !annualRate || !termValue) {
            Alert.alert('Missing Information', 'Please fill in all fields before saving.');
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
            // Add new loan to array
            loans.push(newLoan);
            // Save back to storage
            await AsyncStorage.setItem('loans', JSON.stringify(loans));
            
            // Clear the form fields
            setLoanAmount('');
            setInterestRate('');
            setTerm('');
            setDate(new Date());
            setShowAllPayments(false);
            
            // Navigate back to dashboard
            router.push('/(tabs)');
        } catch (error) {
            Alert.alert('Error', 'Failed to save loan. Please try again.');
        }
    };

    // Calculate payment amounts based on current inputs
    const { monthlyPayment, totalPayment } = calculatePayment();
    // Generate full payment schedule
    const paymentSchedule = generatePaymentSchedule();

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
            onChangeText={setLoanName}
            placeholder="e.g., Car Loan, Mortgage, Student Loan"
        />
        
        {/* Loan amount input */}
        <InputField
            label="Loan Amount"
            value={loanAmount}
            onChangeText={setLoanAmount}
            placeholder="Enter loan amount"
            keyboardType="numeric"
            formatNumber={true}
        />

        {/* Interest rate input */}
        <InputField
            label="Interest Rate (%)"
            value={interestRate}
            onChangeText={setInterestRate}
            placeholder="Enter interest rate"
            keyboardType="decimal-pad"
        />

        {/* Term input with months/years toggle */}
        <TermSelector
            term={term}
            termUnit={termUnit}
            onTermChange={setTerm}
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
                            textColor="#000000"
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
                color="#007AFF"
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
        {monthlyPayment > 0 && (
            <View style={styles.bottomButtonContainer}>
                <TouchableOpacity style={styles.createButton} onPress={saveLoan}>
                    <Text style={styles.createButtonText}>Create Loan</Text>
                </TouchableOpacity>
            </View>
        )}
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
        backgroundColor: theme.colors.success,
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