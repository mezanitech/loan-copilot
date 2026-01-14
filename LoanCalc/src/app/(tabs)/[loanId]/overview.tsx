// Import React hooks for state management and side effects
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
// Import React Native UI components
import { Text, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView, Alert, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
// Import AsyncStorage for saving/loading loan data
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import routing utilities from expo-router
import { router, useGlobalSearchParams, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { theme } from '../../../constants/theme';
// Import custom reusable components
import InputField from "../../../components/InputField";
import TermSelector from "../../../components/TermSelector";
import DatePicker from "../../../components/DatePicker";
import PaymentSummary from "../../../components/PaymentSummary";
import DualLineChart from "../../../components/DualLineChart";
import { EarlyPayment, isValidEarlyPayment } from "../../../components/EarlyPaymentList";
import { RateAdjustment } from "../../../components/RateAdjustmentList";
import { AutoSaveIndicator, AutoSaveHandle } from "../../../components/AutoSaveIndicator";
import EditModal from "../../../components/EditModal";
// Import calculation utilities
import { calculatePayment, generatePaymentSchedule, calculateSavings, convertTermToMonths } from "../../../utils/loanCalculations";
// Import notification utilities
import { schedulePaymentReminders, cancelLoanNotifications, scheduleNextPaymentReminder } from "../../../utils/notificationUtils";
import { getNotificationPreferences, getCurrencyPreference, Currency } from "../../../utils/storage";
import { formatCurrency } from "../../../utils/currencyUtils";
// Import achievement tracking
import { incrementProgress } from "../../../utils/achievementUtils";
// Import PDF utilities - only on native platforms
const generateRobustLoanPDF = Platform.OS !== 'web'
  ? require("../../../utils/pdfLibReportUtils").generateRobustLoanPDF
  : null;
import { formatPeriod } from "../../../utils/reportUtils";

export default function LoanOverviewScreen() {
    // Get the loan ID from URL parameters (using useGlobalSearchParams for dynamic routes in tabs)
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    
    // Loan form input states
    const [loanName, setLoanName] = useState("");
    const [loanAmount, setLoanAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("months"); // Can be months or years
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]); // List of additional payments
    const [rateAdjustments, setRateAdjustments] = useState<RateAdjustment[]>([]); // List of rate changes
    const autoSaveRef = useRef<AutoSaveHandle>(null);
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Loading state for initial data fetch
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Modal state
    
    // Draft states for editing in modal - only created when modal opens
    const [draftData, setDraftData] = useState<{
        loanName: string;
        loanAmount: string;
        interestRate: string;
        term: string;
        termUnit: "months" | "years";
        date: Date;
    } | null>(null);
    const [showDraftDatePicker, setShowDraftDatePicker] = useState(false);

    // Validation helpers
    const isValidLoanData = () => {
        return loanName.trim() !== '' && 
               loanAmount.trim() !== '' && 
               !isNaN(parseFloat(loanAmount)) && 
               parseFloat(loanAmount) > 0 &&
               interestRate.trim() !== '' && 
               !isNaN(parseFloat(interestRate)) && 
               parseFloat(interestRate) >= 0 &&
               term.trim() !== '' && 
               !isNaN(parseFloat(term)) && 
               parseFloat(term) > 0;
    };

    // Trigger auto-save through the component
    const triggerAutoSave = () => {
        if (isValidLoanData() && autoSaveRef.current) {
            autoSaveRef.current.trigger();
        }
    };

    // Handle date selection from date picker
    const onDateChange = (event: any, selectedDate?: Date) => {
        // Update date if a valid date was selected
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    // Handle date picker close - trigger save after picker is closed
    const onDatePickerClose = () => {
        setShowDatePicker(false);
        // Trigger save after picker closes to ensure state is updated
        setTimeout(() => triggerAutoSave(), 100);
    };

    // Format date as YYYY-MM-DD for storage
    const getStartDate = (): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Format date for display (MM/DD/YYYY)
    const formatDateDisplay = (): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // Load loan data when component mounts or loanId changes
    useEffect(() => {
        if (loanId) {
            setIsLoading(true);
            loadLoan(loanId);
        }
    }, [loanId]);

    // Reload loan data when tab comes into focus (to reflect changes from payments tab)
    useFocusEffect(
        useCallback(() => {
            // Reload currency, earlyPayments, and rateAdjustments (in case they changed in payments tab)
            // but NOT the other loan data to prevent overwriting user changes
            loadCurrency();
            loadAdjustments();
            
            // Save any pending changes when navigating away (without debounce)
            return () => {
                if (isValidLoanData() && autoSaveRef.current) {
                    // Force immediate save without debounce when navigating away
                    autoSaveRef.current.forceSave();
                }
            };
        }, [loanName, loanAmount, interestRate, term, termUnit, date])
    );

    const loadCurrency = async () => {
        const curr = await getCurrencyPreference();
        setCurrency(curr);
    };

    const loadAdjustments = async () => {
        if (!loanId) return;
        
        try {
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                const loan = loans.find((l: any) => l.id === loanId);
                if (loan) {
                    setEarlyPayments(loan.earlyPayments || []);
                    setRateAdjustments(loan.rateAdjustments || []);
                }
            }
        } catch (error) {
            console.error('Error loading adjustments:', error);
        }
    };

    // Load loan details from AsyncStorage and populate form fields
    const loadLoan = async (id: string) => {
        try {
            // Retrieve all loans from storage
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                // Find the specific loan by ID
                const loan = loans.find((l: any) => l.id === id);
                if (loan) {
                    // Populate form fields with loan data
                    setLoanName(loan.name || "");
                    setLoanAmount(loan.amount.toString());
                    setInterestRate(loan.interestRate.toString());
                    setTerm(loan.term.toString());
                    setTermUnit(loan.termUnit);
                    if (loan.startDate) {
                        // Parse date in local time to avoid timezone shifts
                        const [year, month, day] = loan.startDate.split('-').map(Number);
                        const parsedDate = new Date(year, month - 1, day);
                        // Validate date is not invalid (Unix epoch or invalid date)
                        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1970) {
                            setDate(parsedDate);
                        } else {
                        }
                    }
                    setEarlyPayments(loan.earlyPayments || []);
                    setRateAdjustments(loan.rateAdjustments || []);
                }
            }
        } catch (error) {
            console.error('Error loading loan:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Convert RateAdjustment[] (strings) to calculation format (numbers)
    const getRateAdjustmentsForCalc = () => {
        return rateAdjustments.map(adj => {
            let monthNumber = parseInt(adj.month);
            
            // If date is provided, calculate actual month from dates
            if (adj.date) {
                const [adjYear, adjMonth, adjDay] = adj.date.split('-').map(Number);
                const adjDate = new Date(adjYear, adjMonth - 1, adjDay);
                const loanStartDate = date;
                
                const monthsDiff = (adjDate.getFullYear() - loanStartDate.getFullYear()) * 12 + 
                                 (adjDate.getMonth() - loanStartDate.getMonth());
                monthNumber = monthsDiff;
            }
            
            return {
                month: monthNumber,
                newRate: parseFloat(adj.newRate),
                date: adj.date
            };
        });
    };

    // Calculate monthly payment using standard loan amortization formula
    // Save updated loan data to AsyncStorage
    const updateLoan = async () => {
        // Validate all required fields are filled
        if (!isValidLoanData()) {
            return;
        }

        // Calculate payment amounts using centralized utility
        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);
        const termInMonths = convertTermToMonths(termValue, termUnit);
        
        const { monthlyPayment } = calculatePayment({ principal, annualRate, termInMonths });
        const schedule = generatePaymentSchedule({ 
            principal, 
            annualRate, 
            termInMonths, 
            startDate: date, 
            earlyPayments,
            rateAdjustments: getRateAdjustmentsForCalc()
        });
        // Calculate actual total based on payment schedule (includes early payments)
        const actualTotal = schedule.length > 0 
            ? schedule.reduce((sum, payment) => sum + payment.payment, 0)
            : monthlyPayment * (termUnit === "years" ? parseFloat(term) * 12 : parseFloat(term));

        try {
            // Get existing loans from storage
            const loansData = await AsyncStorage.getItem('loans');
            const loans = loansData ? JSON.parse(loansData) : [];
            // Find the index of the loan to update
            const loanIndex = loans.findIndex((l: any) => l.id === loanId);
            
            if (loanIndex !== -1) {
                // Get existing loan to preserve fields we don't manage here
                const existingLoan = loans[loanIndex];
                
                // Calculate current month and get current payment amount from schedule
                const monthsElapsed = Math.max(0, Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
                const currentMonthlyPayment = schedule.length === 0 || monthsElapsed >= schedule.length
                    ? monthlyPayment
                    : schedule[monthsElapsed]?.payment || monthlyPayment;
                const remainingBalance = schedule.length === 0 || monthsElapsed === 0
                    ? parseFloat(loanAmount)
                    : monthsElapsed >= schedule.length
                        ? 0
                        : Math.max(0, schedule[monthsElapsed]?.balance || 0);
                
                // Calculate freedom date (when loan will be paid off)
                const freedomDate = schedule.length > 0 ? (() => {
                    const finalDate = new Date(date);
                    finalDate.setMonth(finalDate.getMonth() + schedule.length - 1);
                    return finalDate.toISOString();
                })() : null;
                
                // Create updated loan object, preserving rateAdjustments and other fields
                const updatedLoan = {
                    ...existingLoan, // Preserve all existing fields
                    id: loanId,
                    name: loanName,
                    amount: parseFloat(loanAmount),
                    interestRate: parseFloat(interestRate),
                    term: parseFloat(term),
                    termUnit,
                    startDate: getStartDate(),
                    monthlyPayment,
                    totalPayment: actualTotal,
                    earlyPayments,
                    rateAdjustments, // Explicitly preserve rate adjustments
                    createdAt: existingLoan.createdAt || new Date().toISOString(), // Preserve original creation date
                    currentMonthlyPayment,
                    remainingBalance,
                    freedomDate,
                };

                
                
                // Cancel existing notifications
                if (existingLoan.scheduledNotificationIds && existingLoan.scheduledNotificationIds.length > 0) {
                    await cancelLoanNotifications(existingLoan.scheduledNotificationIds);
                }
                
                // Schedule new notifications if enabled
                const notificationPrefs = await getNotificationPreferences();
                let scheduledNotificationIds: string[] = [];
                
                if (notificationPrefs.enabled) {
                    // Schedule only the next payment notification based on actual schedule
                    scheduledNotificationIds = await scheduleNextPaymentReminder(
                        loanId,
                        loanName,
                        paymentSchedule,
                        getStartDate(),
                        notificationPrefs.reminderDays
                    );
                }
                
                // Add notification IDs to updated loan
                updatedLoan.scheduledNotificationIds = scheduledNotificationIds;
                
                // Replace old loan with updated loan
                loans[loanIndex] = updatedLoan;
                // Save back to storage
                await AsyncStorage.setItem('loans', JSON.stringify(loans));
            }
        } catch (error) {
            console.error('Error updating loan:', error);
            throw error;
        }
    };

    // Robust PDF generation function using pdf-lib
    const generateTestPDF = async () => {
        // PDF generation not available on web
        if (Platform.OS === 'web' || !generateRobustLoanPDF) {
            Alert.alert("Not Available", "PDF generation is only available on mobile devices.");
            return;
        }
        
        setIsGeneratingPDF(true);
        
        let uri: string | null = null;
        
        try {
            // Filter out invalid early payments before generating PDF
            const validEarlyPayments = earlyPayments.filter(isValidEarlyPayment);
            
            // Calculate current payment (same as shown in UI)
            const currentMonthlyPayment = paymentSchedule.length > 0 && monthsElapsed < paymentSchedule.length 
                ? (paymentSchedule[monthsElapsed]?.payment || monthlyPayment) 
                : monthlyPayment;
            
            // Calculate original totals (without early payments or rate adjustments)
            const originalTotalPayment = monthlyPayment * termInMonths;
            const originalTotalInterest = originalTotalPayment - parseFloat(loanAmount || '0');
            
            // Calculate current interest rate (considering rate adjustments)
            let currentInterestRate = parseFloat(interestRate || '0');
            if (rateAdjustments.length > 0) {
                // Find the most recent rate adjustment that has occurred
                const sortedAdjustments = [...rateAdjustments]
                    .map(adj => {
                        let month = parseInt(adj.month);
                        if (adj.date) {
                            const [adjYear, adjMonth, adjDay] = adj.date.split('-').map(Number);
                            const adjDate = new Date(adjYear, adjMonth - 1, adjDay);
                            const monthsDiff = (adjDate.getFullYear() - date.getFullYear()) * 12 + 
                                             (adjDate.getMonth() - date.getMonth());
                            month = monthsDiff + 1;
                        }
                        return { month, newRate: parseFloat(adj.newRate) };
                    })
                    .filter(adj => adj.month <= monthsElapsed + 1)
                    .sort((a, b) => b.month - a.month);
                
                if (sortedAdjustments.length > 0) {
                    currentInterestRate = sortedAdjustments[0].newRate;
                }
            }
            
            // Prepare loan data for pdf-lib
            const loanData = {
                loanId: loanId || 'unknown',
                name: loanName || 'Loan',
                amount: parseFloat(loanAmount || '0'),
                interestRate: parseFloat(interestRate || '0'),
                currentInterestRate,
                termInMonths,
                monthlyPayment: currentMonthlyPayment, // Use current payment that reflects rate adjustments
                totalPayment: actualTotalPayment,
                interestSaved,
                periodDecrease,
                currentBalance: remainingPrincipal,
                currentPaymentNumber: monthsElapsed + 1,
                totalPayments: paymentSchedule.length || termInMonths,
                originalTotalPayment,
                originalTotalInterest,
                earlyPayments: validEarlyPayments.map(ep => ({
                    name: ep.name,
                    type: ep.type,
                    amount: parseFloat(ep.amount),
                    month: ep.month,
                    frequency: ep.frequency
                })),
                rateAdjustments: rateAdjustments.map(ra => ({
                    month: ra.month,
                    newRate: ra.newRate
                })),
                payments: paymentSchedule.map((payment, index) => {
                    const paymentDate = new Date(date);
                    paymentDate.setMonth(paymentDate.getMonth() + index);
                    return {
                        number: index + 1,
                        principal: payment.principal,
                        interest: payment.interest,
                        balance: payment.balance,
                        date: paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    };
                })
            };
            
            // Generate PDF using robust pdf-lib
            const pdfBytes = await generateRobustLoanPDF(loanData, currency, date);
            
            // Save to device
            const filename = `${loanData.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`;
            uri = FileSystem.documentDirectory + filename;
            
            // Convert Uint8Array to base64 string
            const base64String = btoa(String.fromCharCode(...pdfBytes));
            
            await FileSystem.writeAsStringAsync(uri, base64String, {
                encoding: 'base64',
            });
            
            // Share the PDF - wrap in try/catch to handle dismissal gracefully
            try {
                await Sharing.shareAsync(uri, { 
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share Loan Report'
                });
                
                // Track achievement: exported report
                await incrementProgress('reports_exported');
            } catch (shareError) {
                // User dismissed the share dialog - this is normal, not an error
                console.log('Share dialog dismissed');
            }
        } catch (error) {
            // Show alert for actual errors during PDF generation
            console.error('PDF generation error:', error);
            Alert.alert(
                'Error',
                'Failed to generate PDF report. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            // Always reset loading state
            setIsGeneratingPDF(false);
            
            // Clean up temporary file if it was created
            if (uri) {
                try {
                    await FileSystem.deleteAsync(uri, { idempotent: true });
                } catch (cleanupError) {
                    // Ignore cleanup errors
                    console.log('Cleanup skipped:', cleanupError);
                }
            }
        }
    };

    // Duplicate loan function - creates a copy for testing different scenarios
    const duplicateLoan = async () => {
        if (!isValidLoanData()) {
            Alert.alert('Invalid Data', 'Please fix loan data errors before duplicating.');
            return;
        }

        setIsDuplicating(true);
        
        try {
            // Get existing loans from storage
            const loansData = await AsyncStorage.getItem('loans');
            const loans = loansData ? JSON.parse(loansData) : [];
            
            // Find current loan
            const currentLoan = loans.find((l: any) => l.id === loanId);
            if (!currentLoan) {
                throw new Error('Current loan not found');
            }
            
            // Generate new unique ID
            const newId = `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create duplicate with new ID and modified name
            const duplicatedLoan = {
                ...currentLoan,
                id: newId,
                name: `${loanName} - Plan B`,
                createdAt: new Date().toISOString(),
                // Clear notification IDs (will be rescheduled)
                scheduledNotificationIds: []
            };
            
            // Add to loans array
            loans.push(duplicatedLoan);
            
            // Save to storage
            await AsyncStorage.setItem('loans', JSON.stringify(loans));
            
            // Track achievement: duplicated loan (cumulative count)
            await incrementProgress('total_duplicates');
            
            // Schedule notifications for the new loan if enabled
            const notificationPrefs = await getNotificationPreferences();
            if (notificationPrefs.enabled && paymentSchedule.length > 0) {
                const scheduledIds = await scheduleNextPaymentReminder(
                    newId,
                    duplicatedLoan.name,
                    paymentSchedule,
                    getStartDate(),
                    notificationPrefs.reminderDays
                );
                
                // Update the loan with notification IDs
                duplicatedLoan.scheduledNotificationIds = scheduledIds;
                const loanIndex = loans.findIndex((l: any) => l.id === newId);
                if (loanIndex !== -1) {
                    loans[loanIndex] = duplicatedLoan;
                    await AsyncStorage.setItem('loans', JSON.stringify(loans));
                }
            }
            
            // Show success message and navigate to new loan
            Alert.alert(
                'Loan Duplicated',
                `"${duplicatedLoan.name}" has been created. You can now test different scenarios.`,
                [
                    {
                        text: 'View Copy',
                        onPress: () => router.push(`/(tabs)/${newId}/overview`)
                    },
                    {
                        text: 'Stay Here',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error) {
            console.error('Error duplicating loan:', error);
            Alert.alert(
                'Error',
                'Failed to duplicate loan. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsDuplicating(false);
        }
    };

    // Calculate payment amounts and schedules using centralized utilities
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    // Modal handling functions
    const openEditModal = () => {
        // Copy current values to draft object only when modal opens
        setDraftData({
            loanName,
            loanAmount,
            interestRate,
            term,
            termUnit,
            date
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        if (!draftData) return;
        
        // Validate draft data before saving
        const isDraftValid = 
            draftData.loanName.trim() !== '' && 
            draftData.loanAmount.trim() !== '' && 
            !isNaN(parseFloat(draftData.loanAmount)) && 
            parseFloat(draftData.loanAmount) > 0 &&
            draftData.interestRate.trim() !== '' && 
            !isNaN(parseFloat(draftData.interestRate)) && 
            parseFloat(draftData.interestRate) >= 0 &&
            draftData.term.trim() !== '' && 
            !isNaN(parseFloat(draftData.term)) && 
            parseFloat(draftData.term) > 0;

        if (isDraftValid) {
            // Apply draft changes to actual state
            setLoanName(draftData.loanName);
            setLoanAmount(draftData.loanAmount);
            setInterestRate(draftData.interestRate);
            setTerm(draftData.term);
            setTermUnit(draftData.termUnit);
            setDate(draftData.date);
            
            setIsEditModalOpen(false);
            setDraftData(null);
            
            // Trigger save after state updates
            setTimeout(() => {
                if (autoSaveRef.current) {
                    autoSaveRef.current.forceSave();
                }
            }, 100);
        } else {
            Alert.alert(
                'Invalid Data',
                'Please ensure all fields have valid values before saving.',
                [{ text: 'OK' }]
            );
        }
    };

    const cancelEditModal = () => {
        // Close without saving and clear draft
        setIsEditModalOpen(false);
        setDraftData(null);
        setShowDraftDatePicker(false);
    };

    // Handle date selection in modal
    const onDraftDateChange = (event: any, selectedDate?: Date) => {
        if (selectedDate && draftData) {
            setDraftData({ ...draftData, date: selectedDate });
        }
    };

    const termValue = parseFloat(term);
    const termInMonths = convertTermToMonths(termValue, termUnit);
    const dateTimestamp = date.getTime(); // Use timestamp for memoization
    
    // Memoize expensive calculations to prevent recalculating on every render
    const { monthlyPayment, totalPayment } = useMemo(() => 
        calculatePayment({ principal, annualRate, termInMonths }),
        [principal, annualRate, termInMonths]
    );
    
    // Memoize rate adjustments conversion
    const rateAdjustmentsForCalc = useMemo(() => 
        getRateAdjustmentsForCalc(),
        [rateAdjustments]
    );
    
    // Generate payment schedules (with and without early payments) - memoized
    const paymentSchedule = useMemo(() => generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: date, 
        earlyPayments,
        rateAdjustments: rateAdjustmentsForCalc
    }), [principal, annualRate, termInMonths, dateTimestamp, earlyPayments, rateAdjustmentsForCalc]);
    
    const originalSchedule = useMemo(() => generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: date,
        rateAdjustments: rateAdjustmentsForCalc
    }), [principal, annualRate, termInMonths, dateTimestamp, rateAdjustmentsForCalc]);
    
    // Calculate savings using centralized utility - memoized
    const { actualTotalPayment, totalInterest, interestSaved, periodDecrease } = useMemo(() => calculateSavings({
        principal,
        annualRate,
        termInMonths,
        startDate: date,
        earlyPayments,
        rateAdjustments: rateAdjustmentsForCalc
    }), [principal, annualRate, termInMonths, dateTimestamp, earlyPayments, rateAdjustmentsForCalc]);

    // Extract and memoize chart data
    const balanceComparisonData = useMemo(() => {
        const originalBalanceData = originalSchedule.map(p => p.balance);
        const earlyPaymentBalanceData = paymentSchedule.map(p => p.balance);
        
        const maxLength = Math.max(originalBalanceData.length, earlyPaymentBalanceData.length);
        return Array.from({ length: maxLength }, (_, i) => ({
            principal: originalBalanceData[i] ?? originalBalanceData[originalBalanceData.length - 1] ?? 0,
            interest: earlyPaymentBalanceData[i] ?? earlyPaymentBalanceData[earlyPaymentBalanceData.length - 1] ?? 0
        }));
    }, [originalSchedule, paymentSchedule]);
    
    // Extract principal and interest data for dual chart - memoized
    const principalInterestData = useMemo(() => 
        paymentSchedule.map(p => ({
            principal: p.principal,
            interest: p.interest
        })),
        [paymentSchedule]
    );

    // Calculate remaining principal - memoized
    const { monthsElapsed, remainingPrincipal } = useMemo(() => {
        const elapsed = Math.max(0, Math.floor((Date.now() - dateTimestamp) / (1000 * 60 * 60 * 24 * 30.44)));
        const remaining = paymentSchedule.length === 0 || elapsed === 0
            ? principal
            : elapsed >= paymentSchedule.length
                ? 0
                : Math.max(0, paymentSchedule[elapsed]?.balance || 0);
        
        return { monthsElapsed: elapsed, remainingPrincipal: remaining };
    }, [dateTimestamp, paymentSchedule, principal]);

    // Dismiss keyboard when tapping outside
    return <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
    >
        <AutoSaveIndicator ref={autoSaveRef} onSave={updateLoan} />
        
        {isLoading ? (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading loan details...</Text>
            </View>
        ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView style={styles.container}>
            {/* Action buttons at top */}
            <View style={styles.topButtonContainer}>
                <TouchableOpacity 
                    style={[styles.duplicateButtonTop, isDuplicating && styles.exportButtonDisabled]} 
                    onPress={duplicateLoan}
                    disabled={isDuplicating || !isValidLoanData()}
                >
                    {isDuplicating ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.colors.success} />
                            <Text style={styles.duplicateButtonTopText}>Copying...</Text>
                        </View>
                    ) : (
                        <Text style={styles.duplicateButtonTopText}>📋 Duplicate</Text>
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.exportButtonTop, isGeneratingPDF && styles.exportButtonDisabled]} 
                    onPress={generateTestPDF}
                    disabled={isGeneratingPDF}
                >
                    {isGeneratingPDF ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.exportButtonTopText}>Generating...</Text>
                        </View>
                    ) : (
                        <Text style={styles.exportButtonTopText}>Export Report</Text>
                    )}
                </TouchableOpacity>
                {!isValidLoanData() && (
                    <View style={styles.errorIndicator}>
                        <Text style={styles.errorText}>⚠️ Fix errors</Text>
                    </View>
                )}
            </View>

            {/* Loan Details Card - Read-only display */}
            <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                    <Text style={styles.detailsTitle}>Loan Details</Text>
                    <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
                        <Text style={styles.editButtonText}>✏️ Edit</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>💼 Loan Name</Text>
                    <Text style={styles.detailValue}>{loanName || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>💵 Loan Amount</Text>
                    <Text style={styles.detailValue}>{formatCurrency(parseFloat(loanAmount) || 0, currency)}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📈 Interest Rate</Text>
                    <Text style={styles.detailValue}>{interestRate}%</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>⏱️ Term</Text>
                    <Text style={styles.detailValue}>{term} {termUnit}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📅 Starting Date</Text>
                    <Text style={styles.detailValue}>{formatDateDisplay()}</Text>
                </View>
            </View>

            {/* Show payment summary if calculation is complete */}
            {monthlyPayment > 0 && (
                <PaymentSummary
                    monthlyPayment={paymentSchedule.length > 0 && monthsElapsed < paymentSchedule.length ? (paymentSchedule[monthsElapsed]?.payment || monthlyPayment) : monthlyPayment}
                    totalPayment={actualTotalPayment}
                    loanAmount={loanAmount}
                    remainingBalance={remainingPrincipal}
                />
            )}

            {/* Show charts and savings if schedule is generated */}
            {paymentSchedule.length > 0 && (
                <>
                    {/* Savings section - always show */}
                    <View style={styles.savingsContainer}>
                        <Text style={styles.sectionTitle}>
                            {earlyPayments.length > 0 ? '🎉 Your Savings!' : '💡 Potential Savings'}
                        </Text>
                        
                        {earlyPayments.length > 0 ? (
                            <>
                                <View style={styles.savingsRow}>
                                    <Text style={styles.savingsLabel}>💰 Money Saved:</Text>
                                    <Text style={styles.savingsValue}>{formatCurrency(interestSaved, currency)}</Text>
                                </View>
                                <View style={styles.savingsRow}>
                                    <Text style={styles.savingsLabel}>⚡ Time Saved:</Text>
                                    <Text style={styles.savingsValue}>
                                        {periodDecrease >= 12 
                                            ? `${Math.floor(periodDecrease / 12)} year${Math.floor(periodDecrease / 12) !== 1 ? 's' : ''}${periodDecrease % 12 > 0 ? ` ${periodDecrease % 12} month${periodDecrease % 12 !== 1 ? 's' : ''}` : ''}`
                                            : `${periodDecrease} month${periodDecrease !== 1 ? 's' : ''}`
                                        }
                                    </Text>
                                </View>
                                <View style={styles.savingsRow}>
                                    <Text style={styles.savingsLabel}>🎊 Freedom Day:</Text>
                                    <Text style={styles.savingsValue}>
                                        {(() => {
                                            const lastPayment = paymentSchedule[paymentSchedule.length - 1];
                                            if (!lastPayment) return 'N/A';
                                            const finalDate = new Date(date);
                                            finalDate.setMonth(finalDate.getMonth() + paymentSchedule.length - 1);
                                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                            return `${monthNames[finalDate.getMonth()]} ${finalDate.getFullYear()}`;
                                        })()}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptySavingsMessage}>
                                <Text style={styles.emptySavingsText}>
                                    💸 Add extra payments to save money on interest and pay off your loan faster!
                                </Text>
                                <TouchableOpacity 
                                    style={styles.addPaymentsButton}
                                    onPress={() => router.push(`/(tabs)/${loanId}/payments`)}
                                >
                                    <Text style={styles.addPaymentsButtonText}>+ Add Extra Payments</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        
                        {earlyPayments.length > 0 && (
                            <TouchableOpacity 
                                style={styles.addAnotherPaymentButton}
                                onPress={() => router.push(`/(tabs)/${loanId}/payments`)}
                            >
                                <Text style={styles.addAnotherPaymentButtonText}>+ Add Another Early Payment</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.subtleLink}
                            onPress={() => router.push(`/(tabs)/${loanId}/schedule`)}
                        >
                            <Text style={styles.subtleLinkText}>View detailed schedule</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Rate Adjustment Indicators */}
                    {rateAdjustments.length > 0 && (
                        <View style={styles.rateAdjustmentContainer}>
                            <Text style={styles.sectionTitle}>💡 Interest Rate Changes</Text>
                            <View style={styles.rateInfoNote}>
                                <Text style={styles.rateInfoText}>
                                     Your payment amount changes {rateAdjustments.length} time{rateAdjustments.length !== 1 ? 's' : ''} during this loan.
                                </Text>
                            </View>
                            {rateAdjustments.map((adj, index) => {
                                // Calculate the actual month number from date if available
                                let displayMonth = parseInt(adj.month);
                                if (adj.date) {
                                    const [adjYear, adjMonth, adjDay] = adj.date.split('-').map(Number);
                                    const adjDate = new Date(adjYear, adjMonth - 1, adjDay);
                                    const monthsDiff = (adjDate.getFullYear() - date.getFullYear()) * 12 + 
                                                     (adjDate.getMonth() - date.getMonth());
                                    displayMonth = monthsDiff + 1;
                                }
                                
                                // Calculate the date for display
                                const adjustmentDate = new Date(date);
                                adjustmentDate.setMonth(adjustmentDate.getMonth() + displayMonth - 1);
                                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                const dateString = `${monthNames[adjustmentDate.getMonth()]} ${adjustmentDate.getFullYear()}`;
                                
                                return (
                                    <View key={adj.id} style={styles.rateAdjustmentCard}>
                                        <View style={styles.rateAdjustmentHeader}>
                                            <View>
                                                {adj.name && (
                                                    <Text style={styles.rateAdjustmentName}>{adj.name}</Text>
                                                )}
                                                <Text style={styles.rateAdjustmentMonth}>Payment #{displayMonth}</Text>
                                                <Text style={styles.rateAdjustmentDate}>{dateString}</Text>
                                            </View>
                                            <Text style={styles.rateAdjustmentRate}>{adj.newRate}% APR</Text>
                                        </View>
                                    </View>
                                );
                            })}
                            <TouchableOpacity 
                                style={styles.manageRatesButton}
                                onPress={() => router.push(`/(tabs)/${loanId}/payments`)}
                            >
                                <Text style={styles.manageRatesButtonText}>Manage Rate Changes</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    
                    {/* Chart showing how principal balance decreases over time - comparing original vs early payments */}
                    <DualLineChart
                        title="📉 Watch Your Balance Shrink"
                        data={balanceComparisonData}
                        earlyPayments={[]} // Don't hide any points for balance comparison
                        legendLabels={{ principal: "Original", interest: "With Extra Payments" }}
                        colors={{ principal: theme.colors.warning, interest: theme.colors.primary }}
                        yAxisFormatter={(value: number) => formatCurrency(value / 1000, currency, 0) + 'k'}
                    />

                    {/* Chart showing principal vs interest per payment */}
                    <DualLineChart
                        title="💵 Where Your Money Goes"
                        data={principalInterestData}
                        earlyPayments={[]} // Show all points
                    />

                    
                </>
            )}
            </ScrollView>
        </TouchableWithoutFeedback>
        )}

        {/* Edit Modal */}
        <EditModal
            visible={isEditModalOpen}
            onClose={cancelEditModal}
            title="Edit Loan Details"
            variant="centered"
            footer={
                <>
                    <TouchableOpacity style={styles.modalCancelButton} onPress={cancelEditModal}>
                        <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalSaveButton} onPress={closeEditModal}>
                        <Text style={styles.modalSaveButtonText}>Save</Text>
                    </TouchableOpacity>
                </>
            }
        >
            <>
                        {draftData && (
                            <>
                        {/* Loan name input */}
                        <View style={draftData.loanName.trim() === '' ? styles.fieldError : null}>
                            <InputField
                                label="💼 Loan Name"
                                value={draftData.loanName}
                                onChangeText={(val) => setDraftData({ ...draftData, loanName: val })}
                                placeholder="e.g., Car Loan, Mortgage, Student Loan"
                            />
                        </View>

                        {/* Loan amount input */}
                        <View style={(draftData.loanAmount.trim() === '' || isNaN(parseFloat(draftData.loanAmount)) || parseFloat(draftData.loanAmount) <= 0) ? styles.fieldError : null}>
                            <InputField
                                label="💵 Loan Amount"
                                value={draftData.loanAmount}
                                onChangeText={(val) => setDraftData({ ...draftData, loanAmount: val })}
                                placeholder="Enter loan amount"
                                keyboardType="numeric"
                                formatNumber={true}
                            />
                        </View>

                        {/* Interest rate input */}
                        <View style={(draftData.interestRate.trim() === '' || isNaN(parseFloat(draftData.interestRate)) || parseFloat(draftData.interestRate) < 0) ? styles.fieldError : null}>
                            <InputField
                                label="📈 Interest Rate (%)"
                                value={draftData.interestRate}
                                onChangeText={(val) => setDraftData({ ...draftData, interestRate: val })}
                                placeholder="Enter interest rate"
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Term input with months/years toggle */}
                        <View style={(draftData.term.trim() === '' || isNaN(parseFloat(draftData.term)) || parseFloat(draftData.term) <= 0) ? styles.fieldError : null}>
                            <TermSelector
                                term={draftData.term}
                                onTermChange={(val) => setDraftData({ ...draftData, term: val })}
                                termUnit={draftData.termUnit}
                                onTermUnitChange={(val) => setDraftData({ ...draftData, termUnit: val })}
                            />
                        </View>

                        {/* Start date picker */}
                        <View>
                            <Text style={styles.dateLabel}>📅 Starting Date</Text>
                            <TouchableOpacity 
                                style={styles.dateButton}
                                onPress={() => setShowDraftDatePicker(true)}
                            >
                                <Text style={styles.dateButtonText}>
                                    {`${String(draftData.date.getMonth() + 1).padStart(2, '0')}/${String(draftData.date.getDate()).padStart(2, '0')}/${draftData.date.getFullYear()}`}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Date Picker for draft */}
                        <DatePicker
                            visible={showDraftDatePicker}
                            value={draftData.date}
                            onChange={onDraftDateChange}
                            onClose={() => setShowDraftDatePicker(false)}
                        />
                            </>
                        )}
            </>
        </EditModal>
    </KeyboardAvoidingView>;
}

// Styles for the loan overview screen
const styles = StyleSheet.create({
    // Loading screen
    loadingScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        gap: theme.spacing.lg,
    },
    loadingText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
    },
    // Main scrollable container
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    // Top action buttons container
    topButtonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        alignItems: 'center',
    },
    // Export Report button (top)
    exportButtonTop: {
        flex: 1,
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.glassBorderBlue,
        ...theme.shadows.glass,
    },
    exportButtonTopText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    // Duplicate button (top)
    duplicateButtonTop: {
        flex: 1,
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)', // Success color border
        ...theme.shadows.glass,
    },
    duplicateButtonTopText: {
        color: theme.colors.success,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    exportButtonDisabled: {
        opacity: 0.5,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    // Error indicator
    errorIndicator: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.sm,
        minHeight: 30,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
    fieldError: {
        borderWidth: 2,
        borderColor: theme.colors.error,
        borderRadius: theme.borderRadius.md,
        padding: 2,
        marginBottom: theme.spacing.sm,
    },
    // Page title
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xxl,
    },
    // Test PDF button
    testPdfButton: {
        backgroundColor: theme.colors.info,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        marginBottom: theme.spacing.xxxl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...theme.shadows.md,
    },
    testPdfButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
    },
    // Section headers
    sectionTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.lg,
        color: theme.colors.textPrimary,
    },
    // Savings container with success colors
    savingsContainer: {
        marginTop: theme.spacing.xl,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success,
        ...theme.shadows.glass,
    },
    // Row for each savings metric
    savingsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray100,
    },
    // Label for savings metrics
    savingsLabel: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    // Value for savings metrics
    savingsValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.success,
    },
    dateLabel: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textPrimary,
    },
    dateButton: {
        backgroundColor: theme.colors.surfaceGlass,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    dateButtonText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
    },
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
    subtleLink: {
        padding: theme.spacing.sm,
        alignItems: "center",
        marginTop: theme.spacing.md,
    },
    subtleLinkText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        textDecorationLine: 'underline',
    },
    addAnotherPaymentButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        marginTop: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...theme.shadows.md,
    },
    addAnotherPaymentButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    emptySavingsMessage: {
        alignItems: 'center',
        paddingVertical: theme.spacing.lg,
    },
    emptySavingsText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
    },
    addPaymentsButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...theme.shadows.md,
    },
    addPaymentsButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    exportButton: {
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        alignItems: "center",
        borderWidth: 2,
        borderColor: 'rgba(96, 165, 250, 0.3)',
        shadowColor: '#60A5FA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
        alignSelf: 'flex-end',
        marginBottom: theme.spacing.lg,
    },
    exportButtonText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.bold,
    },
    // Rate adjustment styles
    rateAdjustmentContainer: {
        marginTop: theme.spacing.xl,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
        ...theme.shadows.glass,
    },
    rateInfoNote: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 193, 7, 0.3)',
    },
    rateInfoText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    rateAdjustmentCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    rateAdjustmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rateAdjustmentMonth: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    rateAdjustmentDate: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    rateAdjustmentRate: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.warning,
        fontWeight: theme.fontWeight.bold,
    },
    rateAdjustmentName: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        fontStyle: 'italic',
    },
    manageRatesButton: {
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.warning,
    },
    manageRatesButtonText: {
        color: theme.colors.warning,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    // Details card styles
    detailsCard: {
        backgroundColor: theme.colors.surfaceGlass,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.glass,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.glassBorder,
    },
    detailsTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    editButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    editButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    detailLabel: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    detailValue: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
        fontWeight: theme.fontWeight.semibold,
    },
    // Modal footer button styles (used by EditModal)
    modalCancelButton: {
        flex: 1,
        backgroundColor: theme.colors.surfaceGlass,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    modalCancelButtonText: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    modalSaveButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    modalSaveButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
});
