import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from "react-native";
import { useState, forwardRef, useImperativeHandle } from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import InputField from "./InputField";
import { theme } from "../constants/theme";

export type EarlyPayment = {
    id: string;
    name?: string;
    type: "one-time" | "recurring";
    amount: string;
    month: string; // Payment month for one-time, starting month for recurring
    frequency?: string; // Only for recurring: every X months (1, 2, 3, etc.)
};

// Validation helper
export const isValidEarlyPayment = (payment: EarlyPayment): boolean => {
    // Amount must be a valid positive number
    const amountNum = parseFloat(payment.amount);
    if (!payment.amount || isNaN(amountNum) || amountNum <= 0) {
        return false;
    }
    
    // Month must be a valid positive number
    const monthNum = parseInt(payment.month);
    if (!payment.month || isNaN(monthNum) || monthNum < 1) {
        return false;
    }
    
    // For recurring payments, frequency is required and must be valid
    if (payment.type === 'recurring') {
        if (!payment.frequency) {
            return false;
        }
        const freqNum = parseInt(payment.frequency);
        if (isNaN(freqNum) || freqNum < 1) {
            return false;
        }
    }
    
    return true;
};

type EarlyPaymentListProps = {
    payments: EarlyPayment[];
    onPaymentsChange: (payments: EarlyPayment[]) => void;
    loanStartDate: Date;
    loanTermInMonths: number;
};

export type EarlyPaymentListRef = {
    collapseAll: () => void;
};

const EarlyPaymentList = forwardRef<EarlyPaymentListRef, EarlyPaymentListProps>(
    ({ payments, onPaymentsChange, loanStartDate, loanTermInMonths }, ref) => {
    const [activeMonthPicker, setActiveMonthPicker] = useState<string | null>(null);
    const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
    
    useImperativeHandle(ref, () => ({
        collapseAll: () => setExpandedPayments(new Set())
    }));
    
    const addPayment = () => {
        const newPayment: EarlyPayment = {
            id: Date.now().toString(),
            name: "",
            type: "one-time",
            amount: "",
            month: "1", // Default to first payment month
        };
        onPaymentsChange([...payments, newPayment]);
        // Collapse all existing payments and expand only the new one
        setExpandedPayments(new Set([newPayment.id]));
    };

    const removePayment = (id: string) => {
        onPaymentsChange(payments.filter(p => p.id !== id));
        // Remove from expanded set
        const newExpanded = new Set(expandedPayments);
        newExpanded.delete(id);
        setExpandedPayments(newExpanded);
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedPayments);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedPayments(newExpanded);
    };

    const updatePayment = (id: string, field: keyof EarlyPayment, value: string) => {
        onPaymentsChange(
            payments.map(p => p.id === id ? { ...p, [field]: value } : p)
        );
    };

    const handleMonthChange = (event: any, selectedDate: Date | undefined, paymentId: string) => {
        if (selectedDate) {
            // Calculate the payment month number based on loan start date
            const yearDiff = selectedDate.getFullYear() - loanStartDate.getFullYear();
            const monthDiff = selectedDate.getMonth() - loanStartDate.getMonth();
            const totalMonthDiff = (yearDiff * 12) + monthDiff + 1; // +1 because first payment is month 1
            
            // Restrict to valid payment months (1 to loanTermInMonths)
            if (totalMonthDiff >= 1 && totalMonthDiff <= loanTermInMonths) {
                updatePayment(paymentId, "month", totalMonthDiff.toString());
            }
        }
    };

    const getMonthDisplay = (monthStr: string): string => {
        if (!monthStr) return "Select Month";
        const paymentMonth = parseInt(monthStr);
        if (isNaN(paymentMonth) || paymentMonth < 1) return "Select Month";
        
        // Calculate the actual date from payment month and loan start date
        const actualDate = new Date(loanStartDate);
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = monthNames[actualDate.getMonth()];
        const year = actualDate.getFullYear();
        
        return `${monthName} ${year} (Payment #${paymentMonth})`;
    };

    const getDateForMonth = (monthStr: string): Date => {
        const paymentMonth = parseInt(monthStr) || 1;
        // Calculate actual date from loan start date and payment month
        const actualDate = new Date(loanStartDate);
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        return actualDate;
    };

    const getMinDate = (): Date => {
        // First payment date (one month after loan start)
        const minDate = new Date(loanStartDate);
        return minDate;
    };

    const getMaxDate = (): Date => {
        // Last payment date
        const maxDate = new Date(loanStartDate);
        maxDate.setMonth(maxDate.getMonth() + loanTermInMonths - 1);
        return maxDate;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Early Payments</Text>
                <TouchableOpacity style={styles.addButton} onPress={addPayment}>
                    <Text style={styles.addButtonText}>+ Add Payment</Text>
                </TouchableOpacity>
            </View>

            {payments.map((payment, index) => {
                const isExpanded = expandedPayments.has(payment.id);
                const isComplete = payment.name && payment.amount && payment.month;
                const isValid = isValidEarlyPayment(payment);
                
                return (
                <View key={payment.id} style={[
                    styles.paymentCard,
                    !isValid && styles.paymentCardInvalid
                ]}>
                    <TouchableOpacity 
                        style={styles.cardHeader}
                        onPress={() => toggleExpand(payment.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeaderLeft}>
                            <Text style={styles.paymentNumber}>
                                {payment.name || `Payment #${index + 1}`}
                            </Text>
                            {!isExpanded && isComplete && (
                                <Text style={styles.paymentSummary}>
                                    ${payment.amount} • {payment.type === "one-time" ? getMonthDisplay(payment.month) : `Every ${payment.frequency} month(s) from ${getMonthDisplay(payment.month)}`}
                                </Text>
                            )}
                        </View>
                        <View style={styles.cardHeaderRight}>
                            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    removePayment(payment.id);
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
                                    <Text style={styles.validationWarningText}>⚠️ Please complete all required fields with valid values</Text>
                                </View>
                            )}
                            <InputField
                                label="Payment Name"
                                value={payment.name || ""}
                                onChangeText={(value) => updatePayment(payment.id, "name", value)}
                                placeholder="e.g., Year-end Bonus, Tax Refund"
                            />

                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.toggleButton, payment.type === "one-time" && styles.toggleButtonActive]}
                            onPress={() => updatePayment(payment.id, "type", "one-time")}
                        >
                            <Text style={[styles.toggleText, payment.type === "one-time" && styles.toggleTextActive]}>
                                One-Time
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, payment.type === "recurring" && styles.toggleButtonActive]}
                            onPress={() => updatePayment(payment.id, "type", "recurring")}
                        >
                            <Text style={[styles.toggleText, payment.type === "recurring" && styles.toggleTextActive]}>
                                Recurring
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <InputField
                        label="Amount"
                        value={payment.amount}
                        onChangeText={(value) => updatePayment(payment.id, "amount", value)}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                        formatNumber={true}
                    />

                    {payment.type === "one-time" && (
                        <View>
                            <Text style={styles.inputLabel}>Payment Month</Text>
                            <TouchableOpacity
                                style={styles.monthPickerButton}
                                onPress={() => setActiveMonthPicker(payment.id)}
                            >
                                <Text style={styles.monthPickerText}>{getMonthDisplay(payment.month)}</Text>
                            </TouchableOpacity>
                            {activeMonthPicker === payment.id && (
                                <Modal
                                    visible={true}
                                    transparent={true}
                                    animationType="fade"
                                    onRequestClose={() => setActiveMonthPicker(null)}
                                >
                                    <TouchableOpacity 
                                        style={styles.modalOverlay}
                                        activeOpacity={1}
                                        onPress={() => setActiveMonthPicker(null)}
                                    >
                                        <View style={styles.datePickerContainer}>
                                            <DateTimePicker
                                                value={getDateForMonth(payment.month)}
                                                mode="date"
                                                display="spinner"
                                                onChange={(event, date) => handleMonthChange(event, date, payment.id)}
                                                textColor={theme.colors.textPrimary}
                                                themeVariant="light"
                                                minimumDate={getMinDate()}
                                                maximumDate={getMaxDate()}
                                            />
                                            <TouchableOpacity 
                                                style={styles.closeButton}
                                                onPress={() => setActiveMonthPicker(null)}
                                            >
                                                <Text style={styles.closeButtonText}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                </Modal>
                            )}
                        </View>
                    )}

                    {payment.type === "recurring" && (
                        <>
                            <View>
                                <Text style={styles.inputLabel}>Starting Month</Text>
                                <TouchableOpacity
                                    style={styles.monthPickerButton}
                                    onPress={() => setActiveMonthPicker(payment.id)}
                                >
                                    <Text style={styles.monthPickerText}>{getMonthDisplay(payment.month)}</Text>
                                </TouchableOpacity>
                                {activeMonthPicker === payment.id && (
                                    <Modal
                                        visible={true}
                                        transparent={true}
                                        animationType="fade"
                                        onRequestClose={() => setActiveMonthPicker(null)}
                                    >
                                        <TouchableOpacity 
                                            style={styles.modalOverlay}
                                            activeOpacity={1}
                                            onPress={() => setActiveMonthPicker(null)}
                                        >
                                            <View style={styles.datePickerContainer}>
                                                <DateTimePicker
                                                    value={getDateForMonth(payment.month)}
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={(event, date) => handleMonthChange(event, date, payment.id)}
                                                    textColor={theme.colors.textPrimary}
                                                    themeVariant="light"
                                                    minimumDate={getMinDate()}
                                                    maximumDate={getMaxDate()}
                                                />
                                                <TouchableOpacity 
                                                    style={styles.closeButton}
                                                    onPress={() => setActiveMonthPicker(null)}
                                                >
                                                    <Text style={styles.closeButtonText}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </TouchableOpacity>
                                    </Modal>
                                )}
                            </View>
                            <InputField
                                label="Frequency (Every X months)"
                                value={payment.frequency || ""}
                                onChangeText={(value) => updatePayment(payment.id, "frequency", value)}
                                placeholder="e.g., 1 (monthly), 2 (bi-monthly), 3 (quarterly)"
                                keyboardType="numeric"
                            />
                        </>
                    )}
                        </View>
                    )}
                </View>
                );
            })}
        </View>
    );
});

export default EarlyPaymentList;

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
    paymentCard: {
        backgroundColor: theme.colors.gray50,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
    },
    paymentCardInvalid: {
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
    paymentNumber: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    paymentSummary: {
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
    typeToggle: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: theme.colors.gray300,
        borderRadius: theme.borderRadius.sm,
        overflow: "hidden",
        marginBottom: theme.spacing.md,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        alignItems: "center",
    },
    toggleButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textPrimary,
    },
    toggleTextActive: {
        color: theme.colors.textInverse,
        fontWeight: theme.fontWeight.semibold,
    },    inputLabel: {
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
