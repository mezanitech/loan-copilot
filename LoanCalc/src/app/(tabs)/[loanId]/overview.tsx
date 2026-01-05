// Import React hooks for state management and side effects
import { useState, useEffect, useCallback } from "react";
// Import React Native UI components
import { Text, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView, Alert, Platform, Modal } from "react-native";
// Import AsyncStorage for saving/loading loan data
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import routing utilities from expo-router
import { router, useGlobalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../../constants/theme';
// Import custom reusable components
import InputField from "../../../components/InputField";
import TermSelector from "../../../components/TermSelector";
import PaymentSummary from "../../../components/PaymentSummary";
import LineChart from "../../../components/LineChart";
import DualLineChart from "../../../components/DualLineChart";

// Type for early payment data
type EarlyPayment = {
    id: string;
    type: string;
    amount: string;
    month: string;
    frequency?: string;
    name?: string;
};

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

    // Generate payment schedule INCLUDING early payments (shows actual payoff timeline)
    const generatePaymentSchedule = () => {
        // Convert string inputs to numbers
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

        let balance = principal;
        const schedule = [];
        const start = new Date(date);

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
            const paymentDate = new Date(start);
            paymentDate.setMonth(start.getMonth() + i);

            // Push payment details into schedule array
            schedule.push({
                paymentNumber: i + 1,
                date: paymentDate.toLocaleDateString(),
                payment: interestPayment + principalPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, balance),
            });
        }

        return schedule;
    };

    // Generate payment schedule WITHOUT early payments (for comparison)
    const generateOriginalPaymentSchedule = () => {
        // Convert string inputs to numbers
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

        let balance = principal;
        const schedule = [];
        const start = new Date(date);

        // Generate standard payment schedule (no early payments)
        for (let i = 0; i < termInMonths; i++) {
            // Interest is calculated on remaining balance
            const interestPayment = balance * monthlyRate;
            // Rest of payment goes toward principal
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;

            // Calculate payment date (add i months to start date)
            const paymentDate = new Date(start);
            paymentDate.setMonth(start.getMonth() + i);

            schedule.push({
                paymentNumber: i + 1,
                date: paymentDate.toLocaleDateString(),
                payment: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, balance),
            });
        }

        return schedule;
    };

    // Save updated loan data to AsyncStorage and navigate back to dashboard
    const updateLoan = async () => {
        // Validate all required fields are filled
        if (!loanName || !loanAmount || !interestRate || !term) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        // Calculate payment amounts
        const { monthlyPayment } = calculatePayment();
        const schedule = generatePaymentSchedule();
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
                // Replace old loan with updated loan
                loans[loanIndex] = updatedLoan;
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

    // Test PDF generation function
    const generateTestPDF = async () => {
        try {
            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                padding: 30px;
                                color: #333;
                            }
                            h1 { 
                                color: #60A5FA; 
                                border-bottom: 3px solid #60A5FA;
                                padding-bottom: 10px;
                                margin-bottom: 20px;
                            }
                            h2 {
                                color: #3B82F6;
                                margin-top: 25px;
                                margin-bottom: 15px;
                            }
                            .info-row {
                                display: flex;
                                justify-content: space-between;
                                padding: 10px 0;
                                border-bottom: 1px solid #E5E7EB;
                            }
                            .label {
                                font-weight: bold;
                                color: #6B7280;
                            }
                            .value {
                                color: #111827;
                                font-weight: 600;
                            }
                            .highlight {
                                background-color: #EFF6FF;
                                padding: 15px;
                                border-radius: 8px;
                                margin: 15px 0;
                            }
                            .savings {
                                background-color: #D1FAE5;
                                padding: 15px;
                                border-radius: 8px;
                                margin: 15px 0;
                                border-left: 4px solid #10B981;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 15px;
                            }
                            th {
                                background-color: #60A5FA;
                                color: white;
                                padding: 10px;
                                text-align: left;
                            }
                            td {
                                padding: 8px;
                                border-bottom: 1px solid #E5E7EB;
                            }
                            .footer {
                                margin-top: 30px;
                                padding-top: 20px;
                                border-top: 2px solid #E5E7EB;
                                color: #6B7280;
                                font-size: 12px;
                                text-align: center;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>💼 ${loanName || 'Loan'} - Detailed Report</h1>
                        
                        <h2>📊 Loan Details</h2>
                        <div class="info-row">
                            <span class="label">Loan Amount:</span>
                            <span class="value">$${parseFloat(loanAmount || '0').toLocaleString()}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Interest Rate:</span>
                            <span class="value">${interestRate}%</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Loan Term:</span>
                            <span class="value">${term} ${termUnit}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Start Date:</span>
                            <span class="value">${date.toLocaleDateString()}</span>
                        </div>
                        
                        <h2>💰 Payment Summary</h2>
                        <div class="highlight">
                            <div class="info-row">
                                <span class="label">Monthly Payment:</span>
                                <span class="value">$${monthlyPayment.toFixed(2)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Total Payment:</span>
                                <span class="value">$${actualTotalPayment.toFixed(2)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Total Interest:</span>
                                <span class="value">$${totalInterest.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        ${earlyPayments.length > 0 ? `
                            <h2>🎉 Savings from Extra Payments</h2>
                            <div class="savings">
                                <div class="info-row">
                                    <span class="label">💰 Interest Saved:</span>
                                    <span class="value">$${interestSaved.toFixed(2)}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">⚡ Time Saved:</span>
                                    <span class="value">${periodDecrease >= 12 
                                        ? `${Math.floor(periodDecrease / 12)} year${Math.floor(periodDecrease / 12) !== 1 ? 's' : ''}${periodDecrease % 12 > 0 ? ` ${periodDecrease % 12} month${periodDecrease % 12 !== 1 ? 's' : ''}` : ''}`
                                        : `${periodDecrease} month${periodDecrease !== 1 ? 's' : ''}`
                                    }</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">🎊 New Payoff Date:</span>
                                    <span class="value">${(() => {
                                        const finalDate = new Date(date);
                                        finalDate.setMonth(finalDate.getMonth() + paymentSchedule.length - 1);
                                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                        return `${monthNames[finalDate.getMonth()]} ${finalDate.getFullYear()}`;
                                    })()}</span>
                                </div>
                            </div>
                            
                            <h2>💸 Extra Payments</h2>
                            <table>
                                <tr>
                                    <th>Payment Name</th>
                                    <th>Amount</th>
                                    <th>Month</th>
                                    <th>Type</th>
                                </tr>
                                ${earlyPayments.map(payment => `
                                    <tr>
                                        <td>${payment.name || 'Extra Payment'}</td>
                                        <td>$${parseFloat(payment.amount).toLocaleString()}</td>
                                        <td>Payment #${payment.month}</td>
                                        <td>${payment.type === 'one-time' ? 'One-time' : `Recurring (every ${payment.frequency} months)`}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        ` : ''}
                        
                        <h2>📅 Payment Schedule</h2>
                        <table>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Payment</th>
                                <th>Principal</th>
                                <th>Interest</th>
                                <th>Balance</th>
                            </tr>
                            ${paymentSchedule.map((payment, index) => {
                                const paymentDate = new Date(date);
                                paymentDate.setMonth(paymentDate.getMonth() + index);
                                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                const dateStr = `${monthNames[paymentDate.getMonth()]} ${paymentDate.getFullYear()}`;
                                
                                return `
                                    <tr style="${index % 2 === 0 ? 'background-color: #F9FAFB;' : ''}">
                                        <td>${index + 1}</td>
                                        <td>${dateStr}</td>
                                        <td>$${payment.payment.toFixed(2)}</td>
                                        <td>$${payment.principal.toFixed(2)}</td>
                                        <td>$${payment.interest.toFixed(2)}</td>
                                        <td>$${payment.balance.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </table>
                        
                        <div class="footer">
                            <p>Generated by Loan Copilot on ${new Date().toLocaleDateString()}</p>
                            <p>⚠️ This is for informational purposes only. Please verify all calculations with your lender.</p>
                        </div>
                    </body>
                </html>
            `;
            
            const { uri } = await Print.printToFileAsync({ html });
            const shareResult = await Sharing.shareAsync(uri, { 
                mimeType: 'application/pdf',
                dialogTitle: 'Share Loan Report'
            });
            // User canceled sharing - this is normal, don't show error
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Don't show alert if user just dismissed/canceled
            if (!errorMessage.includes('cancel') && !errorMessage.includes('dismiss')) {
                Alert.alert("Error", "Failed to generate PDF: " + errorMessage);
            }
            console.log('PDF generation/sharing:', error);
        }
    };

    // Calculate payment amounts based on current inputs
    const { monthlyPayment, totalPayment } = calculatePayment();
    // Generate payment schedules (with and without early payments)
    const paymentSchedule = generatePaymentSchedule();
    const originalSchedule = generateOriginalPaymentSchedule();
    
    // Calculate actual total payment from schedule (reflects early payments)
    const actualTotalPayment = paymentSchedule.length > 0 
        ? paymentSchedule.reduce((sum, payment) => sum + payment.payment, 0)
        : totalPayment;
    const totalInterest = actualTotalPayment - parseFloat(loanAmount || "0");
    
    // Calculate savings from early payments by comparing with original schedule
    const originalTotalPayment = originalSchedule.reduce((sum, payment) => sum + payment.payment, 0);
    const originalTotalInterest = originalTotalPayment - parseFloat(loanAmount || "0");
    const interestSaved = earlyPayments.length > 0 ? originalTotalInterest - totalInterest : 0;
    const periodDecrease = earlyPayments.length > 0 ? originalSchedule.length - paymentSchedule.length : 0;

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
                    totalPayment={actualTotalPayment}
                    loanAmount={loanAmount}
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
                        colors={{ principal: "#FF9800", interest: "#007AFF" }}
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
