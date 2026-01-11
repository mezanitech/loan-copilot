import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalSearchParams, router, useFocusEffect } from 'expo-router';
import { theme } from '../../../constants/theme';
import EarlyPaymentList, { EarlyPayment, EarlyPaymentListRef } from "../../../components/EarlyPaymentList";
import RateAdjustmentList, { RateAdjustment, RateAdjustmentListRef } from "../../../components/RateAdjustmentList";
import { AutoSaveIndicator, AutoSaveHandle } from "../../../components/AutoSaveIndicator";
import { calculatePayment, generatePaymentSchedule } from "../../../utils/loanCalculations";

export default function PaymentsScreen() {
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

    // Load loan data when component mounts
    useEffect(() => {
        if (loanId) {
            loadLoan(loanId);
        }
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
                const loan = loans.find((l: any) => l.id === loanId);
                if (loan) {
                    if (loan.startDate) {
                        setStartDate(new Date(loan.startDate));
                    }
                    setLoanAmount(loan.amount.toString());
                    // Calculate term in months
                    const termValue = parseFloat(loan.term);
                    const termInMonths = loan.termUnit === 'years' ? termValue * 12 : termValue;
                    setLoanTermInMonths(termInMonths);
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
                const loan = loans.find((l: any) => l.id === id);
                if (loan) {
                    const loadedEarlyPayments = loan.earlyPayments || [];
                    const loadedRateAdjustments = loan.rateAdjustments || [];
                    
                    setEarlyPayments(loadedEarlyPayments);
                    setRateAdjustments(loadedRateAdjustments);
                    
                    // IMPORTANT: Update refs to match loaded state
                    earlyPaymentsRef.current = loadedEarlyPayments;
                    rateAdjustmentsRef.current = loadedRateAdjustments;
                    
                    if (loan.startDate) {
                        const parsedDate = new Date(loan.startDate);
                        setStartDate(parsedDate);
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
                const schedule = generatePaymentSchedule({
                    principal,
                    annualRate,
                    termInMonths,
                    startDate: new Date(existingLoan.startDate),
                    earlyPayments: earlyPaymentsRef.current,
                    rateAdjustments: rateAdjustmentsForCalc
                });
                
                // Calculate current monthly payment from schedule
                const monthsElapsed = Math.max(0, Math.floor((Date.now() - new Date(existingLoan.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
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
                    const finalDate = new Date(existingLoan.startDate);
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
        <ScrollView style={styles.container}>
            <AutoSaveIndicator ref={autoSaveRef} onSave={saveAdjustments} />

            <Text style={styles.description}>
                Adjust your loan with extra payments or interest rate changes to see their impact on your payoff timeline and total interest.
            </Text>

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
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    description: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 22,
    },
    section: {
        marginBottom: theme.spacing.xxl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    noteBox: {
        backgroundColor: theme.colors.info + '15',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.info + '30',
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
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    comingSoon: {
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    comingSoonText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.semibold,
    },
    infoBox: {
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.info,
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
        flexDirection: 'row',
        alignItems: 'flex-start',
        ...theme.shadows.glass,
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
});
