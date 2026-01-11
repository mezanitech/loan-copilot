import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useState, forwardRef, useImperativeHandle } from "react";
import InputField from "./InputField";
import DatePicker from "./DatePicker";
import EditModal from "./EditModal";
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
    onModalClose?: () => void;
    loanStartDate: Date;
    loanTermInMonths: number;
};

export type EarlyPaymentListRef = {
    collapseAll: () => void;
};

const EarlyPaymentList = forwardRef<EarlyPaymentListRef, EarlyPaymentListProps>(
    ({ payments, onPaymentsChange, onModalClose, loanStartDate, loanTermInMonths }, ref) => {
    const [activeMonthPicker, setActiveMonthPicker] = useState<string | null>(null);
    const [editingPayment, setEditingPayment] = useState<string | null>(null);
    const [draftPayment, setDraftPayment] = useState<EarlyPayment | null>(null);
    
    useImperativeHandle(ref, () => ({
        collapseAll: () => setEditingPayment(null)
    }));
    
    const addPayment = () => {
        const newPayment: EarlyPayment = {
            id: Date.now().toString(),
            name: "",
            type: "one-time",
            amount: "",
            month: "1", // Default to first payment month
        };
        setDraftPayment(newPayment);
        // Open modal for the new payment
        setEditingPayment(newPayment.id);
    };

    const removePayment = (id: string) => {
        onPaymentsChange(payments.filter(p => p.id !== id));
        // Close modal if this payment was being edited
        if (editingPayment === id) {
            setEditingPayment(null);
            setDraftPayment(null);
        }
        // Trigger save after deletion
        if (onModalClose) {
            setTimeout(() => onModalClose(), 100);
        }
    };

    const openEditModal = (id: string) => {
        // Create a draft copy of the existing payment
        const paymentToEdit = payments.find(p => p.id === id);
        if (paymentToEdit) {
            setDraftPayment({ ...paymentToEdit });
        }
        setEditingPayment(id);
    };

    const closeModal = () => {
        const payment = getCurrentPayment();
        const isDraft = draftPayment && editingPayment === draftPayment.id;
        const isValid = payment && isValidEarlyPayment(payment);
        
        // If invalid/incomplete, warn user
        if (!isValid && (isDraft || payment)) {
            Alert.alert(
                'Incomplete Payment',
                'This payment is incomplete or invalid and will not be saved. Are you sure you want to close?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Close Anyway', 
                        style: 'destructive',
                        onPress: () => {
                            if (isDraft) {
                                setDraftPayment(null);
                            }
                            setEditingPayment(null);
                            onModalClose?.();
                        }
                    }
                ]
            );
            return;
        }
        
        // Apply the draft changes
        if (payment && isValid && draftPayment) {
            // Check if this is a new payment or editing existing
            const existingIndex = payments.findIndex(p => p.id === payment.id);
            if (existingIndex >= 0) {
                // Update existing payment
                const updatedPayments = [...payments];
                updatedPayments[existingIndex] = payment;
                onPaymentsChange(updatedPayments);
            } else {
                // Add new payment
                onPaymentsChange([...payments, payment]);
            }
        }
        setDraftPayment(null);
        setEditingPayment(null);
        onModalClose?.();
    };

    const getCurrentPayment = (): EarlyPayment | undefined => {
        if (draftPayment && editingPayment === draftPayment.id) {
            return draftPayment;
        }
        return payments.find(p => p.id === editingPayment);
    };

    const updatePayment = (id: string, field: keyof EarlyPayment, value: string) => {
        // Always update the draft state (both for new and existing payments)
        if (draftPayment && id === draftPayment.id) {
            setDraftPayment({ ...draftPayment, [field]: value });
        }
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
        const actualDate = new Date(loanStartDate.getTime()); // Proper clone
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = monthNames[actualDate.getMonth()];
        const year = actualDate.getFullYear();
        
        return `${monthName} ${year} (Payment #${paymentMonth})`;
    };

    const getDateForMonth = (monthStr: string): Date => {
        const paymentMonth = parseInt(monthStr) || 1;
        // Calculate actual date from loan start date and payment month
        const actualDate = new Date(loanStartDate.getTime()); // Proper clone
        actualDate.setMonth(actualDate.getMonth() + paymentMonth - 1);
        return actualDate;
    };

    const getMinDate = (): Date => {
        // First payment date (one month after loan start)
        const minDate = new Date(loanStartDate.getTime()); // Proper clone
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
                <Text style={styles.title}>Early Payments</Text>
                <TouchableOpacity style={styles.addButton} onPress={addPayment}>
                    <Text style={styles.addButtonText}>+ Add Payment</Text>
                </TouchableOpacity>
            </View>

            {/* Payment cards - click to open modal */}
            {payments.map((payment, index) => {
                const isComplete = payment.name && payment.amount && payment.month;
                const isValid = isValidEarlyPayment(payment);
                
                return (
                <TouchableOpacity 
                    key={payment.id}
                    style={[
                        styles.paymentCard,
                        !isValid && styles.paymentCardInvalid
                    ]}
                    onPress={() => openEditModal(payment.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.paymentNumber}>
                            {payment.name || `Payment #${index + 1}`}
                        </Text>
                        {isComplete && (
                            <Text style={styles.paymentSummary}>
                                ${payment.amount} • {payment.type === "one-time" ? getMonthDisplay(payment.month) : `Every ${payment.frequency} month(s) from ${getMonthDisplay(payment.month)}`}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
                );
            })}

            {/* Edit Payment Modal */}
            {editingPayment && (() => {
                const payment = getCurrentPayment();
                if (!payment) return null;
                const isValid = isValidEarlyPayment(payment);
                
                return (
                    <EditModal
                        visible={true}
                        onClose={closeModal}
                        title={payment.name || 'Edit Payment'}
                        variant="centered"
                        footer={
                            <>
                                {payments.some(p => p.id === payment.id) && (
                                    <TouchableOpacity 
                                        style={styles.deleteButton}
                                        onPress={() => {
                                            Alert.alert(
                                                'Delete Payment',
                                                'Are you sure you want to delete this payment?',
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { 
                                                        text: 'Delete', 
                                                        style: 'destructive',
                                                        onPress: () => {
                                                            removePayment(payment.id);
                                                        }
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity 
                                    style={styles.doneButton}
                                    onPress={closeModal}
                                >
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </>
                        }
                    >
                        <>
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
                                                <DatePicker
                                                    visible={true}
                                                    value={getDateForMonth(payment.month)}
                                                    onChange={(event, date) => handleMonthChange(event, date, payment.id)}
                                                    onClose={() => setActiveMonthPicker(null)}
                                                />
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
                                                    <DatePicker
                                                        visible={true}
                                                        value={getDateForMonth(payment.month)}
                                                        onChange={(event, date) => handleMonthChange(event, date, payment.id)}
                                                        onClose={() => setActiveMonthPicker(null)}
                                                    />
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
                        </>
                    </EditModal>
                );
            })()}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    cardHeaderLeft: {
        flex: 1,
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
    // Modal footer button styles (used by EditModal footer prop)
    deleteButton: {
        flex: 1,
        backgroundColor: theme.colors.error,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    deleteButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    doneButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    doneButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
});
