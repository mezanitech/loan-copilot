// WEB-SPECIFIC VERSION - Loan Overview Page
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator, Dimensions, Image as RNImage } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useGlobalSearchParams, useFocusEffect, Link } from 'expo-router';
import { theme } from '../../../constants/theme';
import InputField from "../../../components/InputField";
import TermSelector from "../../../components/TermSelector.web";
import PaymentSummary from "../../../components/PaymentSummary";
import DualLineChart from "../../../components/DualLineChart";
import { EarlyPayment, isValidEarlyPayment } from "../../../components/EarlyPaymentList";
import { RateAdjustment } from "../../../components/RateAdjustmentList";
import { AutoSaveIndicator, AutoSaveHandle } from "../../../components/AutoSaveIndicator";
import EditModal from "../../../components/EditModal";
import { calculatePayment, generatePaymentSchedule, calculateSavings, convertTermToMonths } from "../../../utils/loanCalculations";
import { schedulePaymentReminders, cancelLoanNotifications, scheduleNextPaymentReminder } from "../../../utils/notificationUtils";
import { getNotificationPreferences, getCurrencyPreference, Currency } from "../../../utils/storage";
import { formatCurrency } from "../../../utils/currencyUtils";
import { incrementProgress } from "../../../utils/achievementUtils";
import { useKeyboardShortcuts } from "../../../hooks/useKeyboardShortcuts.web";
import { ThemeProvider, useTheme } from "../../../contexts/ThemeContext.web";
import MobileAppPromotion from "../../../components/MobileAppPromotion.web";

function LoanOverviewScreenWebContent() {
    const params = useGlobalSearchParams();
    const loanId = params.loanId as string;
    
    const [loanName, setLoanName] = useState("");
    const [loanAmount, setLoanAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [term, setTerm] = useState("");
    const [termUnit, setTermUnit] = useState<"months" | "years">("months");
    const [date, setDate] = useState(new Date());
    const dateRef = useRef(new Date());
    const [earlyPayments, setEarlyPayments] = useState<EarlyPayment[]>([]);
    const [rateAdjustments, setRateAdjustments] = useState<RateAdjustment[]>([]);
    const autoSaveRef = useRef<AutoSaveHandle>(null);
    const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' });
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [insightsPanelWidth, setInsightsPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [showInsights, setShowInsights] = useState(true);
    const { mode, toggleTheme, colors } = useTheme();
    
    const styles = createStyles(colors, mode);
    
    useKeyboardShortcuts();
    
    const [draftData, setDraftData] = useState<{
        loanName: string;
        loanAmount: string;
        interestRate: string;
        term: string;
        termUnit: "months" | "years";
        date: Date;
    } | null>(null);
    const [showDraftDatePicker, setShowDraftDatePicker] = useState(false);

    // Handle window resize for responsive behavior
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            if (width < 1200) {
                setShowInsights(false);
            } else {
                setShowInsights(true);
            }
            if (width < 768) {
                setIsSidebarCollapsed(true);
            } else {
                setIsSidebarCollapsed(false);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle sidebar resize
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingSidebar) return;
            const newWidth = e.clientX;
            setSidebarWidth(Math.max(200, Math.min(400, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
        };

        if (isResizingSidebar) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingSidebar]);

    // Handle insights panel resize
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            setInsightsPanelWidth(Math.max(250, Math.min(500, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

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

    const triggerAutoSave = () => {
        if (isValidLoanData() && autoSaveRef.current) {
            autoSaveRef.current.trigger();
        }
    };

    const getStartDate = (): string => {
        const year = dateRef.current.getFullYear();
        const month = String(dateRef.current.getMonth() + 1).padStart(2, '0');
        const day = String(dateRef.current.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateDisplay = (): string => {
        const month = String(dateRef.current.getMonth() + 1).padStart(2, '0');
        const day = String(dateRef.current.getDate()).padStart(2, '0');
        const year = dateRef.current.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // Handle date change from HTML date input
    const handleDateChange = (dateString: string) => {
        if (dateString) {
            const newDate = new Date(dateString + 'T12:00:00');
            if (!isNaN(newDate.getTime())) {
                setDate(newDate);
                dateRef.current = newDate;
                setTimeout(() => triggerAutoSave(), 100);
            }
        }
    };

    // Format date for HTML input (YYYY-MM-DD)
    const getDateInputValue = (): string => {
        const currentDate = dateRef.current;
        if (!currentDate || isNaN(currentDate.getTime())) {
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        if (loanId) {
            setIsLoading(true);
            loadLoan(loanId);
        }
    }, [loanId]);

    useFocusEffect(
        useCallback(() => {
            loadCurrency();
            loadAdjustments();
            
            return () => {
                if (isValidLoanData() && autoSaveRef.current) {
                    autoSaveRef.current.forceSave();
                }
            };
        }, [loanId, loanName, loanAmount, interestRate, term, termUnit, date])
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
                if (!Array.isArray(loans)) {
                    console.error('Invalid loans data');
                    return;
                }
                const loan = loans.find((l: any) => l?.id === loanId);
                if (loan) {
                    setEarlyPayments(loan.earlyPayments || []);
                    setRateAdjustments(loan.rateAdjustments || []);
                } else {
                    setEarlyPayments([]);
                    setRateAdjustments([]);
                }
            }
        } catch (error) {
            console.error('Error loading adjustments:', error);
        }
    };

    const loadLoan = async (id: string) => {
        try {
            const loansData = await AsyncStorage.getItem('loans');
            if (loansData) {
                const loans = JSON.parse(loansData);
                const loan = loans.find((l: any) => l.id === id);
                if (loan) {
                    setLoanName(loan.name || "");
                    setLoanAmount(loan.amount.toString());
                    setInterestRate(loan.interestRate.toString());
                    setTerm(loan.term.toString());
                    setTermUnit(loan.termUnit);
                    if (loan.startDate) {
                        const [year, month, day] = loan.startDate.split('-').map(Number);
                        const parsedDate = new Date(year, month - 1, day);
                        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1970) {
                            setDate(parsedDate);
                            dateRef.current = parsedDate;
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

    const getRateAdjustmentsForCalc = () => {
        return rateAdjustments.map(adj => {
            let monthNumber = parseInt(adj.month);
            
            if (adj.date) {
                const [adjYear, adjMonth, adjDay] = adj.date.split('-').map(Number);
                const adjDate = new Date(adjYear, adjMonth - 1, adjDay);
                const loanStartDate = dateRef.current;
                
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

    const updateLoan = async () => {
        if (!isValidLoanData()) {
            return;
        }

        const principal = parseFloat(loanAmount);
        const annualRate = parseFloat(interestRate);
        const termValue = parseFloat(term);
        const termInMonths = convertTermToMonths(termValue, termUnit);
        
        const { monthlyPayment } = calculatePayment({ principal, annualRate, termInMonths });
        const schedule = generatePaymentSchedule({ 
            principal, 
            annualRate, 
            termInMonths, 
            startDate: dateRef.current, 
            earlyPayments,
            rateAdjustments: getRateAdjustmentsForCalc()
        });
        const actualTotal = schedule.length > 0 
            ? schedule.reduce((sum, payment) => sum + payment.payment, 0)
            : monthlyPayment * (termUnit === "years" ? parseFloat(term) * 12 : parseFloat(term));

        try {
            const loansData = await AsyncStorage.getItem('loans');
            const loans = loansData ? JSON.parse(loansData) : [];
            const loanIndex = loans.findIndex((l: any) => l.id === loanId);
            
            if (loanIndex !== -1) {
                const existingLoan = loans[loanIndex];
                
                const monthsElapsed = Math.max(0, Math.floor((new Date().getTime() - new Date(dateRef.current).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
                const currentMonthlyPayment = schedule.length === 0 || monthsElapsed >= schedule.length
                    ? monthlyPayment
                    : schedule[monthsElapsed]?.payment || monthlyPayment;
                const remainingBalance = schedule.length === 0 || monthsElapsed === 0
                    ? parseFloat(loanAmount)
                    : monthsElapsed >= schedule.length
                        ? 0
                        : Math.max(0, schedule[monthsElapsed]?.balance || 0);
                
                const freedomDate = schedule.length > 0 ? (() => {
                    const finalDate = new Date(dateRef.current);
                    finalDate.setMonth(finalDate.getMonth() + schedule.length - 1);
                    return finalDate.toISOString();
                })() : null;
                
                const updatedLoan = {
                    ...existingLoan,
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
                    rateAdjustments,
                    createdAt: existingLoan.createdAt || new Date().toISOString(),
                    currentMonthlyPayment,
                    remainingBalance,
                    freedomDate,
                };
                
                if (existingLoan.scheduledNotificationIds && existingLoan.scheduledNotificationIds.length > 0) {
                    await cancelLoanNotifications(existingLoan.scheduledNotificationIds);
                }
                
                const notificationPrefs = await getNotificationPreferences();
                let scheduledNotificationIds: string[] = [];
                
                if (notificationPrefs.enabled) {
                    scheduledNotificationIds = await scheduleNextPaymentReminder(
                        loanId,
                        loanName,
                        paymentSchedule,
                        getStartDate(),
                        notificationPrefs.reminderDays
                    );
                }
                
                updatedLoan.scheduledNotificationIds = scheduledNotificationIds;
                
                loans[loanIndex] = updatedLoan;
                await AsyncStorage.setItem('loans', JSON.stringify(loans));
            }
        } catch (error) {
            console.error('Error updating loan:', error);
            throw error;
        }
    };

    const generateTestPDF = async () => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.alert("PDF generation is only available on mobile devices.");
            }
            return;
        }
    };

    const duplicateLoan = async () => {
        if (!isValidLoanData()) {
            if (typeof window !== 'undefined') {
                window.alert('Please fix loan data errors before duplicating.');
            }
            return;
        }

        setIsDuplicating(true);
        
        try {
            const loansData = await AsyncStorage.getItem('loans');
            const loans = loansData ? JSON.parse(loansData) : [];
            
            const currentLoan = loans.find((l: any) => l.id === loanId);
            if (!currentLoan) {
                throw new Error('Current loan not found');
            }
            
            const newId = `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const duplicatedLoan = {
                ...currentLoan,
                id: newId,
                name: `${loanName} - Plan B`,
                createdAt: new Date().toISOString(),
                scheduledNotificationIds: []
            };
            
            loans.push(duplicatedLoan);
            await AsyncStorage.setItem('loans', JSON.stringify(loans));
            
            await incrementProgress('total_duplicates');
            
            const notificationPrefs = await getNotificationPreferences();
            if (notificationPrefs.enabled && paymentSchedule.length > 0) {
                const scheduledIds = await scheduleNextPaymentReminder(
                    newId,
                    duplicatedLoan.name,
                    paymentSchedule,
                    getStartDate(),
                    notificationPrefs.reminderDays
                );
                
                duplicatedLoan.scheduledNotificationIds = scheduledIds;
                const loanIndex = loans.findIndex((l: any) => l.id === newId);
                if (loanIndex !== -1) {
                    loans[loanIndex] = duplicatedLoan;
                    await AsyncStorage.setItem('loans', JSON.stringify(loans));
                }
            }
            
            if (typeof window !== 'undefined' && window.confirm(`"${duplicatedLoan.name}" has been created. View the copy now?`)) {
                router.push(`/(tabs)/${newId}/overview`);
            }
        } catch (error) {
            console.error('Error duplicating loan:', error);
            if (typeof window !== 'undefined') {
                window.alert('Failed to duplicate loan. Please try again.');
            }
        } finally {
            setIsDuplicating(false);
        }
    };

    const openEditModal = () => {
        setDraftData({
            loanName,
            loanAmount,
            interestRate,
            term,
            termUnit,
            date: dateRef.current
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        if (!draftData) return;
        
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
            setLoanName(draftData.loanName);
            setLoanAmount(draftData.loanAmount);
            setInterestRate(draftData.interestRate);
            setTerm(draftData.term);
            setTermUnit(draftData.termUnit);
            setDate(draftData.date);
            dateRef.current = draftData.date;
            
            setIsEditModalOpen(false);
            setDraftData(null);
            
            setTimeout(() => {
                if (autoSaveRef.current) {
                    autoSaveRef.current.forceSave();
                }
            }, 100);
        } else {
            if (typeof window !== 'undefined') {
                window.alert('Please ensure all fields have valid values before saving.');
            }
        }
    };

    const cancelEditModal = () => {
        setIsEditModalOpen(false);
        setDraftData(null);
        setShowDraftDatePicker(false);
    };

    const onDraftDateChange = (dateString: string) => {
        if (dateString && draftData) {
            const newDate = new Date(dateString + 'T12:00:00');
            if (!isNaN(newDate.getTime())) {
                setDraftData({ ...draftData, date: newDate });
            }
        }
    };

    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    const termValue = parseFloat(term);
    const termInMonths = convertTermToMonths(termValue, termUnit);
    const dateTimestamp = dateRef.current.getTime();
    
    const { monthlyPayment, totalPayment } = useMemo(() => 
        calculatePayment({ principal, annualRate, termInMonths }),
        [principal, annualRate, termInMonths]
    );
    
    const rateAdjustmentsForCalc = useMemo(() => 
        getRateAdjustmentsForCalc(),
        [rateAdjustments]
    );
    
    const paymentSchedule = useMemo(() => generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: dateRef.current, 
        earlyPayments,
        rateAdjustments: rateAdjustmentsForCalc
    }), [principal, annualRate, termInMonths, dateTimestamp, earlyPayments, rateAdjustmentsForCalc]);
    
    const originalSchedule = useMemo(() => generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate: dateRef.current,
        rateAdjustments: rateAdjustmentsForCalc
    }), [principal, annualRate, termInMonths, dateTimestamp, rateAdjustmentsForCalc]);
    
    const { actualTotalPayment, totalInterest, interestSaved, periodDecrease } = useMemo(() => calculateSavings({
        principal,
        annualRate,
        termInMonths,
        startDate: dateRef.current,
        earlyPayments,
        rateAdjustments: rateAdjustmentsForCalc
    }), [principal, annualRate, termInMonths, dateTimestamp, earlyPayments, rateAdjustmentsForCalc]);

    const balanceComparisonData = useMemo(() => {
        const originalBalanceData = originalSchedule.map(p => p.balance);
        const earlyPaymentBalanceData = paymentSchedule.map(p => p.balance);
        
        const maxLength = Math.max(originalBalanceData.length, earlyPaymentBalanceData.length);
        return Array.from({ length: maxLength }, (_, i) => ({
            principal: originalBalanceData[i] ?? originalBalanceData[originalBalanceData.length - 1] ?? 0,
            interest: earlyPaymentBalanceData[i] ?? earlyPaymentBalanceData[earlyPaymentBalanceData.length - 1] ?? 0
        }));
    }, [originalSchedule, paymentSchedule]);
    
    const principalInterestData = useMemo(() => 
        paymentSchedule.map(p => ({
            principal: p.principal,
            interest: p.interest
        })),
        [paymentSchedule]
    );

    const { monthsElapsed, remainingPrincipal } = useMemo(() => {
        const elapsed = Math.max(0, Math.floor((Date.now() - dateTimestamp) / (1000 * 60 * 60 * 24 * 30.44)));
        const remaining = paymentSchedule.length === 0 || elapsed === 0
            ? principal
            : elapsed >= paymentSchedule.length
                ? 0
                : Math.max(0, paymentSchedule[elapsed]?.balance || 0);
        
        return { monthsElapsed: elapsed, remainingPrincipal: remaining };
    }, [dateTimestamp, paymentSchedule, principal]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Overlay for small screens when sidebar is open */}
            {!isSidebarCollapsed && windowWidth < 768 && (
                <TouchableOpacity
                    style={styles.overlay}
                    onPress={() => setIsSidebarCollapsed(true)}
                    activeOpacity={1}
                />
            )}
            
            {/* Hamburger Menu Button */}
            {isSidebarCollapsed && (
                <TouchableOpacity 
                    style={[
                        styles.hamburgerButton, 
                        { 
                            backgroundColor: mode === 'dark' ? colors.sidebar : colors.card,
                            borderWidth: mode === 'dark' ? 0 : 1,
                            borderColor: mode === 'dark' ? 'transparent' : colors.border,
                        }
                    ]}
                    onPress={() => setIsSidebarCollapsed(false)}
                >
                    <Text style={[styles.hamburgerIcon, { color: colors.textPrimary }]}>☰</Text>
                </TouchableOpacity>
            )}

            {/* Left Sidebar */}
            {!isSidebarCollapsed && (
                <View style={{ 
                    width: windowWidth < 768 ? 280 : sidebarWidth, 
                    position: windowWidth < 768 ? 'absolute' : 'relative',
                    zIndex: windowWidth < 768 ? 999 : 1,
                    height: windowWidth < 768 ? '100%' : 'auto',
                }}>
                <ScrollView style={[styles.sidebar, { backgroundColor: colors.sidebar, width: '100%' }]}>
                    <View style={styles.sidebarHeader}>
                        <View style={styles.appTitleContainer}>
                            <RNImage source={require('../../../../assets/icon.png')} style={{ width: 32, height: 32, marginRight: 12, borderRadius: 6 }} />
                            <Text style={[styles.appTitle, { color: colors.sidebarTextActive }]}>Loan Co-Pilot</Text>
                        </View>
                        {windowWidth < 768 && (
                            <TouchableOpacity 
                                style={styles.closeSidebarButton}
                                onPress={() => setIsSidebarCollapsed(true)}
                            >
                                <Text style={[styles.closeSidebarIcon, { color: colors.textPrimary }]}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.sidebarSection}>
                        <Text style={styles.sidebarLabel}>NAVIGATION</Text>
                        <Link href="/(tabs)" asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}>←</Text>
                                <Text style={styles.sidebarButtonText}>Dashboard</Text>
                            </TouchableOpacity>
                        </Link>
                        <TouchableOpacity style={[styles.sidebarButton, styles.sidebarButtonActive]}>
                            <Text style={styles.sidebarButtonIcon}></Text>
                            <Text style={[styles.sidebarButtonText, styles.sidebarButtonTextActive]}>Loan Details</Text>
                        </TouchableOpacity>
                        <Link href={`/(tabs)/${loanId}/payments`} asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}></Text>
                                <Text style={styles.sidebarButtonText}>Adjustments</Text>
                            </TouchableOpacity>
                        </Link>
                        <Link href={`/(tabs)/${loanId}/schedule`} asChild>
                            <TouchableOpacity style={styles.sidebarButton}>
                                <Text style={styles.sidebarButtonIcon}></Text>
                                <Text style={styles.sidebarButtonText}>Payment Schedule</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    {isValidLoanData() && windowWidth >= 1024 && (
                        <View style={styles.sidebarQuickView}>
                            <Text style={styles.quickViewLabel}>QUICK STATS</Text>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Monthly</Text>
                                <Text style={styles.quickViewValue}>
                                    {formatCurrency(
                                        paymentSchedule.length > 0 && monthsElapsed < paymentSchedule.length 
                                            ? (paymentSchedule[monthsElapsed]?.payment || monthlyPayment) 
                                            : monthlyPayment,
                                        currency
                                    )}
                                </Text>
                            </View>
                            <View style={styles.quickViewItem}>
                                <Text style={styles.quickViewKey}>Remaining</Text>
                                <Text style={styles.quickViewValue}>{formatCurrency(remainingPrincipal, currency, 0)}</Text>
                            </View>
                            {earlyPayments.length > 0 && (
                                <View style={styles.quickViewItem}>
                                    <Text style={styles.quickViewKey}>Saved</Text>
                                    <Text style={[styles.quickViewValue, { color: '#22c55e' }]}>
                                        {formatCurrency(interestSaved, currency, 0)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.sidebarFooter}>
                        <TouchableOpacity 
                            style={styles.appStoreBanner}
                            onPress={() => typeof window !== 'undefined' && window.open('https://apps.apple.com/app/apple-store/id6757390003?pt=128423727&ct=WebRef&mt=8', '_blank')}
                        >
                            <View style={styles.appStoreBannerContent}>
                                <View style={styles.appStoreIconContainer}>
                                    <RNImage 
                                        source={require('../../../../assets/icon.png')} 
                                        style={styles.appStoreIconImage}
                                    />
                                </View>
                                <View style={styles.appStoreBannerText}>
                                    <Text style={styles.appStoreBadgeSmall}>Download on the</Text>
                                    <Text style={styles.appStoreBadgeLarge}>App Store</Text>
                                    <Text style={styles.appStoreBannerSubtitle}>Get the full iOS experience with offline support, widgets, and more!</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
                            <Text style={styles.themeToggleIcon}>{mode === 'light' ? '🌙' : '☀️'}</Text>
                            <Text style={styles.themeToggleText}>{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                {/* Resize Handle */}
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        cursor: 'ew-resize',
                        backgroundColor: isResizingSidebar ? colors.primary : 'transparent',
                        zIndex: 10,
                    }}
                    onMouseDown={() => setIsResizingSidebar(true)}
                />
                </View>
            )}

            {/* Main Content */}
            <ScrollView style={styles.mainContent} contentContainerStyle={styles.contentContainer}>
                <AutoSaveIndicator ref={autoSaveRef} onSave={updateLoan} />
                
                {isLoading ? (
                    <View style={styles.loadingScreen}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading loan details...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.pageHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pageTitle}>{loanName || 'Loan Overview'}</Text>
                                <Text style={styles.pageSubtitle}>
                                    Manage your loan details and track your progress
                                </Text>
                            </View>
                            {!isValidLoanData() && (
                                <View style={styles.validationBadge}>
                                    <Text style={styles.validationText}>⚠️ Fix errors</Text>
                                </View>
                            )}
                        </View>

                        {/* Action buttons */}
                        <View style={[styles.topButtonContainer, windowWidth < 768 && { flexDirection: 'column' }]}>
                            <TouchableOpacity 
                                style={[styles.duplicateButtonTop, isDuplicating && styles.exportButtonDisabled, windowWidth < 768 && { flex: 0 }]} 
                                onPress={duplicateLoan}
                                disabled={isDuplicating || !isValidLoanData()}
                            >
                                {isDuplicating ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color={colors.success} />
                                        <Text style={styles.duplicateButtonTopText}>Copying...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.duplicateButtonTopText}>📋 Duplicate</Text>
                                )}
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.exportButtonTop, isGeneratingPDF && styles.exportButtonDisabled, windowWidth < 768 && { flex: 0 }]} 
                                onPress={generateTestPDF}
                                disabled={isGeneratingPDF}
                            >
                                <Text style={styles.exportButtonTopText}>Export Report (Mobile Only)</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Loan Details Card */}
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

                        {/* Payment Summary */}
                        {monthlyPayment > 0 && (
                            <PaymentSummary
                                monthlyPayment={paymentSchedule.length > 0 && monthsElapsed < paymentSchedule.length ? (paymentSchedule[monthsElapsed]?.payment || monthlyPayment) : monthlyPayment}
                                totalPayment={actualTotalPayment}
                                loanAmount={loanAmount}
                                remainingBalance={remainingPrincipal}
                            />
                        )}

                        {/* Savings and Charts */}
                        {paymentSchedule.length > 0 && (
                            <>
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
                                                        const finalDate = new Date(dateRef.current);
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

                                {/* Rate Adjustments */}
                                {rateAdjustments.length > 0 && (
                                    <View style={styles.rateAdjustmentContainer}>
                                        <Text style={styles.sectionTitle}>💡 Interest Rate Changes</Text>
                                        <View style={styles.rateInfoNote}>
                                            <Text style={styles.rateInfoText}>
                                                Your payment amount changes {rateAdjustments.length} time{rateAdjustments.length !== 1 ? 's' : ''} during this loan.
                                            </Text>
                                        </View>
                                        {rateAdjustments.map((adj, index) => {
                                            let displayMonth = parseInt(adj.month);
                                            if (adj.date) {
                                                const [adjYear, adjMonth, adjDay] = adj.date.split('-').map(Number);
                                                const adjDate = new Date(adjYear, adjMonth - 1, adjDay);
                                                const monthsDiff = (adjDate.getFullYear() - dateRef.current.getFullYear()) * 12 + 
                                                                 (adjDate.getMonth() - dateRef.current.getMonth());
                                                displayMonth = monthsDiff + 1;
                                            }
                                            
                                            const adjustmentDate = new Date(dateRef.current);
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
                                
                                {/* Charts */}
                                <View style={[styles.chartsSection, windowWidth < 1024 && { flexDirection: 'column' }]}>
                                    <View style={[styles.chartCard, windowWidth < 1024 && { minWidth: '100%' }]}>
                                        <DualLineChart
                                            title="📉 Watch Your Balance Shrink"
                                            data={balanceComparisonData}
                                            earlyPayments={[]}
                                            legendLabels={{ principal: "Original", interest: "With Extra Payments" }}
                                            colors={{ principal: theme.colors.warning, interest: theme.colors.primary }}
                                            yAxisFormatter={(value: number) => formatCurrency(value / 1000, currency, 0) + 'k'}
                                        />
                                    </View>

                                    <View style={[styles.chartCard, windowWidth < 1024 && { minWidth: '100%' }]}>
                                        <DualLineChart
                                            title="💵 Where Your Money Goes"
                                            data={principalInterestData}
                                            earlyPayments={[]}
                                        />
                                    </View>
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Right Insights Panel */}
            {windowWidth >= 1200 && showInsights && !isLoading && paymentSchedule.length > 0 && (
                <View style={{ width: insightsPanelWidth, position: 'relative' }}>
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            cursor: 'ew-resize',
                            backgroundColor: isResizing ? colors.primary : 'transparent',
                            zIndex: 10,
                        }}
                        onMouseDown={() => setIsResizing(true)}
                    />
                    <ScrollView style={[styles.insightsPanel, { backgroundColor: colors.card, borderLeftColor: colors.border, width: '100%' }]}>
                        <Text style={[styles.insightsPanelTitle, { color: colors.textPrimary }]}>💡 Insights</Text>
                    
                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Current Payment</Text>
                            <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                                {formatCurrency(
                                    paymentSchedule.length > 0 && monthsElapsed < paymentSchedule.length 
                                        ? (paymentSchedule[monthsElapsed]?.payment || monthlyPayment) 
                                        : monthlyPayment,
                                    currency
                                )}
                            </Text>
                            <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>per month</Text>
                        </View>

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Remaining Balance</Text>
                            <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                                {formatCurrency(remainingPrincipal, currency, 0)}
                            </Text>
                            <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                {remainingPrincipal > 0 ? `${Math.round((remainingPrincipal / principal) * 100)}% of original` : 'Paid off!'}
                            </Text>
                        </View>

                        {earlyPayments.length > 0 && (
                            <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#f0fdf4', borderColor: '#22c55e' }]}>
                                <Text style={styles.insightBadgeGreen}>✅ SAVINGS</Text>
                                <Text style={[styles.insightValue, { color: '#22c55e' }]}>
                                    {formatCurrency(interestSaved, currency, 0)}
                                </Text>
                                <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                    You're saving {formatCurrency(interestSaved, currency, 0)} in interest by making extra payments!
                                </Text>
                            </View>
                        )}

                        <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Total Interest</Text>
                            <Text style={[styles.insightValue, { color: '#e67e22' }]}>
                                {formatCurrency(totalInterest, currency, 0)}
                            </Text>
                            <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                {principal > 0 ? `${((totalInterest / principal) * 100).toFixed(1)}% of principal` : ''}
                            </Text>
                        </View>

                        {paymentSchedule.length > 0 && (
                            <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : 'white', borderColor: colors.border }]}>
                                <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Payments Made</Text>
                                <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                                    {monthsElapsed} / {paymentSchedule.length}
                                </Text>
                                <Text style={[styles.insightSubtext, { color: colors.textTertiary }]}>
                                    {paymentSchedule.length - monthsElapsed} payments remaining
                                </Text>
                            </View>
                        )}

                        {/* Mobile App Promotional Banner */}
                        <MobileAppPromotion 
                            insightCardStyle={styles.insightCard}
                            insightBadgeStyle={styles.insightBadge}
                            insightTextStyle={styles.insightText}
                        />

                        {!earlyPayments.length && (
                            <View style={[styles.insightCard, { backgroundColor: mode === 'dark' ? colors.backgroundSecondary : '#f0f9ff', borderColor: colors.primary }]}>
                                <Text style={styles.insightBadge}>💡 TIP</Text>
                                <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                                    Add extra payments to reduce your total interest and pay off your loan faster. Even small additional payments can make a big difference!
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
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
                            <View style={draftData.loanName.trim() === '' ? styles.fieldError : null}>
                                <InputField
                                    label="💼 Loan Name"
                                    value={draftData.loanName}
                                    onChangeText={(val) => setDraftData({ ...draftData, loanName: val })}
                                    placeholder="e.g., Car Loan, Mortgage, Student Loan"
                                />
                            </View>

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

                            <View style={(draftData.interestRate.trim() === '' || isNaN(parseFloat(draftData.interestRate)) || parseFloat(draftData.interestRate) < 0) ? styles.fieldError : null}>
                                <InputField
                                    label="📈 Interest Rate (%)"
                                    value={draftData.interestRate}
                                    onChangeText={(val) => setDraftData({ ...draftData, interestRate: val })}
                                    placeholder="Enter interest rate"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={(draftData.term.trim() === '' || isNaN(parseFloat(draftData.term)) || parseFloat(draftData.term) <= 0) ? styles.fieldError : null}>
                                <TermSelector
                                    term={draftData.term}
                                    onTermChange={(val) => setDraftData({ ...draftData, term: val })}
                                    termUnit={draftData.termUnit}
                                    onTermUnitChange={(val) => setDraftData({ ...draftData, termUnit: val })}
                                />
                            </View>

                            <View>
                                <Text style={styles.dateLabel}>📅 Starting Date</Text>
                                <input
                                    type="date"
                                    style={{
                                        backgroundColor: mode === 'dark' ? '#1f2937' : '#f8f9fa',
                                        borderWidth: 1.5,
                                        borderStyle: 'solid',
                                        borderColor: mode === 'dark' ? '#374151' : '#dee2e6',
                                        borderRadius: 8,
                                        padding: 14,
                                        fontSize: 14,
                                        color: mode === 'dark' ? '#f3f4f6' : '#1f2937',
                                        fontFamily: 'system-ui, -apple-system, sans-serif',
                                        width: '100%',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        minWidth: 0,
                                    }}
                                    value={(() => {
                                        const d = draftData.date;
                                        const year = d.getFullYear();
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const day = String(d.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}`;
                                    })()}
                                    onChange={(e) => onDraftDateChange(e.target.value)}
                                />
                            </View>
                        </>
                    )}
                </>
            </EditModal>
        </View>
    );
}

const createStyles = (colors: any, mode: string) => StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.background,
    },
    overlay: {
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 998,
    },
    hamburgerButton: {
        position: 'absolute' as any,
        top: 16,
        left: 16,
        zIndex: 1000,
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    hamburgerIcon: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    sidebar: {
        flex: 1,
        backgroundColor: colors.sidebar,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        flexDirection: 'column',
    },
    sidebarHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    appTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    closeSidebarButton: {
        padding: 8,
        borderRadius: 4,
    },
    closeSidebarIcon: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sidebarSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sidebarLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.sidebarText,
        letterSpacing: 1,
        marginBottom: 12,
    },
    sidebarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 6,
        marginBottom: 4,
    },
    sidebarButtonActive: {
        backgroundColor: colors.primary,
    },
    sidebarButtonIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    sidebarButtonText: {
        fontSize: 14,
        color: colors.sidebarText,
    },
    sidebarButtonTextActive: {
        color: colors.sidebarTextActive,
        fontWeight: '600',
    },
    sidebarQuickView: {
        marginTop: 'auto',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    quickViewLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 12,
    },
    quickViewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    quickViewKey: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    quickViewValue: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    sidebarFooter: {
        marginTop: 'auto',
        padding: 16,
        gap: 8,
    },
    appStoreBanner: {
        marginBottom: 12,
        backgroundColor: mode === 'dark' ? '#000000' : '#000000',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: mode === 'dark' ? '#333333' : '#000000',
        overflow: 'hidden',
    },
    appStoreBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    appStoreIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    appStoreIconImage: {
        width: 40,
        height: 40,
    },
    appStoreBannerText: {
        flex: 1,
    },
    appStoreBadgeSmall: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '400',
        letterSpacing: 0.5,
        marginBottom: -2,
    },
    appStoreBadgeLarge: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    appStoreBannerSubtitle: {
        fontSize: 10,
        color: '#A0A0A0',
        lineHeight: 14,
    },
    themeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
        gap: 10,
    },
    themeToggleIcon: {
        fontSize: 18,
    },
    themeToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.sidebarTextActive,
    },
    mainContent: {
        flex: 1,
    },
    contentContainer: {
        padding: 32,
        maxWidth: 1000,
        width: '100%',
        alignSelf: 'center',
    },
    loadingScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    pageSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    validationBadge: {
        backgroundColor: '#fef5e7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e67e22',
    },
    validationText: {
        fontSize: 12,
        color: '#e67e22',
        fontWeight: '600',
    },
    topButtonContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    exportButtonTop: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
    },
    exportButtonTopText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    duplicateButtonTop: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.success,
    },
    duplicateButtonTopText: {
        color: colors.success,
        fontSize: 14,
        fontWeight: '600',
    },
    exportButtonDisabled: {
        opacity: 0.5,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailsCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    detailsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    editButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    editButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: colors.textPrimary,
    },
    savingsContainer: {
        marginTop: 24,
        padding: 24,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    savingsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    savingsLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    savingsValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.success,
    },
    emptySavingsMessage: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    emptySavingsText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
        paddingHorizontal: 12,
    },
    addPaymentsButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 6,
    },
    addPaymentsButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    addAnotherPaymentButton: {
        backgroundColor: colors.primary,
        padding: 12,
        borderRadius: 6,
        alignItems: "center",
        marginTop: 16,
    },
    addAnotherPaymentButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    subtleLink: {
        padding: 8,
        alignItems: "center",
        marginTop: 8,
    },
    subtleLinkText: {
        color: colors.textSecondary,
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    rateAdjustmentContainer: {
        marginTop: 24,
        padding: 24,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    rateInfoNote: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        padding: 12,
        borderRadius: 6,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 193, 7, 0.3)',
    },
    rateInfoText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    rateAdjustmentCard: {
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    rateAdjustmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rateAdjustmentMonth: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    rateAdjustmentDate: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    rateAdjustmentRate: {
        fontSize: 16,
        color: colors.warning,
        fontWeight: 'bold',
    },
    rateAdjustmentName: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        fontStyle: 'italic',
    },
    manageRatesButton: {
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    manageRatesButtonText: {
        color: colors.warning,
        fontSize: 14,
        fontWeight: '600',
    },
    chartsSection: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 24,
        flexWrap: 'wrap',
    },
    chartCard: {
        flex: 1,
        minWidth: 350,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    insightsPanel: {
        flex: 1,
        backgroundColor: colors.background,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        padding: 20,
    },
    insightsPanelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    insightCard: {
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    insightLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    insightValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    insightSubtext: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    insightBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: '#e67e22',
        textTransform: 'uppercase',
        backgroundColor: '#fef5e7',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    insightBadgeGreen: {
        fontSize: 9,
        fontWeight: '700',
        color: '#22c55e',
        textTransform: 'uppercase',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    insightText: {
        fontSize: 11,
        lineHeight: 16,
        color: colors.textSecondary,
    },
    fieldError: {
        borderWidth: 2,
        borderColor: '#ef4444',
        borderRadius: 8,
        padding: 2,
        marginBottom: 8,
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: colors.textPrimary,
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    modalCancelButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    modalSaveButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    modalSaveButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default function LoanOverviewScreenWeb() {
    return (
        <ThemeProvider>
            <LoanOverviewScreenWebContent />
        </ThemeProvider>
    );
}
