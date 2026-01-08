// Centralized modal date picker component using native DateTimePicker
import { Modal, TouchableOpacity, View, Text, StyleSheet, Platform } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from "../constants/theme";

// Define props for the DatePicker component
type DatePickerProps = {
    visible: boolean; // Whether the modal is visible
    value: Date; // Current date value
    onChange: (event: any, selectedDate?: Date) => void; // Callback when date changes
    onClose: () => void; // Callback when modal is closed
    minimumDate?: Date; // Optional minimum date
    maximumDate?: Date; // Optional maximum date
};

export default function DatePicker({ 
    visible, 
    value, 
    onChange, 
    onClose,
    minimumDate = new Date(2000, 0, 1),
    maximumDate = new Date(2099, 11, 31)
}: DatePickerProps) {
    const handleChange = (event: any, selectedDate?: Date) => {
        // On Android, dismiss event is sent when user cancels
        if (Platform.OS === 'android' && event.type === 'dismissed') {
            onClose();
            return;
        }
        
        // Call the parent's onChange handler
        onChange(event, selectedDate);
        
        // Close picker on Android after selection
        if (Platform.OS === 'android' && selectedDate) {
            onClose();
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.datePickerContainer}>
                    <DateTimePicker
                        value={value}
                        mode="date"
                        display="spinner"
                        onChange={handleChange}
                        textColor={theme.colors.textPrimary}
                        themeVariant="light"
                        minimumDate={minimumDate}
                        maximumDate={maximumDate}
                    />
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

// Styles for the DatePicker component
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        padding: theme.spacing.xl,
        margin: theme.spacing.xl,
        ...theme.shadows.glass,
    },
    closeButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        marginTop: theme.spacing.lg,
    },
    closeButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
});
