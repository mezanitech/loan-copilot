// Import React Native UI components
import { Text, View, StyleSheet } from "react-native";
import { theme } from "../constants/theme";
import { formatCurrency } from "../utils/currencyUtils";

// Define the props that LineChart component accepts
type LineChartProps = {
    title: string; // Chart title displayed at the top
    data: Array<{ value: number; label?: string }>; // Array of data points to plot
    color?: string; // Color of the line and points (defaults to theme primary)
    yAxisFormatter?: (value: number) => string; // Function to format Y-axis labels
    showLegend?: boolean; // Whether to show the legend
    legendItems?: Array<{ color: string; label: string }>; // Legend items to display
};

export default function LineChart({ 
    title, 
    data, 
    color = theme.colors.primary, // Default to theme primary color
    yAxisFormatter = (v) => formatCurrency(v, { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' }, 0), // Default: format as dollar amount
    showLegend = false,
    legendItems = []
}: LineChartProps) {
    // Find the highest value in the data to scale the chart
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
        <View style={styles.container}>
            {/* Chart title */}
            <Text style={styles.title}>{title}</Text>
            
            {/* Legend (only shown if showLegend is true and legendItems exist) */}
            {showLegend && legendItems.length > 0 && (
                <View style={styles.legendRow}>
                    {legendItems.map((item, idx) => (
                        <View key={idx} style={styles.legendItem}>
                            {/* Colored dot for legend item */}
                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                            {/* Legend label text */}
                            <Text style={styles.legendText}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            )}
            
            {/* Main chart area with Y-axis and chart */}
            <View style={styles.chartWrapper}>
                {/* Y-axis labels (5 evenly spaced labels from max to 0) */}
                <View style={styles.yAxisLabels}>
                    {[1, 0.75, 0.5, 0.25, 0].map((mult, idx) => (
                        <Text key={idx} style={styles.yAxisLabel}>
                            {yAxisFormatter(maxValue * mult)}
                        </Text>
                    ))}
                </View>
                
                {/* Chart area where data points are drawn */}
                <View style={styles.chart}>
                    {/* Loop through each data point to create dots */}
                    {data.map((point, index) => {
                        // Calculate height as percentage of max value (0-100%)
                        const heightPercentage = (point.value / maxValue) * 100;
                        
                        return (
                            <View key={index} style={styles.chartPointContainer}>
                                {/* Dot representing the data point */}
                                <View 
                                    style={[
                                        styles.chartPoint,
                                        { bottom: `${heightPercentage}%`, backgroundColor: color }
                                    ]}
                                />
                            </View>
                        );
                    })}
                </View>
            </View>
            
            {/* X-axis labels showing first, middle, and last payment numbers */}
            <View style={styles.xAxisLabels}>
                <Text style={styles.xAxisLabel}>Payment 1</Text>
                <Text style={styles.xAxisLabel}>Payment {Math.floor(data.length / 2)}</Text>
                <Text style={styles.xAxisLabel}>Payment {data.length}</Text>
            </View>
        </View>
    );
}

// Styles for the LineChart component
const styles = StyleSheet.create({
    // Outer container with gray background and border
    container: {
        marginTop: theme.spacing.xl,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.gray50,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
    },
    // Chart title text
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        marginBottom: 15,
        color: theme.colors.textPrimary,
    },
    // Container for legend items (horizontal row)
    legendRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: theme.spacing.xl,
        marginBottom: 10,
    },
    // Individual legend item (dot + label)
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    // Colored dot in legend
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    // Legend label text
    legendText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.semibold,
    },
    // Wrapper for Y-axis labels and chart area
    chartWrapper: {
        flexDirection: "row",
        height: 200,
        marginTop: 15,
    },
    // Container for Y-axis labels (vertical)
    yAxisLabels: {
        justifyContent: "space-between",
        paddingRight: 10,
        width: 80,
    },
    // Individual Y-axis label text
    yAxisLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: "right",
    },
    // Chart area where points and lines are drawn
    chart: {
        flex: 1,
        flexDirection: "row",
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: theme.colors.gray300,
        position: "relative",
    },
    // Container for each data point column
    chartPointContainer: {
        flex: 1,
        position: "relative",
        height: "100%",
    },
    // Dot representing a data point on the chart
    chartPoint: {
        position: "absolute",
        width: 3,
        height: 3,
        borderRadius: 1.5,
        left: "50%",
        marginLeft: -1.5,
        opacity: 0.8,
    },
    // Line connecting two data points
    chartLine: {
        position: "absolute",
        width: 2,
        left: "50%",
        marginLeft: -1,
    },
    // Container for X-axis labels (horizontal)
    xAxisLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: theme.spacing.sm,
        paddingLeft: 80, // Align with chart (offset for Y-axis labels)
    },
    // Individual X-axis label text
    xAxisLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
});