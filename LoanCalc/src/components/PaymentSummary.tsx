import { Text, View, StyleSheet } from "react-native";
import { theme } from "../constants/theme";

type PaymentSummaryProps = {
    monthlyPayment: number;
    totalPayment: number;
    loanAmount: string;
};

export default function PaymentSummary({ monthlyPayment, totalPayment, loanAmount }: PaymentSummaryProps) {
    const totalInterest = totalPayment - parseFloat(loanAmount || "0");
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>💼 Payment Summary</Text>
            
            {/* Monthly Payment - Primary highlight */}
            <View style={styles.primaryRow}>
                <View>
                    <Text style={styles.primaryLabel}>📆 Monthly Payment</Text>
                    <Text style={styles.primaryValue}>${monthlyPayment.toFixed(2)}</Text>
                </View>
            </View>
            
            {/* Secondary details */}
            <View style={styles.detailsContainer}>
                <View style={styles.row}>
                    <Text style={styles.label}>💰 Total Amount</Text>
                    <Text style={styles.value}>${totalPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>📈 Total Interest</Text>
                    <Text style={[styles.value, styles.interestValue]}>${totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
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