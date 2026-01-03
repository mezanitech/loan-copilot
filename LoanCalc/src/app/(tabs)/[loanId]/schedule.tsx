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

    // Calculate monthly payment using standard loan amortization formula
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

    // Generate detailed payment schedule showing each month's breakdown
    const generatePaymentSchedule = () => {
        // Convert string inputs to numbers
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);

        // Return empty if missing any required field
        if (!principal || !annualRate || !termValue || !startDate) {
            return [];
        }

        const termInMonths = termUnit === "years" ? termValue * 12 : termValue;
        const monthlyRate = annualRate / 100 / 12;
        const { monthlyPayment } = calculatePayment();

        let balance = principal;
        const schedule = [];
        // Parse date from YYYY-MM-DD format
        const [year, month, day] = startDate.split('-').map(Number);
        
        if (!year || !month || !day) return [];

        // Generate payment details for each month
        for (let i = 0; i < termInMonths; i++) {
            // Stop if loan is paid off early
            if (balance <= 0) break;
            
            // Interest is calculated on remaining balance
            const interestPayment = balance * monthlyRate;
            let totalPayment = monthlyPayment;
            
            // Add all applicable early payments for this month
            earlyPayments.forEach(payment => {
                const amount = parseFloat(payment.amount) || 0;
                const currentMonth = i + 1; // 1-indexed month number
                
                if (payment.type === "recurring") {
                    const startMonth = parseInt(payment.month) || 1;
                    const frequency = parseInt(payment.frequency || "1");
                    
                    // Check if this month qualifies for recurring payment
                    // Payment applies if: current month >= start month AND (current month - start month) is divisible by frequency
                    if (currentMonth >= startMonth && (currentMonth - startMonth) % frequency === 0) {
                        totalPayment += amount;
                    }
                // One-time payments apply to specific month
                } else if (payment.type === "one-time" && parseInt(payment.month) === currentMonth) {
                    totalPayment += amount;
                }
            });
            
            // Calculate principal payment (can't exceed remaining balance)
            const principalPayment = Math.min(totalPayment - interestPayment, balance);
            balance -= principalPayment;

            // Calculate payment date (add i months to start date)
            const paymentDate = new Date(year, month - 1 + i, day);

            // Push payment details into schedule array
            schedule.push({
                paymentNumber: i + 1,
                date: paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                payment: interestPayment + principalPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, balance),
            });
        }

        return schedule;
    };

    // Generate full payment schedule
    const paymentSchedule = generatePaymentSchedule();
    // Show first 5 and last 5 payments when collapsed, all when expanded
    const displayedPayments = showAllPayments
        ? paymentSchedule
        : [...paymentSchedule.slice(0, 5), ...paymentSchedule.slice(-5)];

    return (
        <ScrollView style={styles.container}>
            {/* Page title */}
            <Text style={styles.title}>Payment Schedule</Text>
            
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
        padding: 20,
    },
    // Page title
    title: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 20,
        color: "#333",
    },
    // Container for all payment cards
    paymentDetailsContainer: {
        marginBottom: 20,
    },
    // Separator between first 5 and last 5 payments
    separator: {
        alignItems: "center",
        paddingVertical: 8,
    },
    separatorText: {
        fontSize: 20,
        color: "#999",
        fontWeight: "700",
    },
    // Blue "Show All" / "Show Less" button
    expandButton: {
        backgroundColor: "#007AFF",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 12,
    },
    expandButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Message shown when no schedule is available
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginTop: 40,
    },
});
