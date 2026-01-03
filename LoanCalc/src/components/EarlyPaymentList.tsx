import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from "react-native";
import { useState } from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import InputField from "./InputField";

export type EarlyPayment = {
    id: string;
    name?: string;
    type: "one-time" | "recurring";
    amount: string;
    month: string; // Payment month for one-time, starting month for recurring
    frequency?: string; // Only for recurring: every X months (1, 2, 3, etc.)
};

type EarlyPaymentListProps = {
    payments: EarlyPayment[];
    onPaymentsChange: (payments: EarlyPayment[]) => void;
    loanStartDate: Date;
};

export default function EarlyPaymentList({ payments, onPaymentsChange, loanStartDate }: EarlyPaymentListProps) {
    const [activeMonthPicker, setActiveMonthPicker] = useState<string | null>(null);
    const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
    
    const addPayment = () => {
        const newPayment: EarlyPayment = {
            id: Date.now().toString(),
            name: "",
            type: "one-time",
            amount: "",
            month: "",
        };
        onPaymentsChange([...payments, newPayment]);
        // Auto-expand newly added payment
        setExpandedPayments(new Set([...expandedPayments, newPayment.id]));
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
            updatePayment(paymentId, "month", totalMonthDiff.toString());
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
                
                return (
                <View key={payment.id} style={styles.paymentCard}>
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
                                    ${payment.amount} • {payment.type === "one-time" ? getMonthDisplay(payment.month) : `Every ${payment.frequency || 1} month(s) from ${getMonthDisplay(payment.month)}`}
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
                                label="Frequency (every X months)"
                                value={payment.frequency || ""}
                                onChangeText={(value) => updatePayment(payment.id, "frequency", value)}
                                placeholder="e.g., 1 = monthly, 2 = every 2 months"
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
}

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
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
    },
    addButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    paymentCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
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
        gap: 12,
    },
    paymentNumber: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    paymentSummary: {
        fontSize: 13,
        color: "#666",
        marginTop: 2,
    },
    expandIcon: {
        fontSize: 12,
        color: "#666",
    },
    expandedContent: {
        marginTop: 12,
    },
    removeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#ffebee",
        alignItems: "center",
        justifyContent: "center",
    },
    removeButtonText: {
        color: "#FF3B30",
        fontSize: 14,
        fontWeight: "600",
    },
    typeToggle: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 12,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        alignItems: "center",
    },
    toggleButtonActive: {
        backgroundColor: "#007AFF",
    },
    toggleText: {
        fontSize: 14,
        color: "#333",
    },
    toggleTextActive: {
        color: "#fff",
        fontWeight: "600",
    },    inputLabel: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        marginTop: 12,
        color: "#333",
    },
    monthPickerButton: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e9ecef",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    monthPickerText: {
        fontSize: 16,
        color: "#333",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    datePickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 15,
        minWidth: 120,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
