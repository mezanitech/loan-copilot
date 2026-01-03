import { Text, View, StyleSheet } from "react-native";

type PaymentDetailCardProps = {
    paymentNumber: number;
    date: string;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
};

export default function PaymentDetailCard({ 
    paymentNumber, 
    date, 
    payment, 
    principal, 
    interest, 
    balance 
}: PaymentDetailCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.paymentNumber}>Payment #{paymentNumber}</Text>
                <Text style={styles.date}>{date}</Text>
            </View>
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
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
    },
    paymentNumber: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
    },
    date: {
        fontSize: 14,
        color: "#666",
    },
    details: {
        gap: 8,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    label: {
        fontSize: 14,
        color: "#666",
    },
    value: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    balance: {
        color: "#007AFF",
    },
});