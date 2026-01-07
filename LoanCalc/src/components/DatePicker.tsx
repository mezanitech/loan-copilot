// Import React Native UI components
import { Text, View, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { theme } from "../constants/theme";

// Define props for the DatePicker component
type DatePickerProps = {
    label: string; // Label shown above the date picker
    value: string; // Current date value in YYYY-MM-DD format
    onChangeDate: (date: string) => void; // Callback when date changes
};

export default function DatePicker({ label, value, onChangeDate }: DatePickerProps) {
    // Parse the current value or use defaults
    const parts = value.split('-');
    const year = parts[0] || new Date().getFullYear().toString();
    const month = parts[1] || '01';
    const day = parts[2] || '01';

    // Generate array of years (allow past 20 years and future 20 years for flexibility)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 41 }, (_, i) => currentYear - 20 + i);

    // Month names for display
    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    // Generate days based on selected month and year
    const getDaysInMonth = (m: string, y: string) => {
        const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => {
            const d = (i + 1).toString().padStart(2, '0');
            return d;
        });
    };

    const days = getDaysInMonth(month, year);

    // Handle changes to year, month, or day
    const handleYearChange = (newYear: string) => {
        onChangeDate(`${newYear}-${month}-${day}`);
    };

    const handleMonthChange = (newMonth: string) => {
        // Make sure day is valid for new month
        const daysInNewMonth = getDaysInMonth(newMonth, year);
        const validDay = daysInNewMonth.includes(day) ? day : '01';
        onChangeDate(`${year}-${newMonth}-${validDay}`);
    };

    const handleDayChange = (newDay: string) => {
        onChangeDate(`${year}-${month}-${newDay}`);
    };

    return (
        <View style={styles.container}>
            {/* Label */}
            <Text style={styles.label}>{label}</Text>
            
            {/* Row with three pickers */}
            <View style={styles.pickerRow}>
                {/* Month Picker */}
                <View style={styles.pickerContainer}>
                    <Text style={styles.pickerLabel}>Month</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={month}
                            onValueChange={handleMonthChange}
                            style={styles.picker}
                        >
                            {months.map((m) => (
                                <Picker.Item key={m.value} label={m.label} value={m.value} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Day Picker */}
                <View style={styles.pickerContainer}>
                    <Text style={styles.pickerLabel}>Day</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={day}
                            onValueChange={handleDayChange}
                            style={styles.picker}
                        >
                            {days.map((d) => (
                                <Picker.Item key={d} label={d} value={d} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Year Picker */}
                <View style={styles.pickerContainer}>
                    <Text style={styles.pickerLabel}>Year</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={year}
                            onValueChange={handleYearChange}
                            style={styles.picker}
                        >
                            {years.map((y) => (
                                <Picker.Item key={y} label={y.toString()} value={y.toString()} />
                            ))}
                        </Picker>
                    </View>
                </View>
            </View>
        </View>
    );
}

// Styles for the DatePicker component
const styles = StyleSheet.create({
    // Outer container
    container: {
        marginBottom: theme.spacing.lg,
    },
    // Label text above pickers
    label: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textPrimary,
    },
    // Row containing all three pickers
    pickerRow: {
        flexDirection: "row",
        gap: theme.spacing.md,
    },
    // Container for each individual picker
    pickerContainer: {
        flex: 1,
    },
    // Small label above each picker
    pickerLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    // Wrapper with border around picker
    pickerWrapper: {
        borderWidth: 1,
        borderColor: theme.colors.gray300,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surface,
    },
    // The actual picker component
    picker: {
        height: 50,
        width: '100%',
    },
});
