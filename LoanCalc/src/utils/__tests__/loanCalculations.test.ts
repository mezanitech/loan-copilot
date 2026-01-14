import { 
    calculatePayment, 
    generatePaymentSchedule, 
    RateAdjustment 
} from '../loanCalculations';

describe('Loan Calculations', () => {
    describe('Basic Payment Calculation', () => {
        test('250k loan at 8% for 15 years = $2,389.13/month', () => {
            const result = calculatePayment({
                principal: 250000,
                annualRate: 8,
                termInMonths: 180
            });
            
            expect(result.monthlyPayment).toBeCloseTo(2389.13, 2);
        });

        test('0% interest rate should divide principal by term', () => {
            const result = calculatePayment({
                principal: 120000,
                annualRate: 0,
                termInMonths: 120
            });
            
            // With 0% interest, payment is principal / term
            expect(result.monthlyPayment).toBeCloseTo(1000, 2);
            expect(result.totalPayment).toBeCloseTo(120000, 2);
        });
    });

    describe('Rate Change Calculations', () => {
        test('Rate change on Nov 27, 2024 (Payment #3) with Aug 27, 2024 start', () => {
            const startDate = new Date(2024, 7, 27); // Aug 27, 2024
            const rateAdjustments: RateAdjustment[] = [
                { 
                    month: 3, 
                    newRate: 7.25,
                    date: '2024-11-27'
                }
            ];
            
            const schedule = generatePaymentSchedule({
                principal: 250000,
                annualRate: 8,
                termInMonths: 180,
                startDate,
                rateAdjustments
            });
            
            // First 2 payments should be at 8% rate
            expect(schedule[0].payment).toBeCloseTo(2389.13, 2);
            expect(schedule[1].payment).toBeCloseTo(2389.13, 2);
            
            // Payment #3 onwards should be at new 7.25% rate
            // Expected: $2,283.06 with 178 months remaining
            expect(schedule[2].payment).toBeCloseTo(2283.06, 2);
        });

        test('Multiple rate changes applied in correct order', () => {
            const startDate = new Date(2024, 7, 27);
            const rateAdjustments: RateAdjustment[] = [
                { month: 3, newRate: 7.25, date: '2024-11-27' },
                { month: 6, newRate: 7.00, date: '2025-02-27' },
                { month: 15, newRate: 6.50, date: '2025-11-27' }
            ];
            
            const schedule = generatePaymentSchedule({
                principal: 250000,
                annualRate: 8,
                termInMonths: 180,
                startDate,
                rateAdjustments
            });
            
            // Payments 1-2: 8%
            expect(schedule[0].payment).toBeCloseTo(2389.13, 2);
            
            // Payment 3-5: 7.25%
            expect(schedule[2].payment).toBeCloseTo(2283.06, 2);
            
            // Payment 6-14: 7%
            expect(schedule[5].payment).toBeCloseTo(2248.73, 1);
            
            // Payment 15+: 6.5%
            expect(schedule[14].payment).toBeCloseTo(2183.72, 1);
        });

        test('Balance decreases correctly with rate changes', () => {
            const startDate = new Date(2024, 7, 27);
            const rateAdjustments: RateAdjustment[] = [
                { month: 3, newRate: 7.25 }
            ];
            
            const schedule = generatePaymentSchedule({
                principal: 250000,
                annualRate: 8,
                termInMonths: 180,
                startDate,
                rateAdjustments
            });
            
            // Balance should decrease each month
            for (let i = 1; i < schedule.length; i++) {
                expect(schedule[i].balance).toBeLessThan(schedule[i - 1].balance);
            }
            
            // Final balance should be ~0
            expect(schedule[schedule.length - 1].balance).toBeCloseTo(0, 0);
        });
    });

    describe('Date-based Month Calculation', () => {
        test('Nov 27 is 3 months after Aug 27 (same year)', () => {
            const loanStart = new Date(2024, 7, 27); // Aug 27
            const rateChange = new Date(2024, 10, 27); // Nov 27
            
            const monthsDiff = (rateChange.getFullYear() - loanStart.getFullYear()) * 12 + 
                             (rateChange.getMonth() - loanStart.getMonth());
            
            expect(monthsDiff).toBe(3);
        });

        test('Nov 27, 2025 is 15 months after Aug 27, 2024', () => {
            const loanStart = new Date(2024, 7, 27); // Aug 27, 2024
            const rateChange = new Date(2025, 10, 27); // Nov 27, 2025
            
            const monthsDiff = (rateChange.getFullYear() - loanStart.getFullYear()) * 12 + 
                             (rateChange.getMonth() - loanStart.getMonth());
            
            expect(monthsDiff).toBe(15);
        });

        test('Feb 28, 2025 is 6 months after Aug 27, 2024', () => {
            const loanStart = new Date(2024, 7, 27); // Aug 27, 2024
            const rateChange = new Date(2025, 1, 28); // Feb 28, 2025
            
            const monthsDiff = (rateChange.getFullYear() - loanStart.getFullYear()) * 12 + 
                             (rateChange.getMonth() - loanStart.getMonth());
            
            expect(monthsDiff).toBe(6);
        });
    });

    describe('Payment Schedule Structure', () => {
        test('Schedule has correct number of payments', () => {
            const schedule = generatePaymentSchedule({
                principal: 250000,
                annualRate: 8,
                termInMonths: 180,
                startDate: new Date(2024, 7, 27)
            });
            
            expect(schedule).toHaveLength(180);
        });

        test('Each payment has required fields', () => {
            const schedule = generatePaymentSchedule({
                principal: 100000,
                annualRate: 5,
                termInMonths: 60,
                startDate: new Date(2024, 0, 1)
            });
            
            schedule.forEach((payment, index) => {
                expect(payment).toHaveProperty('paymentNumber');
                expect(payment).toHaveProperty('date');
                expect(payment).toHaveProperty('payment');
                expect(payment).toHaveProperty('principal');
                expect(payment).toHaveProperty('interest');
                expect(payment).toHaveProperty('balance');
                
                expect(payment.paymentNumber).toBe(index + 1);
                expect(payment.payment).toBeGreaterThan(0);
                expect(payment.principal).toBeGreaterThan(0);
                expect(payment.interest).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Edge Cases', () => {
        test('Invalid inputs return empty schedule', () => {
            const schedule = generatePaymentSchedule({
                principal: -1000,
                annualRate: 5,
                termInMonths: 12,
                startDate: new Date(2024, 0, 1)
            });
            
            expect(schedule).toHaveLength(0);
        });

        test('Zero principal returns empty schedule', () => {
            const schedule = generatePaymentSchedule({
                principal: 0,
                annualRate: 5,
                termInMonths: 12,
                startDate: new Date(2024, 0, 1)
            });
            
            expect(schedule).toHaveLength(0);
        });

        test('Invalid date returns empty schedule', () => {
            const schedule = generatePaymentSchedule({
                principal: 100000,
                annualRate: 5,
                termInMonths: 12,
                startDate: new Date('invalid')
            });
            
            expect(schedule).toHaveLength(0);
        });
    });

    describe('Interest and Principal Split', () => {
        test('First payment has more interest than principal (typical loan)', () => {
            const schedule = generatePaymentSchedule({
                principal: 250000,
                annualRate: 8,
                termInMonths: 180,
                startDate: new Date(2024, 7, 27)
            });
            
            const firstPayment = schedule[0];
            expect(firstPayment.interest).toBeGreaterThan(firstPayment.principal);
        });

        test('Last payment has more principal than interest', () => {
            const schedule = generatePaymentSchedule({
                principal: 250000,
                annualRate: 8,
                termInMonths: 180,
                startDate: new Date(2024, 7, 27)
            });
            
            const lastPayment = schedule[schedule.length - 1];
            expect(lastPayment.principal).toBeGreaterThan(lastPayment.interest);
        });

        test('Payment = Principal + Interest for each month', () => {
            const schedule = generatePaymentSchedule({
                principal: 100000,
                annualRate: 6,
                termInMonths: 60,
                startDate: new Date(2024, 0, 1)
            });
            
            schedule.forEach(payment => {
                const sum = payment.principal + payment.interest;
                expect(sum).toBeCloseTo(payment.payment, 2);
            });
        });
    });
});
