import { useState, useEffect, useCallback } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { theme } from "../constants/theme";
import { getCurrencyPreference, Currency } from "../utils/storage";
import { formatCurrency } from "../utils/currencyUtils";

type PaymentSummaryProps = {
    monthlyPayment: number;
    totalPayment: number;
    loanAmount: string;
    remainingBalance?: number;
};

export default function PaymentSummary({ monthlyPayment, totalPayment, loanAmount, remainingBalance }: PaymentSummaryProps) {
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const totalInterest = totalPayment - parseFloat(loanAmount || "0");
    
    useFocusEffect(
        useCallback(() => {
            loadCurrency();
        }, [])
    );

    const loadCurrency = async () => {
        const curr = await getCurrencyPreference();
        setCurrency(curr);
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>💼 Payment Summary</Text>
            
            {/* Monthly Payment - Primary highlight */}
            <View style={styles.primaryRow}>
                <View>
                    <Text style={styles.primaryLabel}>📆 Monthly Payment</Text>
                    <Text style={styles.primaryValue}>{formatCurrency(monthlyPayment, currency)}</Text>
                </View>
            </View>
            
            {/* Secondary details */}
            <View style={styles.detailsContainer}>
                <View style={styles.row}>
                    <Text style={styles.label}>💰 Total Amount</Text>
                    <Text style={styles.value}>{formatCurrency(totalPayment, currency)}</Text>
                </View>
                {remainingBalance !== undefined && (
                    <View style={styles.row}>
                        <Text style={styles.label}>💳 Remaining Balance</Text>
                        <Text style={[styles.value, { color: theme.colors.primary }]}>{formatCurrency(remainingBalance, currency)}</Text>
                    </View>
                )}
                <View style={styles.row}>
                    <Text style={styles.label}>📈 Total Interest</Text>
                    <Text style={[styles.value, styles.interestValue]}>{formatCurrency(totalInterest, currency)}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: theme.spacing.xxl,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.md,
    },
    title: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        padding: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        color: theme.colors.textPrimary,
        backgroundColor: theme.colors.gray50,
    },
    primaryRow: {
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.primary,
    },
    primaryLabel: {
        fontSize: theme.fontSize.sm,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: theme.spacing.xs,
    },
    primaryValue: {
        fontSize: theme.fontSize.huge,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textInverse,
    },
    detailsContainer: {
        padding: theme.spacing.xl,
        gap: theme.spacing.lg,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: 'center',
    },
    label: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
    },
    value: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
    },
    interestValue: {
        color: theme.colors.warning,
    },
});