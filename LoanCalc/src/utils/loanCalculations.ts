import { EarlyPayment } from '../components/EarlyPaymentList';

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
    // Validate inputs
    if (!principal || !annualRate || !termInMonths || principal <= 0 || annualRate < 0 || termInMonths <= 0) {
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
    earlyPayments = [] 
}: PaymentScheduleParams): PaymentDetail[] {
    // Validate inputs
    if (!principal || !annualRate || !termInMonths || principal <= 0 || annualRate < 0 || termInMonths <= 0) {
        return [];
    }

    // Validate startDate
    if (!startDate || isNaN(startDate.getTime())) {
        return [];
    }

    const monthlyRate = annualRate / 100 / 12;
    const { monthlyPayment } = calculatePayment({ principal, annualRate, termInMonths });

    const schedule: PaymentDetail[] = [];
    let balance = principal;

    // Generate payment details for each month
    for (let i = 0; i < termInMonths; i++) {
        // Stop if loan is paid off early
        if (balance <= 0) break;

        // Interest is calculated on remaining balance
        const interestPayment = balance * monthlyRate;
        let totalPayment = monthlyPayment;

        // Add all applicable early payments for this month
        earlyPayments.forEach(payment => {
            const amount = parseFloat(payment.amount) || 0;
            const currentMonth = i + 1; // 1-indexed month number

            if (payment.type === "recurring") {
                const startMonth = parseInt(payment.month) || 1;
                const frequency = parseInt(payment.frequency || "1");

                // Check if this month qualifies for recurring payment
                if (currentMonth >= startMonth && (currentMonth - startMonth) % frequency === 0) {
                    totalPayment += amount;
                }
            } else if (payment.type === "one-time" && parseInt(payment.month) === currentMonth) {
                // One-time payments apply to specific month
                totalPayment += amount;
            }
        });

        // Calculate principal payment (can't exceed remaining balance)
        const principalPayment = Math.min(totalPayment - interestPayment, balance);
        balance -= principalPayment;

        // Calculate payment date (add i months to start date)
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(startDate.getMonth() + i);

        // Push payment details into schedule array
        schedule.push({
            paymentNumber: i + 1,
            date: paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            payment: interestPayment + principalPayment,
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
    earlyPayments = [] 
}: PaymentScheduleParams): SavingsCalculation {
    // Generate schedule with early payments
    const scheduleWithEarlyPayments = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate, 
        earlyPayments 
    });

    // Generate original schedule without early payments
    const originalSchedule = generatePaymentSchedule({ 
        principal, 
        annualRate, 
        termInMonths, 
        startDate, 
        earlyPayments: [] 
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
