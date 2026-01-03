import { Text, View, StyleSheet } from "react-native";

type EarlyPayment = {
    id: string;
    type: string;
    amount: string;
    month: string;
    frequency?: string;
};

type DualLineChartProps = {
    title: string;
    data: Array<{ principal: number; interest: number }>;
    earlyPayments?: EarlyPayment[];
    legendLabels?: { principal: string; interest: string };
    colors?: { principal: string; interest: string };
    yAxisFormatter?: (value: number) => string;
};

export default function DualLineChart({ 
    title, 
    data, 
    earlyPayments = [],
    legendLabels = { principal: "Principal", interest: "Interest" },
    colors = { principal: "#4CAF50", interest: "#FF6B6B" },
    yAxisFormatter = (v) => `$${v.toFixed(0)}`
}: DualLineChartProps) {
    // Calculate maxValue excluding months with early payments to avoid scale distortion
    const calculatedMax = Math.max(...data.map((d, index) => {
        const currentMonth = index + 1;
        const hasEarlyPayment = earlyPayments.some(payment => {
            if (payment.type === "one-time") {
                return parseInt(payment.month) === currentMonth;
            } else if (payment.type === "recurring") {
                const startMonth = parseInt(payment.month) || 1;
                const frequency = parseInt(payment.frequency || "1");
                return currentMonth >= startMonth && (currentMonth - startMonth) % frequency === 0;
            }
            return false;
        });
        // Exclude early payment months from max calculation
        return hasEarlyPayment ? 0 : Math.max(d.principal, d.interest);
    }));
    
    // Fallback to overall max if filtered max is invalid (e.g., all months have early payments)
    const maxValue = calculatedMax > 0 
        ? calculatedMax 
        : Math.max(...data.map(d => Math.max(d.principal, d.interest)), 1);
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.principal }]} />
                    <Text style={styles.legendText}>{legendLabels.principal}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.interest }]} />
                    <Text style={styles.legendText}>{legendLabels.interest}</Text>
                </View>
            </View>
            <View style={styles.chartWrapper}>
                <View style={styles.yAxisLabels}>
                    {[1, 0.75, 0.5, 0.25, 0].map((mult, idx) => (
                        <Text key={idx} style={styles.yAxisLabel}>
                            {yAxisFormatter(maxValue * mult)}
                        </Text>
                    ))}
                </View>
                <View style={styles.chart}>
                    {data.map((point, index) => {
                        const principalHeight = (point.principal / maxValue) * 100;
                        const interestHeight = (point.interest / maxValue) * 100;
                        
                        // Check if there's an early payment at this month
                        const currentMonth = index + 1;
                        const hasEarlyPayment = earlyPayments.some(payment => {
                            if (payment.type === "one-time") {
                                return parseInt(payment.month) === currentMonth;
                            } else if (payment.type === "recurring") {
                                const startMonth = parseInt(payment.month) || 1;
                                const frequency = parseInt(payment.frequency || "1");
                                return currentMonth >= startMonth && (currentMonth - startMonth) % frequency === 0;
                            }
                            return false;
                        });
                        
                        return (
                            <View key={index} style={styles.chartPointContainer}>
                                {/* Only show points if no early payment at this month */}
                                {!hasEarlyPayment && (
                                    <>
                                        {/* Principal - only show if value is not zero */}
                                        {point.principal > 0 && (
                                            <View 
                                                style={[
                                                    styles.chartPoint,
                                                    { bottom: `${principalHeight}%`, left: '40%', backgroundColor: colors.principal }
                                                ]}
                                            />
                                        )}
                                        
                                        {/* Interest - only show if value is not zero */}
                                        {point.interest > 0 && (
                                            <View 
                                                style={[
                                                    styles.chartPoint,
                                                    { bottom: `${interestHeight}%`, left: '60%', backgroundColor: colors.interest }
                                                ]}
                                            />
                                        )}
                                    </>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
            <View style={styles.xAxisLabels}>
                <Text style={styles.xAxisLabel}>Payment 1</Text>
                <Text style={styles.xAxisLabel}>Payment {Math.floor(data.length / 2)}</Text>
                <Text style={styles.xAxisLabel}>Payment {data.length}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        padding: 20,
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 15,
        color: "#333",
    },
    legendRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        marginBottom: 10,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "600",
    },
    chartWrapper: {
        flexDirection: "row",
        height: 200,
        marginTop: 15,
    },
    yAxisLabels: {
        justifyContent: "space-between",
        paddingRight: 10,
        width: 80,
    },
    yAxisLabel: {
        fontSize: 11,
        color: "#666",
        textAlign: "right",
    },
    chart: {
        flex: 1,
        flexDirection: "row",
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: "#ddd",
        position: "relative",
    },
    chartPointContainer: {
        flex: 1,
        position: "relative",
        height: "100%",
    },
    chartPoint: {
        position: "absolute",
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginLeft: -1.5,
        opacity: 0.8,
    },
    chartLine: {
        position: "absolute",
        width: 2,
        marginLeft: -1,
    },
    xAxisLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        paddingLeft: 80,
    },
    xAxisLabel: {
        fontSize: 11,
        color: "#666",
    },
    earlyPaymentMarker: {
        position: "absolute",
        bottom: 0,
        left: "50%",
        width: 2,
        height: "100%",
        backgroundColor: "rgba(255, 165, 0, 0.3)",
        marginLeft: -1,
    },
});