import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalSearchParams, router, useFocusEffect } from 'expo-router';
import { theme } from '../../../constants/theme';
import EarlyPaymentList, { EarlyPayment, EarlyPaymentListRef } from "../../../components/EarlyPaymentList";
import { AutoSaveIndicator, AutoSaveHandle } from "../../../components/AutoSaveIndicator";

export default function PaymentsScreen() {
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    const earlyPaymentListRef = useRef<EarlyPaymentListRef>(null);
    const autoSaveRef = useRef<AutoSaveHandle>(null);
    const earlyPaymentsRef = useRef<EarlyPayment[]>([]);
    
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]);
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
            // Only reload loan metadata (startDate, amount, term) but NOT earlyPayments
            // to avoid overwriting user changes
            loadLoanMetadata();
            
            // Save any pending changes when navigating away (without debounce)
            return () => {
                if (earlyPaymentsRef.current.length > 0 && autoSaveRef.current) {
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
                    setEarlyPayments(loan.earlyPayments || []);
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
            console.error('Error loading loan:', error);
        }
    };

    // Save early payments to AsyncStorage
    const savePayments = async () => {
        try {
            const loansData = await AsyncStorage.getItem('loans');
            const loans = loansData ? JSON.parse(loansData) : [];
            const loanIndex = loans.findIndex((l: any) => l.id === loanId);
            
            if (loanIndex !== -1) {
                loans[loanIndex].earlyPayments = earlyPaymentsRef.current;
                await AsyncStorage.setItem('loans', JSON.stringify(loans));
            }
        } catch (error) {
            console.error('Error saving payments:', error);
            throw error;
        }
    };

    // Handle payment changes and trigger auto-save
    const handlePaymentsChange = (payments: EarlyPayment[]) => {
        setEarlyPayments(payments);
        earlyPaymentsRef.current = payments; // Keep ref in sync
        autoSaveRef.current?.trigger();
    };

    return (
        <ScrollView style={styles.container}>
            <AutoSaveIndicator ref={autoSaveRef} onSave={savePayments} />

            <Text style={styles.description}>
                Add extra payments to pay off your loan faster and save on interest!
            </Text>

            {/* Early payments configuration */}
            <EarlyPaymentList
                ref={earlyPaymentListRef}
                payments={earlyPayments}
                onPaymentsChange={handlePaymentsChange}
                loanStartDate={startDate}
                loanTermInMonths={loanTermInMonths}
            />

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
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.md,
        color: theme.colors.textPrimary,
    },
    description: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 22,
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
