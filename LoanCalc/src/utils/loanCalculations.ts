import { EarlyPayment } from '../components/EarlyPaymentList';

export type RateAdjustment = {
    month: number;       // Month when rate changes (1-indexed)
    newRate: number;     // New annual interest rate (as percentage, e.g., 5 for 5%)
    date?: string;       // Optional: exact date (YYYY-MM-DD) - if provided, month is calculated from this
};

export type LoanParams = {
    principal: number;
    annualRate: number;
    termInMonths: number;
};

export type PaymentScheduleParams = {
    principal: number;
    annualRate: number;
    termInMonths: number;
    startDate: Date;
    earlyPayments?: EarlyPayment[];
    rateAdjustments?: RateAdjustment[];
};

export type PaymentDetail = {
    paymentNumber: number;
    date: string;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
};

export type PaymentCalculation = {
    monthlyPayment: number;
    totalPayment: number;
};

export type SavingsCalculation = {
    interestSaved: number;
    periodDecrease: number;
    totalInterest: number;
    actualTotalPayment: number;
};

/**
 * Calculate monthly payment using standard amortization formula
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate (as percentage, e.g., 5 for 5%)
 * @param termInMonths - Loan term in months
 * @returns Monthly payment and total payment
 */
export function calculatePayment({ principal, annualRate, termInMonths }: LoanParams): PaymentCalculation {
    // Validate inputs - allow 0% interest rate
    if (principal == null || annualRate == null || termInMonths == null || 
        isNaN(principal) || isNaN(annualRate) || isNaN(termInMonths) ||
        principal <= 0 || annualRate < 0 || termInMonths <= 0) {
        return { monthlyPayment: 0, totalPayment: 0 };
    }

    const monthlyRate = annualRate / 100 / 12; // Convert annual percentage to monthly decimal

    // Handle 0% interest rate (simple division)
    if (monthlyRate === 0) {
        const monthlyPayment = principal / termInMonths;
        return {
            monthlyPayment,
            totalPayment: monthlyPayment * termInMonths,
        };
    }

    // Standard amortization formula
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) / (Math.pow(1 + monthlyRate, termInMonths) - 1);
    const totalPayment = monthlyPayment * termInMonths;

    return { monthlyPayment, totalPayment };
}

/**
 * Calculate total early payments applicable for a specific month
 * 
 * @param month - Current month (1-indexed)
 * @param earlyPayments - Array of early payment configurations
 * @returns Total early payment amount for this month
 */
export function getEarlyPaymentsForMonth(month: number, earlyPayments: EarlyPayment[]): number {
    let totalEarlyPayment = 0;

    earlyPayments.forEach(payment => {
        const amount = parseFloat(payment.amount) || 0;

        if (payment.type === "recurring") {
            const startMonth = parseInt(payment.month) || 1;
            const frequency = parseInt(payment.frequency || "1");

            // Check if this month qualifies for recurring payment
            if (month >= startMonth && (month - startMonth) % frequency === 0) {
                totalEarlyPayment += amount;
            }
        } else if (payment.type === "one-time" && parseInt(payment.month) === month) {
            // One-time payments apply to specific month
            totalEarlyPayment += amount;
        }
    });

    return totalEarlyPayment;
}

/**
 * Project forward to find the actual payoff month considering current trajectory
 * This accounts for early payments when calculating remaining term
 * 
 * @param currentMonth - Current month in schedule (1-indexed)
 * @param currentBalance - Remaining balance at current month
 * @param baseMonthlyPayment - Regular monthly payment (before early payments)
 * @param currentRate - Current interest rate (as percentage)
 * @param earlyPayments - Array of early payment configurations
 * @returns Projected month when loan will be paid off
 */
function calculateProjectedPayoffMonth(
    currentMonth: number,
    currentBalance: number,
    baseMonthlyPayment: number,
    currentRate: number,
    earlyPayments: EarlyPayment[]
): number {
    let balance = currentBalance;
    let month = currentMonth;
    const monthlyRate = currentRate / 100 / 12;
    const maxMonths = 1200; // Safety limit (100 years)

    while (balance > 0 && month < maxMonths) {
        // Calculate total payment for this month
        let totalPayment = baseMonthlyPayment + getEarlyPaymentsForMonth(month, earlyPayments);

        // Calculate interest and principal
        const interest = balance * monthlyRate;
        const principal = Math.min(totalPayment - interest, balance);
        
        balance -= principal;
        month++;

        // Stop if paid off
        if (balance <= 0) break;
    }

    return month - 1; // Return last payment month
}

/**
 * Generate detailed payment schedule showing how each payment is split between principal and interest
 * 
 * @param params - Loan parameters and optional early payments
 * @returns Array of payment details for each month
 */
export function generatePaymentSchedule({ 
    principal, 
    annualRate, 
    termInMonths, 
    startDate, 
    earlyPayments = [],
    rateAdjustments = []
}: PaymentScheduleParams): PaymentDetail[] {
    // Validate inputs
    if (!principal || !annualRate || !termInMonths || principal <= 0 || annualRate < 0 || termInMonths <= 0) {
        return [];
    }

    // Validate startDate
    if (!startDate || isNaN(startDate.getTime())) {
        return [];
    }

    // Sort rate adjustments by month
    const sortedRateAdjustments = [...rateAdjustments].sort((a, b) => a.month - b.month);

    // Initialize with starting rate
    let currentRate = annualRate;
    let monthlyRate = currentRate / 100 / 12;

    const schedule: PaymentDetail[] = [];
    let balance = principal;

    // Calculate INITIAL monthly payment (month 1) using original principal and term
    let monthlyPayment = calculatePayment({
        principal: principal,
        annualRate: currentRate,
        termInMonths: termInMonths
    }).monthlyPayment;

    // Track remaining months throughout the loop
    let remainingMonths = termInMonths;

    // Generate payment details for each month
    for (let i = 0; i < termInMonths; i++) {
        // Stop if loan is paid off early
        if (balance <= 0) break;

        const currentMonth = i + 1; // 1-indexed month number

        // STEP 1: Check for early payment BEFORE processing regular payment
        const earlyPaymentAmount = getEarlyPaymentsForMonth(currentMonth, earlyPayments);
        if (earlyPaymentAmount > 0) {
            console.log(`Month ${currentMonth}: Processing early payment of ${earlyPaymentAmount} BEFORE regular payment`);
            console.log(`  Balance BEFORE early payment: ${balance.toFixed(2)}`);
                        
            // Apply early payment principal (early payment - interest on that early payment's portion)
            const earlyPaymentPrincipal = Math.min(earlyPaymentAmount, balance);
            balance -= earlyPaymentPrincipal;
            
            console.log(`  Balance AFTER early payment: ${balance.toFixed(2)}`);
            
            // Recalculate remaining months by projecting payoff with current monthly payment
            const projectedPayoffMonth = calculateProjectedPayoffMonth(
                currentMonth,
                balance,
                monthlyPayment,
                currentRate,
                [] // No future early payments in projection - we already applied this one
            );
            
            remainingMonths = Math.max(1, projectedPayoffMonth - currentMonth + 1);
            console.log(`  Projected payoff month: ${projectedPayoffMonth}, remaining months: ${remainingMonths}`);
        }

        // STEP 2: Check if rate adjusts this month
        const rateChange = sortedRateAdjustments.find(adj => adj.month === currentMonth);
        if (rateChange) {
            // Calculate payment date for this month
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(startDate.getMonth() + i);
            const paymentDateStr = paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            
            console.log(`\n📊 RATE CHANGE DETECTED:`);
            console.log(`  Payment #${currentMonth} - ${paymentDateStr}`);
            if (rateChange.date) {
                console.log(`  Rate change date (stored): ${rateChange.date}`);
            }
            console.log(`  Rate: ${currentRate}% → ${rateChange.newRate}%`);
            console.log(`  Balance when rate changes: ${balance.toFixed(2)}`);
            
            // Detect if both early payment and rate change happen same month
            if (earlyPaymentAmount > 0) {
                console.log(`  ⚠️ SCENARIO: Both early payment ($${earlyPaymentAmount}) AND rate change in same month`);
            }
            
            // Update to new rate
            currentRate = rateChange.newRate;
            monthlyRate = currentRate / 100 / 12;
            
            // STEP 3: Recalculate monthly payment when rate changes
            // If there was an early payment, remainingMonths was modified by projection
            // For rate changes, we should use the early-payment-adjusted remainingMonths if it exists,
            // otherwise use the actual remaining months
            // This handles both scenarios: rate change alone, or rate change + early payment
            monthlyPayment = calculatePayment({
                principal: balance,
                annualRate: currentRate,
                termInMonths: remainingMonths
            }).monthlyPayment;
            
            console.log(`  New monthly payment: ${monthlyPayment.toFixed(2)}`);
            console.log(`  Remaining months: ${remainingMonths}\n`);
        }

        // STEP 4: Process regular monthly payment
        const interestPayment = balance * monthlyRate;
        const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
        balance -= principalPayment;

        // Decrement remaining months for next iteration
        remainingMonths = Math.max(1, remainingMonths - 1);

        // Calculate payment date (add i months to start date)
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(startDate.getMonth() + i);

        // STEP 5: Record this month in the schedule (early payment is NOT shown, only regular payment)
        schedule.push({
            paymentNumber: i + 1,
            date: paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            payment: monthlyPayment + earlyPaymentAmount, // Include early payment in total
            principal: principalPayment,
            interest: interestPayment,
            balance: Math.max(0, balance),
        });
    }

    return schedule;
}

/**
 * Calculate savings from early payments by comparing with original schedule
 * 
 * @param params - Loan parameters with early payments
 * @returns Interest saved, time saved, total interest, and actual total payment
 */
export function calculateSavings({ 
    principal, 
    annualRate, 
    termInMonths, 
    startDate, 
    earlyPayments = [],
    rateAdjustments = []
}: PaymentScheduleParams): SavingsCalculation {
    // Generate schedule with early payments and rate adjustments
    const scheduleWithEarlyPayments = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate, 
        earlyPayments,
        rateAdjustments
    });

    // Generate original schedule without early payments but with rate adjustments
    const originalSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate, 
        earlyPayments: [],
        rateAdjustments
    });

    // Calculate total interest with early payments
    const totalInterest = scheduleWithEarlyPayments.reduce((sum, payment) => sum + payment.interest, 0);
    
    // Calculate total interest without early payments
    const originalTotalInterest = originalSchedule.reduce((sum, payment) => sum + payment.interest, 0);
    
    // Calculate interest saved
    const interestSaved = originalTotalInterest - totalInterest;
    
    // Calculate time saved (months)
    const periodDecrease = originalSchedule.length - scheduleWithEarlyPayments.length;
    
    // Calculate actual total payment (principal + interest)
    const actualTotalPayment = scheduleWithEarlyPayments.reduce((sum, payment) => sum + payment.payment, 0);

    return {
        interestSaved,
        periodDecrease,
        totalInterest,
        actualTotalPayment,
    };
}

/**
 * Calculate remaining balance at a specific payment number
 * 
 * @param principal - Original loan amount
 * @param monthlyPayment - Monthly payment amount
 * @param paymentsMade - Number of payments made so far
 * @returns Remaining balance
 */
export function calculateRemainingBalance(principal: number, monthlyPayment: number, paymentsMade: number): number {
    // Simple approximation - for more accuracy, should use payment schedule
    return Math.max(0, principal - (monthlyPayment * paymentsMade));
}

/**
 * Convert term to months based on unit
 * 
 * @param term - Term value
 * @param termUnit - Unit of term (months or years)
 * @returns Term in months
 */
export function convertTermToMonths(term: number, termUnit: 'months' | 'years'): number {
    return termUnit === 'years' ? term * 12 : term;
}
