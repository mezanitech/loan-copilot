import { useState, useEffect } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalSearchParams, router } from 'expo-router';
import { theme } from '../../../constants/theme';
import EarlyPaymentList, { EarlyPayment } from "../../../components/EarlyPaymentList";

export default function PaymentsScreen() {
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]);
    const [startDate, setStartDate] = useState(new Date());
    const [loanAmount, setLoanAmount] = useState("");

    // Load loan data when component mounts
    useEffect(() => {
        if (loanId) {
            loadLoan(loanId);
        }
    }, [loanId]);

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
                loans[loanIndex].earlyPayments = earlyPayments;
                await AsyncStorage.setItem('loans', JSON.stringify(loans));
                Alert.alert("Success", "Early payments saved successfully");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to save early payments");
            console.error(error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>💰 Extra Payments</Text>
            <Text style={styles.description}>
                Add extra payments to pay off your loan faster and save on interest!
            </Text>

            {/* Early payments configuration */}
            <EarlyPaymentList
                payments={earlyPayments}
                onPaymentsChange={setEarlyPayments}
                loanStartDate={startDate}
            />

            {/* Info box */}
            <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>💡</Text>
                <Text style={styles.infoText}>
                    Extra payments go directly toward your principal balance, reducing the total interest you'll pay over the life of the loan.
                </Text>
            </View>

            {/* Save button */}
            <TouchableOpacity style={styles.saveButton} onPress={savePayments}>
                <Text style={styles.saveButtonText}>💾 Save Extra Payments</Text>
            </TouchableOpacity>
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
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.info,
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
        flexDirection: 'row',
        alignItems: 'flex-start',
        ...theme.shadows.sm,
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
    saveButton: {
        backgroundColor: theme.colors.success,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        marginBottom: theme.spacing.xxxl,
        ...theme.shadows.md,
    },
    saveButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
    },
});
