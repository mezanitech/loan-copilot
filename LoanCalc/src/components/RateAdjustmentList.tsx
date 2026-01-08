import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useState, forwardRef, useImperativeHandle } from "react";
import InputField from "./InputField";
import DatePicker from "./DatePicker";
import { theme } from "../constants/theme";

export type RateAdjustment = {
    id: string;
    name?: string;
    month: string; // Month number when rate changes (2+, 1-indexed)
    newRate: string; // New interest rate as string for form input
};

// Validation helper
export const isValidRateAdjustment = (adjustment: RateAdjustment, loanTermInMonths: number): boolean => {
    // Rate must be a valid number between 0-30
    const rateNum = parseFloat(adjustment.newRate);
    if (!adjustment.newRate || isNaN(rateNum) || rateNum < 0 || rateNum > 30) {
        return false;
    }
    
    // Month must be a valid number (2 to loanTermInMonths)
    const monthNum = parseInt(adjustment.month);
    if (!adjustment.month || isNaN(monthNum) || monthNum < 2 || monthNum > loanTermInMonths) {
        return false;
    }
    
    return true;
};

type RateAdjustmentListProps = {
    adjustments: RateAdjustment[];
    onAdjustmentsChange: (adjustments: RateAdjustment[]) => void;
    loanStartDate: Date;
    loanTermInMonths: number;
};

export type RateAdjustmentListRef = {
    collapseAll: () => void;
};

const RateAdjustmentList = forwardRef<RateAdjustmentListRef, RateAdjustmentListProps>(
    ({ adjustments, onAdjustmentsChange, loanStartDate, loanTermInMonths }, ref) => {
    const [activeMonthPicker, setActiveMonthPicker] = useState<string | null>(null);
    const [expandedAdjustments, setExpandedAdjustments] = useState<Set<string>>(new Set());
    
    useImperativeHandle(ref, () => ({
        collapseAll: () => setExpandedAdjustments(new Set())
    }));
    
    // Check if a month already has a rate adjustment
    const isMonthUsed = (month: string, excludeId?: string): boolean => {
        return adjustments.some(adj => adj.month === month && adj.id !== excludeId);
    };

    // Auto-sort adjustments by month
    const sortAdjustments = (adjs: RateAdjustment[]): RateAdjustment[] => {
        return [...adjs].sort((a, b) => {
            const monthA = parseInt(a.month) || 0;
            const monthB = parseInt(b.month) || 0;
            return monthA - monthB;
        });
    };
    
    const addAdjustment = () => {
        const newAdjustment: RateAdjustment = {
            id: Date.now().toString(),
            name: "",
            month: "2", // Default to month 2 (first allowed month)
            newRate: "",
        };
        const sortedAdjustments = sortAdjustments([...adjustments, newAdjustment]);
        onAdjustmentsChange(sortedAdjustments);
        // Collapse all existing adjustments and expand only the new one
        setExpandedAdjustments(new Set([newAdjustment.id]));
    };

    const removeAdjustment = (id: string) => {
        onAdjustmentsChange(adjustments.filter(a => a.id !== id));
        // Remove from expanded set
        const newExpanded = new Set(expandedAdjustments);
        newExpanded.delete(id);
        setExpandedAdjustments(newExpanded);
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedAdjustments);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedAdjustments(newExpanded);
    };

    const updateAdjustment = (id: string, field: keyof RateAdjustment, value: string) => {
        // If updating month, check for duplicates
        if (field === 'month') {
            if (isMonthUsed(value, id)) {
                Alert.alert(
                    'Duplicate Month',
                    'This month already has a rate adjustment. Please choose a different month.',
                    [{ text: 'OK' }]
                );
                return;
            }
        }

        const updatedAdjustments = adjustments.map(a => 
            a.id === id ? { ...a, [field]: value } : a
        );
        
        // Auto-sort after update
        const sortedAdjustments = sortAdjustments(updatedAdjustments);
        onAdjustmentsChange(sortedAdjustments);
    };

    const handleMonthChange = (event: any, selectedDate: Date | undefined, adjustmentId: string) => {
        if (selectedDate) {
            // Calculate the payment month number based on loan start date
            const yearDiff = selectedDate.getFullYear() - loanStartDate.getFullYear();
            const monthDiff = selectedDate.getMonth() - loanStartDate.getMonth();
            const totalMonthDiff = (yearDiff * 12) + monthDiff + 1; // +1 because first payment is month 1
            
            // Restrict to valid months (2 to loanTermInMonths)
            if (totalMonthDiff >= 2 && totalMonthDiff <= loanTermInMonths) {
                updateAdjustment(adjustmentId, "month", totalMonthDiff.toString());
            }
        }
        setActiveMonthPicker(null);
    };

    const getMonthDisplay = (monthStr: string): string => {
        if (!monthStr) return "Select Month";
        const paymentMonth = parseInt(monthStr);
        if (isNaN(paymentMonth) || paymentMonth < 2) return "Select Month";
        
        // Calculate the actual date from payment month and loan start date
        const actualDate = new Date(loanStartDate.getTime()); // Proper clone
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = monthNames[actualDate.getMonth()];
        const year = actualDate.getFullYear();
        
        return `${monthName} ${year} (Payment #${paymentMonth})`;
    };

    const getDateForMonth = (monthStr: string): Date => {
        console.log('[RATE_ADJ] getDateForMonth called, loanStartDate:', loanStartDate.toISOString());
        const paymentMonth = parseInt(monthStr) || 2;
        // Calculate actual date from loan start date and payment month
        const actualDate = new Date(loanStartDate.getTime()); // Proper clone
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        console.log('[RATE_ADJ] Calculated date for month', paymentMonth, ':', actualDate.toISOString());
        return actualDate;
    };

    const getMinDate = (): Date => {
        // Second payment month (month 2)
        const minDate = new Date(loanStartDate.getTime()); // Proper clone
        minDate.setMonth(minDate.getMonth() + 1); // +1 for month 2
        return minDate;
    };

    const getMaxDate = (): Date => {
        // Last payment date
        const maxDate = new Date(loanStartDate.getTime()); // Proper clone
        maxDate.setMonth(maxDate.getMonth() + loanTermInMonths - 1);
        return maxDate;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Rate Adjustments</Text>
                <TouchableOpacity style={styles.addButton} onPress={addAdjustment}>
                    <Text style={styles.addButtonText}>+ Add Rate Change</Text>
                </TouchableOpacity>
            </View>

            {adjustments.map((adjustment, index) => {
                const isExpanded = expandedAdjustments.has(adjustment.id);
                const isComplete = adjustment.month && adjustment.newRate;
                const isValid = isValidRateAdjustment(adjustment, loanTermInMonths);
                
                return (
                <View key={adjustment.id} style={[
                    styles.adjustmentCard,
                    !isValid && styles.adjustmentCardInvalid
                ]}>
                    <TouchableOpacity 
                        style={styles.cardHeader}
                        onPress={() => toggleExpand(adjustment.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeaderLeft}>
                            <Text style={styles.adjustmentNumber}>
                                {adjustment.name || `Rate Change #${index + 1}`}
                            </Text>
                            {!isExpanded && isComplete && (
                                <Text style={styles.adjustmentSummary}>
                                    {adjustment.newRate}% • {getMonthDisplay(adjustment.month)}
                                </Text>
                            )}
                        </View>
                        <View style={styles.cardHeaderRight}>
                            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    removeAdjustment(adjustment.id);
                                }}
                            >
                                <Text style={styles.removeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>

                    {isExpanded && (
                        <View style={styles.expandedContent}>
                            {!isValid && (
                                <View style={styles.validationWarning}>
                                    <Text style={styles.validationWarningText}>⚠️ Please complete all required fields with valid values (Rate: 0-30%, Month: 2+)</Text>
                                </View>
                            )}
                            <InputField
                                label="Adjustment Name"
                                value={adjustment.name || ""}
                                onChangeText={(value) => updateAdjustment(adjustment.id, "name", value)}
                                placeholder="e.g., ARM Reset, Refinance"
                            />

                            <InputField
                                label="New Interest Rate (%)"
                                value={adjustment.newRate}
                                onChangeText={(value) => updateAdjustment(adjustment.id, "newRate", value)}
                                placeholder="e.g., 5.5"
                                keyboardType="decimal-pad"
                            />

                            <View>
                                <Text style={styles.inputLabel}>Adjustment Month</Text>
                                <TouchableOpacity
                                    style={styles.monthPickerButton}
                                    onPress={() => setActiveMonthPicker(adjustment.id)}
                                >
                                    <Text style={styles.monthPickerText}>{getMonthDisplay(adjustment.month)}</Text>
                                </TouchableOpacity>
                                {activeMonthPicker === adjustment.id && (
                                    <DatePicker
                                        visible={true}
                                        value={getDateForMonth(adjustment.month)}
                                        onChange={(event, date) => handleMonthChange(event, date, adjustment.id)}
                                        onClose={() => setActiveMonthPicker(null)}
                                        minimumDate={getMinDate()}
                                        maximumDate={getMaxDate()}
                                    />
                                )}
                            </View>
                        </View>
                    )}
                </View>
                );
            })}
        </View>
    );
});

export default RateAdjustmentList;

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
    },
    addButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
    adjustmentCard: {
        backgroundColor: theme.colors.gray50,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
    },
    adjustmentCardInvalid: {
        borderWidth: 2,
        borderColor: theme.colors.error,
        backgroundColor: '#fff5f5',
    },
    validationWarning: {
        backgroundColor: '#fff3cd',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
    },
    validationWarningText: {
        color: '#856404',
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.medium,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 0,
    },
    cardHeaderLeft: {
        flex: 1,
    },
    cardHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
    },
    adjustmentNumber: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    adjustmentSummary: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    expandIcon: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    expandedContent: {
        marginTop: theme.spacing.md,
    },
    removeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ffebee',
        alignItems: "center",
        justifyContent: "center",
    },
    removeButtonText: {
        color: theme.colors.error,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
    inputLabel: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
        color: theme.colors.textPrimary,
    },
    monthPickerButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    monthPickerText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 30,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        marginTop: 15,
        minWidth: 120,
        alignItems: 'center',
    },
    closeButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
});
