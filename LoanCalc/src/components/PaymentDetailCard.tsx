import { Text, View, StyleSheet } from "react-native";
import { theme } from "../constants/theme";

type PaymentDetailCardProps = {
    paymentNumber: number;
    date: string;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
    interestRate?: number;
    rateChanged?: boolean;
};

export default function PaymentDetailCard({ 
    paymentNumber, 
    date, 
    payment, 
    principal, 
    interest, 
    balance,
    interestRate,
    rateChanged
}: PaymentDetailCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.paymentNumber}>Payment #{paymentNumber}</Text>
                <Text style={styles.date}>{date}</Text>
            </View>
            {rateChanged && interestRate !== undefined && (
                <View style={styles.rateChangeBadge}>
                    <Text style={styles.rateChangeText}>
                        ⚠️ Rate changed to {interestRate.toFixed(2)}%
                    </Text>
                </View>
            )}
            <View style={styles.details}>
                <View style={styles.row}>
                    <Text style={styles.label}>Payment</Text>
                    <Text style={styles.value}>${payment.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Principal</Text>
                    <Text style={styles.value}>${principal.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Interest</Text>
                    <Text style={styles.value}>${interest.toFixed(2)}</Text>
                </View>
                {interestRate !== undefined && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Current Rate</Text>
                        <Text style={styles.value}>{interestRate.toFixed(2)}%</Text>
                    </View>
                )}
                <View style={styles.row}>
                    <Text style={styles.label}>Remaining Balance</Text>
                    <Text style={[styles.value, styles.balance]}>${balance.toFixed(2)}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
        ...theme.shadows.sm,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray200,
    },
    rateChangeBadge: {
        backgroundColor: '#fff3cd',
        borderRadius: theme.borderRadius.sm,
        padding: 10,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.warning,
    },
    rateChangeText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: '#856404',
        textAlign: "center",
    },
    paymentNumber: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    date: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    details: {
        gap: theme.spacing.sm,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    label: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    value: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
    },
    balance: {
        color: theme.colors.primary,
    },
});