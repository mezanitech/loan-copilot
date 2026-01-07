import { useState, useCallback, useRef } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../constants/theme';
import InputField from "../../components/InputField";
import EarlyPaymentList, { EarlyPaymentListRef, isValidEarlyPayment } from "../../components/EarlyPaymentList";
import { getCurrencyPreference, Currency } from "../../utils/storage";
import { formatCurrency } from "../../utils/currencyUtils";

type Loan = {
    id: string;
    name?: string;
    amount: number;
    interestRate: number;
    term: number;
    termUnit: 'months' | 'years';
    startDate: string;
    monthlyPayment: number;
    totalPayment: number;
    createdAt: string;
    earlyPayments?: EarlyPayment[];
};

type EarlyPayment = {
    id: string;
    name?: string;
    type: "one-time" | "recurring";
    amount: string;
    month: string;
    frequency?: string;
};

export default function AddExtraPaymentScreen() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
    const [existingPayments, setExistingPayments] = useState<EarlyPayment[]>([]);
    const earlyPaymentListRef = useRef<EarlyPaymentListRef>(null);
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    
    // Payment fields
    const [paymentName, setPaymentName] = useState("");
    const [paymentType, setPaymentType] = useState<"one-time" | "recurring">("one-time");
    const [amount, setAmount] = useState("");
    const [month, setMonth] = useState("");
    const [frequency, setFrequency] = useState("1");
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    // Load loans from storage
    const loadLoans = async () => {
        try {
            const storedLoans = await AsyncStorage.getItem('loans');
            if (storedLoans) {
                setLoans(JSON.parse(storedLoans));
            }
        } catch (error) {
            console.error('Failed to load loans:', error);
        }
    };

    // Calculate remaining principal for a loan
    const calculateRemainingPrincipal = (loan: Loan): number => {
        const startDate = new Date(loan.startDate);
        const currentDate = new Date();
        const monthsPassed = Math.max(0, 
            (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
            (currentDate.getMonth() - startDate.getMonth())
        );
        
        const termInMonths = loan.termUnit === 'years' ? loan.term * 12 : loan.term;
        const paymentsMade = Math.min(monthsPassed, termInMonths);
        
        if (paymentsMade >= termInMonths || loan.interestRate === 0) {
            return Math.max(0, loan.amount - (loan.monthlyPayment * paymentsMade));
        }
        
        const monthlyRate = loan.interestRate / 100 / 12;
        const totalPayments = termInMonths;
        const remaining = loan.amount * 
            (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, paymentsMade)) /
            (Math.pow(1 + monthlyRate, totalPayments) - 1);
        
        return Math.max(0, remaining);
    };

    useFocusEffect(
        useCallback(() => {
            loadLoans();
            loadCurrency();
        }, [])
    );

    const loadCurrency = async () => {
        const curr = await getCurrencyPreference();
        setCurrency(curr);
    };

    // Toggle loan selection (single select only)
    const toggleLoanSelection = (loanId: string) => {
        const newSelectedId = selectedLoanId === loanId ? null : loanId;
        setSelectedLoanId(newSelectedId);
        
        // Load existing payments for the newly selected loan
        if (newSelectedId) {
            const selectedLoan = loans.find(l => l.id === newSelectedId);
            setExistingPayments(selectedLoan?.earlyPayments || []);
        } else {
            setExistingPayments([]);
        }
    };

    // Get start date from selected loan
    const getSelectedLoanStartDate = (): Date => {
        if (!selectedLoanId) return new Date();
        const selectedLoan = loans.find(l => l.id === selectedLoanId);
        return selectedLoan ? new Date(selectedLoan.startDate) : new Date();
    };

    // Get loan term in months from selected loan
    const getSelectedLoanTermInMonths = (): number => {
        if (!selectedLoanId) return 0;
        const selectedLoan = loans.find(l => l.id === selectedLoanId);
        if (!selectedLoan) return 0;
        const termValue = selectedLoan.term;
        return selectedLoan.termUnit === 'years' ? termValue * 12 : termValue;
    };

    // Handle month selection
    const handleMonthChange = (event: any, selectedDateValue: Date | undefined) => {
        // On Android, always close the picker when user interacts
        if (Platform.OS === 'android') {
            setShowMonthPicker(false);
        }
        
        // Update month if a valid date was selected
        if (selectedDateValue) {
            const loanStartDate = getSelectedLoanStartDate();
            const yearDiff = selectedDateValue.getFullYear() - loanStartDate.getFullYear();
            const monthDiff = selectedDateValue.getMonth() - loanStartDate.getMonth();
            const totalMonthDiff = (yearDiff * 12) + monthDiff + 1;
            setMonth(totalMonthDiff.toString());
        }
    };

    // Get month display text
    const getMonthDisplay = (): string => {
        if (!month) return "Select Month";
        const paymentMonth = parseInt(month);
        if (isNaN(paymentMonth) || paymentMonth < 1) return "Select Month";
        
        const loanStartDate = getSelectedLoanStartDate();
        const actualDate = new Date(loanStartDate);
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = monthNames[actualDate.getMonth()];
        const year = actualDate.getFullYear();
        
        return `${monthName} ${year} (Payment #${paymentMonth})`;
    };

    // Get date for month picker
    const getDateForMonth = (): Date => {
        const loanStartDate = getSelectedLoanStartDate();
        if (!month) {
            // Default to loan start date (month 1) when no month is selected
            return loanStartDate;
        }
        const paymentMonth = parseInt(month) || 1;
        const actualDate = new Date(loanStartDate);
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        return actualDate;
    };

    // Save extra payment to selected loan
    const saveExtraPayment = async () => {
        if (!paymentName || !amount || !month) {
            alert("Please fill in all fields");
            return;
        }

        if (!selectedLoanId) {
            alert("Please select a loan");
            return;
        }

        try {
            const storedLoans = await AsyncStorage.getItem('loans');
            const allLoans = storedLoans ? JSON.parse(storedLoans) : [];

            const newPayment: EarlyPayment = {
                id: Date.now().toString(),
                name: paymentName,
                type: paymentType,
                amount: amount,
                month: month,
                ...(paymentType === "recurring" ? { frequency } : {})
            };

            // Add payment to selected loan
            const updatedLoans = allLoans.map((loan: Loan) => {
                if (loan.id === selectedLoanId) {
                    return {
                        ...loan,
                        earlyPayments: [...(loan.earlyPayments || []), newPayment]
                    };
                }
                return loan;
            });

            await AsyncStorage.setItem('loans', JSON.stringify(updatedLoans));

            // Store the selected loan ID before clearing
            const loanIdToNavigate = selectedLoanId;

            // Reset form
            setPaymentName("");
            setAmount("");
            setMonth("");
            setFrequency("1");
            setSelectedLoanId(null);
            setPaymentType("one-time");

            // Navigate to the selected loan's overview page
            router.push(`/(tabs)/${loanIdToNavigate}/overview`);
        } catch (error) {
            console.error('Failed to save extra payment:', error);
            alert("Failed to save extra payment");
        }
    };

    return (
        <View style={styles.wrapper}>
            <ScrollView style={styles.container}>
                <Text style={styles.title}>Add Extra Payment</Text>
                <Text style={styles.subtitle}>
                    Add an extra payment to one or more loans to reduce interest and pay off faster
                </Text>

                {/* Payment Name */}
                <InputField
                    label="Payment Name"
                    value={paymentName}
                    onChangeText={setPaymentName}
                    placeholder="e.g., Year-end Bonus, Tax Refund"
                />

                {/* Payment Type Toggle */}
                <View style={styles.section}>
                    <Text style={styles.label}>Payment Type</Text>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                paymentType === "one-time" && styles.toggleButtonActive
                            ]}
                            onPress={() => setPaymentType("one-time")}
                        >
                            <Text style={[
                                styles.toggleText,
                                paymentType === "one-time" && styles.toggleTextActive
                            ]}>
                                One-time
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                paymentType === "recurring" && styles.toggleButtonActive
                            ]}
                            onPress={() => setPaymentType("recurring")}
                        >
                            <Text style={[
                                styles.toggleText,
                                paymentType === "recurring" && styles.toggleTextActive
                            ]}>
                                Recurring
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Amount */}
                <InputField
                    label="Payment Amount"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    formatNumber={true}
                />

                {/* Month Selection */}
                <View style={styles.section}>
                    <Text style={styles.label}>
                        {paymentType === "one-time" ? "Payment Month" : "Starting Month"}
                    </Text>
                    <TouchableOpacity
                        style={styles.monthButton}
                        onPress={() => setShowMonthPicker(true)}
                        disabled={!selectedLoanId}
                    >
                        <Text style={[
                            styles.monthButtonText,
                            !selectedLoanId && styles.monthButtonTextDisabled
                        ]}>
                            {!selectedLoanId ? "Select a loan first" : getMonthDisplay()}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Frequency (only for recurring) */}
                {paymentType === "recurring" && (
                    <InputField
                        label="Every X Months"
                        value={frequency}
                        onChangeText={setFrequency}
                        placeholder="1"
                        keyboardType="numeric"
                    />
                )}

                {/* Payment Strategy Suggestions */}
                {loans.length > 1 && (
                    <View style={styles.section}>
                        <Text style={styles.label}>💡 Recommended Payment Strategies</Text>
                        
                        {/* Avalanche Method */}
                        <TouchableOpacity
                            style={styles.strategyCard}
                            onPress={() => {
                                const highestInterestLoan = loans.reduce((highest, current) => 
                                    current.interestRate > highest.interestRate ? current : highest
                                );
                                setSelectedLoanId(highestInterestLoan.id);
                            }}
                        >
                            <View style={styles.strategyHeader}>
                                <Text style={styles.strategyTitle}>🔥 Avalanche Method</Text>
                                <Text style={styles.strategyBadge}>Saves Most Interest</Text>
                            </View>
                            <Text style={styles.strategyDescription}>
                                Pay off loans with the highest interest rate first to minimize total interest paid.
                            </Text>
                            {(() => {
                                const highestInterestLoan = loans.reduce((highest, current) => 
                                    current.interestRate > highest.interestRate ? current : highest
                                );
                                return (
                                    <View style={styles.strategyRecommendation}>
                                        <Text style={styles.strategyRecommendText}>Recommended loan:</Text>
                                        <Text style={styles.strategyLoanName}>
                                            {highestInterestLoan.name || 'Unnamed Loan'} ({highestInterestLoan.interestRate}% APR)
                                        </Text>
                                    </View>
                                );
                            })()}
                        </TouchableOpacity>

                        {/* Snowball Method */}
                        <TouchableOpacity
                            style={styles.strategyCard}
                            onPress={() => {
                                const smallestBalanceLoan = loans.reduce((smallest, current) => {
                                    const smallestRemaining = calculateRemainingPrincipal(smallest);
                                    const currentRemaining = calculateRemainingPrincipal(current);
                                    return currentRemaining < smallestRemaining ? current : smallest;
                                });
                                setSelectedLoanId(smallestBalanceLoan.id);
                            }}
                        >
                            <View style={styles.strategyHeader}>
                                <Text style={styles.strategyTitle}>⛄ Snowball Method</Text>
                                <Text style={styles.strategyBadge}>Quick Wins</Text>
                            </View>
                            <Text style={styles.strategyDescription}>
                                Pay off smallest balance first to build momentum and motivation with quick wins.
                            </Text>
                            {(() => {
                                const smallestBalanceLoan = loans.reduce((smallest, current) => {
                                    const smallestRemaining = calculateRemainingPrincipal(smallest);
                                    const currentRemaining = calculateRemainingPrincipal(current);
                                    return currentRemaining < smallestRemaining ? current : smallest;
                                });
                                const remainingBalance = calculateRemainingPrincipal(smallestBalanceLoan);
                                return (
                                    <View style={styles.strategyRecommendation}>
                                        <Text style={styles.strategyRecommendText}>Recommended loan:</Text>
                                        <Text style={styles.strategyLoanName}>
                                            {smallestBalanceLoan.name || 'Unnamed Loan'} ({formatCurrency(remainingBalance, currency, 0)} remaining)
                                        </Text>
                                    </View>
                                );
                            })()}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Disclaimer for strategies */}
                {loans.length > 1 && (
                    <View style={styles.disclaimerBox}>
                        <Text style={styles.disclaimerText}>
                            ⚠️ These are general strategies for informational purposes only. Results may vary based on your specific situation. This is not professional financial advice. Please consult with a qualified financial advisor for personalized guidance.
                        </Text>
                    </View>
                )}

                {/* Loan Selection */}
                <View style={styles.section}>
                    <Text style={styles.label}>Select Loan</Text>
                    {loans.length === 0 ? (
                        <Text style={styles.noLoansText}>No loans available</Text>
                    ) : (
                        loans.map((loan) => (
                            <TouchableOpacity
                                key={loan.id}
                                style={[
                                    styles.loanItem,
                                    selectedLoanId === loan.id && styles.loanItemSelected
                                ]}
                                onPress={() => toggleLoanSelection(loan.id)}
                            >
                                <View style={styles.loanItemContent}>
                                    <Text style={styles.loanItemName}>{loan.name || 'Unnamed Loan'}</Text>
                                    <Text style={styles.loanItemDetails}>
                                        {formatCurrency(loan.amount, currency, 0)} @ {loan.interestRate}%
                                    </Text>
                                </View>
                                <View style={[
                                    styles.radioButton,
                                    selectedLoanId === loan.id && styles.radioButtonSelected
                                ]}>
                                    {selectedLoanId === loan.id && <View style={styles.radioButtonInner} />}
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Month Picker Modal */}
                {showMonthPicker && (
                    <Modal
                        visible={showMonthPicker}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowMonthPicker(false)}
                    >
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setShowMonthPicker(false)}
                        >
                            <View style={styles.datePickerContainer}>
                                <DateTimePicker
                                    value={getDateForMonth()}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleMonthChange}
                                    textColor={theme.colors.textPrimary}
                                    themeVariant="light"
                                />
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setShowMonthPicker(false)}
                                >
                                    <Text style={styles.closeButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                )}

                {/* Existing Extra Payments for Selected Loan */}
                {selectedLoanId && existingPayments.length > 0 && (
                    <View style={styles.existingPaymentsSection}>
                        <Text style={styles.existingPaymentsTitle}>📋 Existing Extra Payments</Text>
                        <Text style={styles.autoSaveNote}>Changes are saved automatically</Text>
                        <EarlyPaymentList
                            ref={earlyPaymentListRef}
                            payments={existingPayments}
                            onPaymentsChange={(updatedPayments) => {
                                setExistingPayments(updatedPayments);
                                // Filter out invalid payments before saving
                                const validPayments = updatedPayments.filter(isValidEarlyPayment);
                                // Update the loan in storage with only valid payments
                                const updatedLoans = loans.map(loan => {
                                    if (loan.id === selectedLoanId) {
                                        return { ...loan, earlyPayments: validPayments };
                                    }
                                    return loan;
                                });
                                setLoans(updatedLoans);
                                AsyncStorage.setItem('loans', JSON.stringify(updatedLoans));
                            }}
                            loanStartDate={getSelectedLoanStartDate()}
                            loanTermInMonths={getSelectedLoanTermInMonths()}
                        />
                    </View>
                )}

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <Text style={styles.infoText}>
                        Extra payments go directly toward your principal balance, reducing the total interest you'll pay over the life of the loan.
                    </Text>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.bottomButtonContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={saveExtraPayment}>
                    <Text style={styles.saveButtonText}>💾 Add Extra Payment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    container: {
        flex: 1,
        padding: theme.spacing.xl,
    },
    title: {
        fontSize: theme.fontSize.huge,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.xs,
        color: theme.colors.textPrimary,
    },
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xxl,
        lineHeight: 20,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textPrimary,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.gray200,
        borderRadius: theme.borderRadius.lg,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.semibold,
    },
    toggleTextActive: {
        color: theme.colors.textInverse,
    },
    monthButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1.5,
        borderColor: theme.colors.gray200,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    monthButtonText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
    },
    monthButtonTextDisabled: {
        color: theme.colors.gray400,
    },
    loanItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    loanItemSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.gray50,
    },
    loanItemContent: {
        flex: 1,
    },
    loanItemName: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    loanItemDetails: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    radioButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.gray300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: theme.colors.primary,
    },
    radioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
    },
    strategyCard: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
    },
    strategyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    strategyTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    strategyBadge: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
        backgroundColor: theme.colors.gray50,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    strategyDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: theme.spacing.md,
    },
    strategyRecommendation: {
        backgroundColor: theme.colors.gray50,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    strategyRecommendText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    strategyLoanName: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
    },
    disclaimerBox: {
        backgroundColor: '#FFF3CD',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
        marginBottom: theme.spacing.lg,
    },
    disclaimerText: {
        fontSize: theme.fontSize.xs,
        color: '#856404',
        lineHeight: 18,
    },
    noLoansText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        padding: theme.spacing.xl,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.gray50,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.xl,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    existingPaymentsSection: {
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    existingPaymentsTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.xs,
        color: theme.colors.textPrimary,
    },
    autoSaveNote: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        fontStyle: 'italic',
    },
    infoIcon: {
        fontSize: theme.fontSize.xl,
        marginRight: theme.spacing.md,
    },
    infoText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
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
    bottomButtonContainer: {
        padding: theme.spacing.xl,
        paddingBottom: theme.spacing.xxl,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
        ...theme.shadows.md,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    saveButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
    },
});
