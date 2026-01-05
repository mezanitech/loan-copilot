// Import React hooks for state management and side effects
import { useState, useEffect, useCallback } from "react";
// Import React Native UI components
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
// Import AsyncStorage for loading loan data
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import routing utilities from expo-router
import { useGlobalSearchParams, useFocusEffect } from 'expo-router';
// Import custom components
import PaymentDetailCard from "../../../components/PaymentDetailCard";
import { EarlyPayment } from "../../../components/EarlyPaymentList";
import { theme } from '../../../constants/theme';
// Import calculation utilities
import { calculatePayment, generatePaymentSchedule, convertTermToMonths } from "../../../utils/loanCalculations";


export default function LoanScheduleScreen() {
    // Get the loan ID from URL parameters (using useGlobalSearchParams for dynamic routes in tabs)
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    
    // Loan data states
    const [loanAmount, setLoanAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("months");
    const [startDate, setStartDate] = useState("");
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]); // Additional payments
    const [showAllPayments, setShowAllPayments] = useState(false); // Toggle for expanding payment list

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
            // Reset to collapsed view when returning to this tab
            setShowAllPayments(false);
        }, [loanId])
    );

    // Load loan details from AsyncStorage
    const loadLoan = async (id: string) => {
        try {
            // Retrieve all loans from storage
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                // Find the specific loan by ID
                const loan = loans.find((l: any) => l.id === id);
                if (loan) {
                    // Populate state with loan data
                    setLoanAmount(loan.amount.toString());
                    setInterestRate(loan.interestRate.toString());
                    setTerm(loan.term.toString());
                    setTermUnit(loan.termUnit);
                    setStartDate(loan.startDate);
                    setEarlyPayments(loan.earlyPayments || []);
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
    
    // Parse start date from YYYY-MM-DD format
    const [year, month, day] = startDate ? startDate.split('-').map(Number) : [0, 0, 0];
    const startDateObj = year && month && day ? new Date(year, month - 1, day) : new Date();
    
    const paymentSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: startDateObj,
        earlyPayments
    });
    
    // Show first 5 and last 5 payments when collapsed, all when expanded
    const displayedPayments = showAllPayments || paymentSchedule.length <= 10
        ? paymentSchedule
        : [...paymentSchedule.slice(0, 5), ...paymentSchedule.slice(-5)];

    return (
        <ScrollView style={styles.container}>
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
                            />
                            {/* Show separator (...) between first 5 and last 5 payments */}
                            {!showAllPayments && index === 4 && paymentSchedule.length > 10 && (
                                <View style={styles.separator}>
                                    <Text style={styles.separatorText}>⋮</Text>
                                </View>
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
                // Show message when no schedule is available
                <Text style={styles.emptyText}>No payment schedule available</Text>
            )}
        </ScrollView>
    );
}

// Styles for the payment schedule screen
const styles = StyleSheet.create({
    // Main scrollable container
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    // Page title
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.xl,
        color: theme.colors.textPrimary,
    },
    // Container for all payment cards
    paymentDetailsContainer: {
        marginBottom: theme.spacing.xl,
    },
    // Separator between first 5 and last 5 payments
    separator: {
        alignItems: "center",
        paddingVertical: theme.spacing.sm,
    },
    separatorText: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.textTertiary,
        fontWeight: theme.fontWeight.bold,
    },
    // "Show All" / "Show Less" button
    expandButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        marginTop: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...theme.shadows.md,
    },
    expandButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    // Message shown when no schedule is available
    emptyText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: "center",
        marginTop: theme.spacing.xxxl,
    },
});
