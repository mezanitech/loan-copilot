// WEB-SPECIFIC VERSION - Rate Adjustment List with Web Modal
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { createPortal } from "react-dom";
import { theme } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext.web";

export type RateAdjustment = {
    id: string;
    name?: string;
    month: string;
    date?: string;
    newRate: string;
};

export const isValidRateAdjustment = (adjustment: RateAdjustment, loanTermInMonths: number): boolean => {
    const rateNum = parseFloat(adjustment.newRate);
    if (!adjustment.newRate || isNaN(rateNum) || rateNum < 0 || rateNum > 30) {
        return false;
    }
    
    const monthNum = parseInt(adjustment.month);
    if (!adjustment.month || isNaN(monthNum) || monthNum < 2 || monthNum > loanTermInMonths) {
        return false;
    }
    
    return true;
};

type RateAdjustmentListProps = {
    adjustments: RateAdjustment[];
    onAdjustmentsChange: (adjustments: RateAdjustment[]) => void;
    onModalClose?: () => void;
    loanStartDate: Date;
    loanTermInMonths: number;
};

export type RateAdjustmentListRef = {
    collapseAll: () => void;
};

const RateAdjustmentList = forwardRef<RateAdjustmentListRef, RateAdjustmentListProps>(
    ({ adjustments, onAdjustmentsChange, onModalClose, loanStartDate, loanTermInMonths }, ref) => {
    const [editingAdjustment, setEditingAdjustment] = useState<string | null>(null);
    const [draftAdjustment, setDraftAdjustment] = useState<RateAdjustment | null>(null);
    const { colors, mode } = useTheme();
    const styles = createStyles(colors, mode);
    
    useImperativeHandle(ref, () => ({
        collapseAll: () => setEditingAdjustment(null)
    }));
    
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (editingAdjustment && draftAdjustment && typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [editingAdjustment, draftAdjustment]);
    
    const isMonthUsed = (month: string, excludeId?: string): boolean => {
        return adjustments.some(adj => adj.month === month && adj.id !== excludeId);
    };

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
            month: "2",
            newRate: "",
        };
        setDraftAdjustment(newAdjustment);
        setEditingAdjustment(newAdjustment.id);
    };

    const removeAdjustment = (id: string) => {
        if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this rate adjustment?')) {
            return;
        }
        onAdjustmentsChange(adjustments.filter(a => a.id !== id));
        if (editingAdjustment === id) {
            setEditingAdjustment(null);
            setDraftAdjustment(null);
        }
        if (onModalClose) {
            setTimeout(() => onModalClose(), 100);
        }
    };

    const openEditModal = (id: string) => {
        const adjustmentToEdit = adjustments.find(a => a.id === id);
        if (adjustmentToEdit) {
            setDraftAdjustment({ ...adjustmentToEdit });
        }
        setEditingAdjustment(id);
    };

    const closeModal = () => {
        const adjustment = getCurrentAdjustment();
        const isDraft = draftAdjustment && editingAdjustment === draftAdjustment.id;
        const isValid = adjustment && isValidRateAdjustment(adjustment, loanTermInMonths);
        
        if (!isValid && (isDraft || adjustment)) {
            if (typeof window !== 'undefined' && !window.confirm('This rate adjustment is incomplete or invalid and will not be saved. Close anyway?')) {
                return;
            }
            if (isDraft) {
                setDraftAdjustment(null);
            }
            setEditingAdjustment(null);
            onModalClose?.();
            return;
        }
        
        if (adjustment && isValid && draftAdjustment) {
            const existingIndex = adjustments.findIndex(a => a.id === adjustment.id);
            if (existingIndex >= 0) {
                const updatedAdjustments = [...adjustments];
                updatedAdjustments[existingIndex] = adjustment;
                const sortedAdjustments = sortAdjustments(updatedAdjustments);
                onAdjustmentsChange(sortedAdjustments);
            } else {
                const sortedAdjustments = sortAdjustments([...adjustments, adjustment]);
                onAdjustmentsChange(sortedAdjustments);
            }
        }
        setDraftAdjustment(null);
        setEditingAdjustment(null);
        onModalClose?.();
    };

    const getCurrentAdjustment = (): RateAdjustment | undefined => {
        if (draftAdjustment && editingAdjustment === draftAdjustment.id) {
            return draftAdjustment;
        }
        return adjustments.find(a => a.id === editingAdjustment);
    };

    const updateAdjustment = (id: string, field: keyof RateAdjustment, value: string) => {
        if (draftAdjustment && id === draftAdjustment.id) {
            if (field === 'month') {
                if (isMonthUsed(value, id)) {
                    if (typeof window !== 'undefined') {
                        window.alert('This month already has a rate adjustment. Please choose a different month.');
                    }
                    return;
                }
            }
            setDraftAdjustment({ ...draftAdjustment, [field]: value });
        }
    };

    const getMonthDisplay = (monthStr: string): string => {
        if (!monthStr) return "Select Month";
        const adjustmentMonth = parseInt(monthStr);
        if (isNaN(adjustmentMonth) || adjustmentMonth < 2) return "Select Month";
        
        const actualDate = new Date(
            loanStartDate.getFullYear(),
            loanStartDate.getMonth() + adjustmentMonth - 1,
            1
        );
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${monthNames[actualDate.getMonth()]} ${actualDate.getFullYear()} (Payment #${adjustmentMonth})`;
    };

    const getDateForMonth = (adjustment: RateAdjustment): Date => {
        // If we have a stored date, use it to preserve the exact day
        if (adjustment.date) {
            const [year, month, day] = adjustment.date.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        
        // Fallback: calculate from adjustment month (will use 1st of month)
        const adjustmentMonth = parseInt(adjustment.month) || 2;
        const actualDate = new Date(
            loanStartDate.getFullYear(),
            loanStartDate.getMonth() + adjustmentMonth - 1,
            1
        );
        return actualDate;
    };

    const getDateInputValue = (adjustment: RateAdjustment): string => {
        const date = getDateForMonth(adjustment);
        if (!date || isNaN(date.getTime())) {
            const defaultDate = new Date(loanStartDate);
            defaultDate.setMonth(defaultDate.getMonth() + 1); // Default to month 2
            return `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-${String(defaultDate.getDate()).padStart(2, '0')}`;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateChange = (dateString: string, adjustmentId: string) => {
        if (!dateString) return;
        
        const selectedDate = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone issues
        if (isNaN(selectedDate.getTime())) return;
        
        // Calculate which payment month this date corresponds to
        // First payment is 1 month after loan start, so we don't add 1
        const monthsDiff = (selectedDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
                          (selectedDate.getMonth() - loanStartDate.getMonth());
        
        // Payment number is the number of months from start + 1
        const paymentNumber = monthsDiff + 1;
        
        // Check if this month is already used (excluding current adjustment)
        if (isMonthUsed(paymentNumber.toString(), adjustmentId)) {
            if (typeof window !== 'undefined') {
                window.alert('This month already has a rate adjustment. Please choose a different month.');
            }
            return;
        }
        
        // Store both the month number and the exact date
        if (draftAdjustment && adjustmentId === draftAdjustment.id) {
            setDraftAdjustment({
                ...draftAdjustment,
                month: paymentNumber.toString(),
                date: dateString // Store in YYYY-MM-DD format
            });
        }
    };

    const getMinDate = (): string => {
        // Rate adjustments must start from payment month 2
        const minDate = new Date(
            loanStartDate.getFullYear(),
            loanStartDate.getMonth() + 1, // +1 for month 2
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
                {adjustments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No rate adjustments added yet</Text>
                    </View>
                ) : (
                    sortAdjustments(adjustments).map((adjustment) => (
                        <View key={adjustment.id} style={styles.adjustmentCard}>
                            <View style={styles.adjustmentHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.adjustmentName}>
                                        {adjustment.name || `Rate Change`}
                                    </Text>
                                    <Text style={styles.adjustmentDetails}>
                                        {parseFloat(adjustment.newRate || '0').toFixed(2)}% APR • {getMonthDisplay(adjustment.month)}
                                    </Text>
                                </View>
                                <View style={styles.adjustmentActions}>
                                    <TouchableOpacity onPress={() => openEditModal(adjustment.id)} style={styles.actionButton}>
                                        <Text style={styles.actionButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeAdjustment(adjustment.id)} style={[styles.actionButton, styles.deleteButton]}>
                                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addAdjustment}>
                <Text style={styles.addButtonText}>+ Add Rate Change</Text>
            </TouchableOpacity>

            {/* Web Modal */}
            {editingAdjustment && draftAdjustment && typeof document !== 'undefined' && createPortal(
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
                                {adjustments.find(a => a.id === editingAdjustment) ? 'Edit Rate Change' : 'Add Rate Change'}
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
                                    value={draftAdjustment.name || ''}
                                    onChangeText={(text) => updateAdjustment(draftAdjustment.id, 'name', text)}
                                    placeholder="e.g., Refinance, ARM Adjustment"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>

                            <View style={styles.modalField}>
                                <Text style={styles.modalLabel}>New Interest Rate (%)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={draftAdjustment.newRate}
                                    onChangeText={(text) => updateAdjustment(draftAdjustment.id, 'newRate', text)}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="decimal-pad"
                                />
                                <Text style={styles.modalHint}>
                                    Enter the new annual percentage rate (APR)
                                </Text>
                            </View>

                            <View style={styles.modalField}>
                                <Text style={styles.modalLabel}>Effective Date</Text>
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
                                    value={getDateInputValue(draftAdjustment)}
                                    onChange={(e) => handleDateChange(e.target.value, draftAdjustment.id)}
                                    min={getMinDate()}
                                    max={getMaxDate()}
                                />
                                <Text style={styles.modalHint}>
                                    {getMonthDisplay(draftAdjustment.month)}
                                </Text>
                                <Text style={[styles.modalHint, { marginTop: 4 }]}>
                                    Must be between 2 and {loanTermInMonths}
                                </Text>
                            </View>
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
                                disabled={!isValidRateAdjustment(draftAdjustment, loanTermInMonths)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    backgroundColor: isValidRateAdjustment(draftAdjustment, loanTermInMonths) ? colors.primary : colors.border,
                                    color: 'white',
                                    cursor: isValidRateAdjustment(draftAdjustment, loanTermInMonths) ? 'pointer' : 'not-allowed',
                                    fontSize: 14,
                                    fontWeight: '600',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                    opacity: isValidRateAdjustment(draftAdjustment, loanTermInMonths) ? 1 : 0.5,
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
    adjustmentCard: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
    },
    adjustmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    adjustmentName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    adjustmentDetails: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    adjustmentActions: {
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
});

export default RateAdjustmentList;
