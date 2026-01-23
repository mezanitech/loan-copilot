// WEB-SPECIFIC VERSION - Early Payment List with Web Modal
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { createPortal } from "react-dom";
import { theme } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext.web";

export type EarlyPayment = {
    id: string;
    name?: string;
    type: "one-time" | "recurring";
    amount: string;
    month: string;
    date?: string;
    frequency?: string;
};

export const isValidEarlyPayment = (payment: EarlyPayment): boolean => {
    const amountNum = parseFloat(payment.amount);
    if (!payment.amount || isNaN(amountNum) || amountNum <= 0) {
        return false;
    }
    
    const monthNum = parseInt(payment.month);
    if (!payment.month || isNaN(monthNum) || monthNum < 1) {
        return false;
    }
    
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
    const [editingPayment, setEditingPayment] = useState<string | null>(null);
    const [draftPayment, setDraftPayment] = useState<EarlyPayment | null>(null);
    const { colors, mode } = useTheme();
    const styles = createStyles(colors, mode);
    
    useImperativeHandle(ref, () => ({
        collapseAll: () => setEditingPayment(null)
    }));
    
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (editingPayment && draftPayment && typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [editingPayment, draftPayment]);
    
    const addPayment = () => {
        const newPayment: EarlyPayment = {
            id: Date.now().toString(),
            name: "",
            type: "one-time",
            amount: "",
            month: "1",
        };
        setDraftPayment(newPayment);
        setEditingPayment(newPayment.id);
    };

    const removePayment = (id: string) => {
        if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this payment?')) {
            return;
        }
        onPaymentsChange(payments.filter(p => p.id !== id));
        if (editingPayment === id) {
            setEditingPayment(null);
            setDraftPayment(null);
        }
        if (onModalClose) {
            setTimeout(() => onModalClose(), 100);
        }
    };

    const openEditModal = (id: string) => {
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
        
        if (!isValid && (isDraft || payment)) {
            if (typeof window !== 'undefined' && !window.confirm('This payment is incomplete or invalid and will not be saved. Close anyway?')) {
                return;
            }
            if (isDraft) {
                setDraftPayment(null);
            }
            setEditingPayment(null);
            onModalClose?.();
            return;
        }
        
        if (payment && isValid && draftPayment) {
            const existingIndex = payments.findIndex(p => p.id === payment.id);
            if (existingIndex >= 0) {
                const updatedPayments = [...payments];
                updatedPayments[existingIndex] = payment;
                onPaymentsChange(updatedPayments);
            } else {
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
        if (draftPayment && id === draftPayment.id) {
            setDraftPayment({ ...draftPayment, [field]: value });
        }
    };

    const getMonthDisplay = (monthStr: string): string => {
        if (!monthStr) return "Select Month";
        const paymentMonth = parseInt(monthStr);
        if (isNaN(paymentMonth) || paymentMonth < 1) return "Select Month";
        
        const actualDate = new Date(
            loanStartDate.getFullYear(),
            loanStartDate.getMonth() + paymentMonth - 1,
            1
        );
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${monthNames[actualDate.getMonth()]} ${actualDate.getFullYear()} (Payment #${paymentMonth})`;
    };

    const getDateForMonth = (payment: EarlyPayment): Date => {
        // If we have a stored date, use it to preserve the exact day
        if (payment.date) {
            const [year, month, day] = payment.date.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        
        // Fallback: calculate from payment month (will use 1st of month)
        const paymentMonth = parseInt(payment.month) || 1;
        const actualDate = new Date(
            loanStartDate.getFullYear(),
            loanStartDate.getMonth() + paymentMonth - 1,
            1
        );
        return actualDate;
    };

    const getDateInputValue = (payment: EarlyPayment): string => {
        const date = getDateForMonth(payment);
        if (!date || isNaN(date.getTime())) {
            const defaultDate = new Date(loanStartDate);
            return `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-${String(defaultDate.getDate()).padStart(2, '0')}`;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateChange = (dateString: string, paymentId: string) => {
        if (!dateString) return;
        
        const selectedDate = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone issues
        if (isNaN(selectedDate.getTime())) return;
        
        // Calculate which payment month this date corresponds to
        // First payment is 1 month after loan start, so we don't add 1
        const monthsDiff = (selectedDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
                          (selectedDate.getMonth() - loanStartDate.getMonth());
        
        // Payment number is the number of months from start + 1
        const paymentNumber = monthsDiff + 1;
        
        // Store both the month number and the exact date
        if (draftPayment && paymentId === draftPayment.id) {
            setDraftPayment({
                ...draftPayment,
                month: paymentNumber.toString(),
                date: dateString // Store in YYYY-MM-DD format
            });
        }
    };

    const getMinDate = (): string => {
        const minDate = new Date(
            loanStartDate.getFullYear(),
            loanStartDate.getMonth(),
            1
        );
        return `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;
    };

    const getMaxDate = (): string => {
        const maxDate = new Date(
            loanStartDate.getFullYear(),
            loanStartDate.getMonth() + loanTermInMonths - 1,
            1
        );
        // Set to last day of the month
        maxDate.setMonth(maxDate.getMonth() + 1, 0);
        return `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.list}>
                {payments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No early payments added yet</Text>
                    </View>
                ) : (
                    payments.map((payment) => (
                        <View key={payment.id} style={styles.paymentCard}>
                            <View style={styles.paymentHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.paymentName}>
                                        {payment.name || `${payment.type === 'recurring' ? 'Recurring' : 'One-time'} Payment`}
                                    </Text>
                                    <Text style={styles.paymentDetails}>
                                        ${parseFloat(payment.amount || '0').toFixed(2)} • {getMonthDisplay(payment.month)}
                                        {payment.type === 'recurring' && payment.frequency && ` • Every ${payment.frequency} month${parseInt(payment.frequency) > 1 ? 's' : ''}`}
                                    </Text>
                                </View>
                                <View style={styles.paymentActions}>
                                    <TouchableOpacity onPress={() => openEditModal(payment.id)} style={styles.actionButton}>
                                        <Text style={styles.actionButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removePayment(payment.id)} style={[styles.actionButton, styles.deleteButton]}>
                                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addPayment}>
                <Text style={styles.addButtonText}>+ Add Payment</Text>
            </TouchableOpacity>

            {/* Web Modal */}
            {editingPayment && draftPayment && typeof document !== 'undefined' && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        overflow: 'auto',
                        padding: '20px',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: 12,
                            width: '100%',
                            maxWidth: 600,
                            maxHeight: 'calc(100vh - 40px)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: `1px solid ${colors.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0,
                        }}>
                            <h2 style={{ 
                                margin: 0, 
                                fontSize: 20, 
                                fontWeight: '600', 
                                color: colors.textPrimary,
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            }}>
                                {payments.find(p => p.id === editingPayment) ? 'Edit Payment' : 'Add Payment'}
                            </h2>
                            <button
                                onClick={closeModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: 24,
                                    cursor: 'pointer',
                                    color: colors.textSecondary,
                                    padding: 4,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ 
                            padding: 24, 
                            overflowY: 'auto', 
                            flex: 1,
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        }}>
                            <View style={styles.modalField}>
                                <Text style={styles.modalLabel}>Name (Optional)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={draftPayment.name || ''}
                                    onChangeText={(text) => updatePayment(draftPayment.id, 'name', text)}
                                    placeholder="e.g., Tax Refund, Bonus Payment"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>

                            <View style={styles.modalField}>
                                <Text style={styles.modalLabel}>Payment Type</Text>
                                <View style={styles.segmentControl}>
                                    <TouchableOpacity
                                        style={[
                                            styles.segmentButton,
                                            draftPayment.type === 'one-time' && styles.segmentButtonActive
                                        ]}
                                        onPress={() => updatePayment(draftPayment.id, 'type', 'one-time')}
                                    >
                                        <Text style={[
                                            styles.segmentButtonText,
                                            draftPayment.type === 'one-time' && styles.segmentButtonTextActive
                                        ]}>One-time</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.segmentButton,
                                            draftPayment.type === 'recurring' && styles.segmentButtonActive
                                        ]}
                                        onPress={() => updatePayment(draftPayment.id, 'type', 'recurring')}
                                    >
                                        <Text style={[
                                            styles.segmentButtonText,
                                            draftPayment.type === 'recurring' && styles.segmentButtonTextActive
                                        ]}>Recurring</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.modalField}>
                                <Text style={styles.modalLabel}>Amount</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={draftPayment.amount}
                                    onChangeText={(text) => updatePayment(draftPayment.id, 'amount', text)}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            {draftPayment.type === 'one-time' && (
                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Payment Date</Text>
                                    <input
                                        type="date"
                                        style={{
                                            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.background,
                                            borderWidth: 1,
                                            borderStyle: 'solid',
                                            borderColor: colors.border,
                                            borderRadius: 8,
                                            padding: 12,
                                            fontSize: 14,
                                            color: colors.textPrimary,
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                            width: '100%',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                        value={getDateInputValue(draftPayment)}
                                        onChange={(e) => handleDateChange(e.target.value, draftPayment.id)}
                                        min={getMinDate()}
                                        max={getMaxDate()}
                                    />
                                    <Text style={styles.modalHint}>
                                        {getMonthDisplay(draftPayment.month)}
                                    </Text>
                                </View>
                            )}

                            {draftPayment.type === 'recurring' && (
                                <>
                                    <View style={styles.modalField}>
                                        <Text style={styles.modalLabel}>Starting Date</Text>
                                        <input
                                            type="date"
                                            style={{
                                                backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.background,
                                                borderWidth: 1,
                                                borderStyle: 'solid',
                                                borderColor: colors.border,
                                                borderRadius: 8,
                                                padding: 12,
                                                fontSize: 14,
                                                color: colors.textPrimary,
                                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                                width: '100%',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                            value={getDateInputValue(draftPayment)}
                                            onChange={(e) => handleDateChange(e.target.value, draftPayment.id)}
                                            min={getMinDate()}
                                            max={getMaxDate()}
                                        />
                                        <Text style={styles.modalHint}>
                                            {getMonthDisplay(draftPayment.month)}
                                        </Text>
                                    </View>
                                    <View style={styles.modalField}>
                                        <Text style={styles.modalLabel}>Frequency (Every X Months)</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={draftPayment.frequency || ''}
                                        onChangeText={(text) => updatePayment(draftPayment.id, 'frequency', text)}
                                        placeholder="1"
                                        placeholderTextColor={colors.textTertiary}
                                        keyboardType="number-pad"
                                    />
                                        <Text style={styles.modalHint}>
                                            Payment will repeat every {draftPayment.frequency || '1'} month{parseInt(draftPayment.frequency || '1') > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: `1px solid ${colors.border}`,
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'flex-end',
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={closeModal}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: `1px solid ${colors.border}`,
                                    backgroundColor: 'transparent',
                                    color: colors.textPrimary,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: '600',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={closeModal}
                                disabled={!isValidEarlyPayment(draftPayment)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    backgroundColor: isValidEarlyPayment(draftPayment) ? colors.primary : colors.border,
                                    color: 'white',
                                    cursor: isValidEarlyPayment(draftPayment) ? 'pointer' : 'not-allowed',
                                    fontSize: 14,
                                    fontWeight: '600',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                    opacity: isValidEarlyPayment(draftPayment) ? 1 : 0.5,
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </View>
    );
});

const createStyles = (colors: any, mode: string) => StyleSheet.create({
    container: {
        marginTop: 12,
    },
    list: {
        gap: 12,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    paymentCard: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
    },
    paymentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    paymentName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    paymentDetails: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    paymentActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    deleteButton: {
        backgroundColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
        borderColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
    },
    deleteButtonText: {
        color: mode === 'dark' ? '#f87171' : '#dc2626',
    },
    addButton: {
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    modalField: {
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: colors.textPrimary,
    },
    modalHint: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 6,
    },
    segmentControl: {
        flexDirection: 'row',
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.backgroundSecondary,
        borderRadius: 8,
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentButtonActive: {
        backgroundColor: colors.primary,
    },
    segmentButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    segmentButtonTextActive: {
        color: 'white',
    },
});

export default EarlyPaymentList;
