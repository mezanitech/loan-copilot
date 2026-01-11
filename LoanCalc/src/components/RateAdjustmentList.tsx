import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useState, forwardRef, useImperativeHandle } from "react";
import InputField from "./InputField";
import DatePicker from "./DatePicker";
import EditModal from "./EditModal";
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
    onModalClose?: () => void;
    loanStartDate: Date;
    loanTermInMonths: number;
};

export type RateAdjustmentListRef = {
    collapseAll: () => void;
};

const RateAdjustmentList = forwardRef<RateAdjustmentListRef, RateAdjustmentListProps>(
    ({ adjustments, onAdjustmentsChange, onModalClose, loanStartDate, loanTermInMonths }, ref) => {
    const [activeMonthPicker, setActiveMonthPicker] = useState<string | null>(null);
    const [editingAdjustment, setEditingAdjustment] = useState<string | null>(null);
    const [draftAdjustment, setDraftAdjustment] = useState<RateAdjustment | null>(null);
    
    useImperativeHandle(ref, () => ({
        collapseAll: () => setEditingAdjustment(null)
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
        setDraftAdjustment(newAdjustment);
        // Open modal for the new adjustment
        setEditingAdjustment(newAdjustment.id);
    };

    const removeAdjustment = (id: string) => {
        onAdjustmentsChange(adjustments.filter(a => a.id !== id));
        // Close modal if this adjustment was being edited
        if (editingAdjustment === id) {
            setEditingAdjustment(null);
            setDraftAdjustment(null);
        }
        // Trigger save after deletion
        if (onModalClose) {
            setTimeout(() => onModalClose(), 100);
        }
    };

    const openEditModal = (id: string) => {
        // Create a draft copy of the existing adjustment
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
        
        // If invalid/incomplete, warn user
        if (!isValid && (isDraft || adjustment)) {
            Alert.alert(
                'Incomplete Adjustment',
                'This rate adjustment is incomplete or invalid and will not be saved. Are you sure you want to close?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Close Anyway', 
                        style: 'destructive',
                        onPress: () => {
                            if (isDraft) {
                                setDraftAdjustment(null);
                            }
                            setEditingAdjustment(null);
                            onModalClose?.();
                        }
                    }
                ]
            );
            return;
        }
        
        // Apply the draft changes
        if (adjustment && isValid && draftAdjustment) {
            // Check if this is a new adjustment or editing existing
            const existingIndex = adjustments.findIndex(a => a.id === adjustment.id);
            if (existingIndex >= 0) {
                // Update existing adjustment
                const updatedAdjustments = [...adjustments];
                updatedAdjustments[existingIndex] = adjustment;
                const sortedAdjustments = sortAdjustments(updatedAdjustments);
                onAdjustmentsChange(sortedAdjustments);
            } else {
                // Add new adjustment
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
        // Always update the draft state (both for new and existing adjustments)
        if (draftAdjustment && id === draftAdjustment.id) {
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
            setDraftAdjustment({ ...draftAdjustment, [field]: value });
        }
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

            {/* Adjustment cards - click to open modal */}
            {adjustments.map((adjustment, index) => {
                const isComplete = adjustment.month && adjustment.newRate;
                const isValid = isValidRateAdjustment(adjustment, loanTermInMonths);
                
                return (
                <TouchableOpacity
                    key={adjustment.id}
                    style={[
                        styles.adjustmentCard,
                        !isValid && styles.adjustmentCardInvalid
                    ]}
                    onPress={() => openEditModal(adjustment.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.adjustmentNumber}>
                            {adjustment.name || `Rate Change #${index + 1}`}
                        </Text>
                        {isComplete && (
                            <Text style={styles.adjustmentSummary}>
                                {adjustment.newRate}% • {getMonthDisplay(adjustment.month)}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
                );
            })}

            {/* Edit Adjustment Modal */}
            {editingAdjustment && (() => {
                const adjustment = getCurrentAdjustment();
                if (!adjustment) return null;
                const isValid = isValidRateAdjustment(adjustment, loanTermInMonths);
                
                return (
                    <EditModal
                        visible={true}
                        onClose={closeModal}
                        title={adjustment.name || 'Edit Rate Change'}
                        variant="centered"
                        footer={
                            <>
                                {adjustments.some(a => a.id === adjustment.id) && (
                                    <TouchableOpacity 
                                        style={styles.deleteButton}
                                        onPress={() => {
                                            Alert.alert(
                                                'Delete Rate Change',
                                                'Are you sure you want to delete this rate adjustment?',
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { 
                                                        text: 'Delete', 
                                                        style: 'destructive',
                                                        onPress: () => {
                                                            removeAdjustment(adjustment.id);
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
                        </>
                    </EditModal>
                );
            })()}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    cardHeaderLeft: {
        flex: 1,
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
