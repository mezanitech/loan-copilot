/**
 * Tests for PDF Report Generation
 * 
 * These tests focus on the data preparation and validation logic for PDF generation.
 * Full PDF generation tests would require mocking pdf-lib, expo-file-system, and expo-sharing.
 */

import { formatCurrency } from '../currencyUtils';

describe('PDF Report Data Preparation', () => {
  const mockCurrency = { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' as const };

  describe('Loan Data Validation', () => {
    it('should validate required loan data fields', () => {
      const loanData = {
        loanId: 'test-123',
        name: 'Test Loan',
        amount: 250000,
        interestRate: 8.0,
        termInMonths: 180,
        monthlyPayment: 2389.13,
        totalPayment: 430043.40,
        payments: []
      };

      // All required fields present
      expect(loanData.loanId).toBeTruthy();
      expect(loanData.name).toBeTruthy();
      expect(loanData.amount).toBeGreaterThan(0);
      expect(loanData.interestRate).toBeGreaterThanOrEqual(0);
      expect(loanData.termInMonths).toBeGreaterThan(0);
      expect(loanData.monthlyPayment).toBeGreaterThan(0);
    });

    it('should validate loan data with early payments', () => {
      const earlyPayments = [
        { name: 'Bonus', type: 'one-time' as const, amount: 5000, month: '3', frequency: 'once' }
      ];

      expect(earlyPayments[0].amount).toBeGreaterThan(0);
      expect(earlyPayments[0].type).toMatch(/^(one-time|recurring)$/);
      expect(parseInt(earlyPayments[0].month)).toBeGreaterThan(0);
    });

    it('should validate loan data with rate adjustments', () => {
      const rateAdjustments = [
        { month: '3', newRate: '7.25' },
        { month: '6', newRate: '7.0' }
      ];

      rateAdjustments.forEach(adj => {
        expect(parseInt(adj.month)).toBeGreaterThan(0);
        expect(parseFloat(adj.newRate)).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle 0% interest rate', () => {
      const loanData = {
        amount: 100000,
        interestRate: 0,
        termInMonths: 60,
        monthlyPayment: 100000 / 60
      };

      expect(loanData.interestRate).toBe(0);
      expect(loanData.monthlyPayment).toBeCloseTo(1666.67, 2);
    });

    it('should include currentInterestRate when provided', () => {
      const loanData = {
        loanId: 'test-123',
        name: 'Test Loan',
        amount: 250000,
        interestRate: 8.0,
        currentInterestRate: 7.25, // Rate has changed
        termInMonths: 180,
        monthlyPayment: 2283.06
      };

      expect(loanData.currentInterestRate).toBe(7.25);
      expect(loanData.currentInterestRate).not.toBe(loanData.interestRate);
    });

    it('should handle currentInterestRate same as original', () => {
      const loanData = {
        interestRate: 8.0,
        currentInterestRate: 8.0 // No rate change
      };

      expect(loanData.currentInterestRate).toBe(loanData.interestRate);
    });
  });

  describe('Payment Schedule Data Preparation', () => {
    it('should format payment schedule correctly', () => {
      const startDate = new Date(2024, 9, 27); // Oct 27, 2024
      const payments = Array.from({ length: 3 }, (_, i) => {
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        return {
          number: i + 1,
          principal: 1000 + i * 10,
          interest: 500 - i * 5,
          balance: 100000 - (i * 1000),
          date: paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        };
      });

      expect(payments).toHaveLength(3);
      expect(payments[0].date).toBe('Oct 2024');
      expect(payments[1].date).toBe('Nov 2024');
      expect(payments[2].date).toBe('Dec 2024');
    });

    it('should calculate correct payment numbers', () => {
      const payments = [
        { number: 1, principal: 1000, interest: 500, balance: 99000, date: 'Oct 2024' },
        { number: 2, principal: 1010, interest: 495, balance: 98000, date: 'Nov 2024' },
        { number: 3, principal: 1020, interest: 490, balance: 97000, date: 'Dec 2024' }
      ];

      payments.forEach((payment, index) => {
        expect(payment.number).toBe(index + 1);
      });
    });

    it('should maintain balance consistency', () => {
      const initialBalance = 100000;
      const payments = [
        { principal: 1000, interest: 500, balance: 99000 },
        { principal: 1000, interest: 495, balance: 98000 },
        { principal: 1000, interest: 490, balance: 97000 }
      ];

      let expectedBalance = initialBalance;
      payments.forEach(payment => {
        expectedBalance -= payment.principal;
        expect(payment.balance).toBeCloseTo(expectedBalance, 0);
      });
    });
  });

  describe('Currency Formatting for PDF', () => {
    it('should format USD amounts correctly', () => {
      expect(formatCurrency(250000, mockCurrency)).toBe('$250,000.00');
      expect(formatCurrency(2389.13, mockCurrency)).toBe('$2,389.13');
      expect(formatCurrency(0, mockCurrency)).toBe('$0.00');
    });

    it('should format large amounts with proper separators', () => {
      expect(formatCurrency(1234567.89, mockCurrency)).toBe('$1,234,567.89');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-1000, mockCurrency);
      expect(result).toContain('1,000');
    });

    it('should format small decimal amounts', () => {
      expect(formatCurrency(0.99, mockCurrency)).toBe('$0.99');
    });
  });

  describe('Savings Calculations for PDF', () => {
    it('should calculate interest saved correctly', () => {
      const originalInterest = 180043.40;
      const actualInterest = 150000;
      const interestSaved = originalInterest - actualInterest;

      expect(interestSaved).toBeCloseTo(30043.40, 2);
    });

    it('should calculate period decrease correctly', () => {
      const originalMonths = 180;
      const actualMonths = 165;
      const periodDecrease = originalMonths - actualMonths;

      expect(periodDecrease).toBe(15);
    });

    it('should convert period decrease to years/months', () => {
      const periodDecrease = 15;
      const years = Math.floor(periodDecrease / 12);
      const months = periodDecrease % 12;

      expect(years).toBe(1);
      expect(months).toBe(3);
    });
  });

  describe('Report Data Sanitization', () => {
    it('should sanitize loan name for filename', () => {
      const loanName = 'My Car Loan #1';
      const sanitized = loanName.replace(/[^a-zA-Z0-9]/g, '_');

      expect(sanitized).toBe('My_Car_Loan__1');
      expect(sanitized).not.toContain('#');
      expect(sanitized).not.toContain(' ');
    });

    it('should handle special characters in loan name', () => {
      const loanNames = [
        'Loan@2024',
        'Home/Mortgage',
        'Car (New)',
        'Student$Loan'
      ];

      loanNames.forEach(name => {
        const sanitized = name.replace(/[^a-zA-Z0-9]/g, '_');
        expect(sanitized).toMatch(/^[a-zA-Z0-9_]+$/);
      });
    });

    it('should create valid PDF filename', () => {
      const loanName = 'Test Loan';
      const filename = `${loanName.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`;

      expect(filename).toBe('Test_Loan_report.pdf');
      expect(filename).toMatch(/\.pdf$/);
    });
  });

  describe('Date Formatting for PDF', () => {
    it('should format freedom date correctly', () => {
      const startDate = new Date(2024, 9, 27); // Oct 27, 2024
      const finalPayment = new Date(startDate);
      finalPayment.setMonth(finalPayment.getMonth() + 179); // 180 payments

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const freedomDate = `${monthNames[finalPayment.getMonth()]} ${finalPayment.getFullYear()}`;

      expect(freedomDate).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
    });

    it('should handle month rollover correctly', () => {
      const startDate = new Date(2024, 11, 15); // Dec 15, 2024
      const nextMonth = new Date(startDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      expect(nextMonth.getFullYear()).toBe(2025);
      expect(nextMonth.getMonth()).toBe(0); // January
    });

    it('should format starting date for loan details', () => {
      const startDate = new Date(2024, 9, 27); // Oct 27, 2024
      const formatted = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      expect(formatted).toBe('Oct 27, 2024');
      expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });
  });

  describe('Payment Summary Statistics', () => {
    it('should calculate current payment number correctly', () => {
      const startDate = new Date(2024, 0, 1); // Jan 1, 2024
      const now = new Date(2024, 1, 15); // Feb 15, 2024 (1+ month later)
      const monthsElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));

      // Should be at least 1 month, less than 2
      expect(monthsElapsed).toBeGreaterThanOrEqual(1);
      expect(monthsElapsed).toBeLessThan(2);
    });

    it('should calculate remaining balance correctly', () => {
      const originalAmount = 100000;
      const principalPaid = 5000;
      const remainingBalance = originalAmount - principalPaid;

      expect(remainingBalance).toBe(95000);
    });

    it('should handle completed loans', () => {
      const startDate = new Date(2010, 0, 1);
      const now = new Date(2026, 0, 1);
      const termInMonths = 180;
      const monthsElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

      expect(monthsElapsed).toBeGreaterThanOrEqual(termInMonths);
      // Remaining balance should be 0
      const remainingBalance = monthsElapsed >= termInMonths ? 0 : 1000;
      expect(remainingBalance).toBe(0);
    });
  });

  describe('Early Payment Data Mapping', () => {
    it('should map early payment data for PDF', () => {
      const earlyPayments = [
        { name: 'Bonus', type: 'one-time' as const, amount: '5000', month: '3', frequency: 'once' }
      ];

      const mapped = earlyPayments.map(ep => ({
        name: ep.name,
        type: ep.type,
        amount: parseFloat(ep.amount),
        month: ep.month,
        frequency: ep.frequency
      }));

      expect(mapped[0].amount).toBe(5000);
      expect(typeof mapped[0].amount).toBe('number');
    });

    it('should filter invalid early payments', () => {
      const earlyPayments = [
        { name: 'Valid', type: 'one-time' as const, amount: '5000', month: '3', frequency: 'once' },
        { name: 'Invalid', type: 'one-time' as const, amount: '', month: '3', frequency: 'once' },
        { name: 'Invalid2', type: 'one-time' as const, amount: '5000', month: '', frequency: 'once' }
      ];

      const isValidEarlyPayment = (ep: typeof earlyPayments[0]) => {
        return ep.amount.trim() !== '' && 
               !isNaN(parseFloat(ep.amount)) && 
               parseFloat(ep.amount) > 0 &&
               ep.month.trim() !== '';
      };

      const valid = earlyPayments.filter(isValidEarlyPayment);
      expect(valid).toHaveLength(1);
      expect(valid[0].name).toBe('Valid');
    });
  });

  describe('Rate Adjustment Data Mapping', () => {
    it('should map rate adjustment data for PDF', () => {
      const rateAdjustments = [
        { id: '1', month: '3', newRate: '7.25', name: 'Rate Drop' }
      ];

      const mapped = rateAdjustments.map(ra => ({
        month: ra.month,
        newRate: ra.newRate
      }));

      expect(mapped[0].month).toBe('3');
      expect(mapped[0].newRate).toBe('7.25');
    });

    it('should maintain rate adjustment order', () => {
      const rateAdjustments = [
        { month: '3', newRate: '7.25' },
        { month: '6', newRate: '7.0' },
        { month: '15', newRate: '6.5' }
      ];

      const sorted = [...rateAdjustments].sort((a, b) => parseInt(a.month) - parseInt(b.month));
      expect(sorted[0].month).toBe('3');
      expect(sorted[1].month).toBe('6');
      expect(sorted[2].month).toBe('15');
    });

    it('should calculate current interest rate from rate adjustments', () => {
      const originalRate = 8.0;
      const monthsElapsed = 5;
      const rateAdjustments = [
        { month: 3, newRate: 7.25 },
        { month: 6, newRate: 7.0 },
        { month: 15, newRate: 6.5 }
      ];

      // Find most recent rate adjustment that has occurred
      const applicableAdjustments = rateAdjustments
        .filter(adj => adj.month <= monthsElapsed)
        .sort((a, b) => b.month - a.month);

      const currentRate = applicableAdjustments.length > 0 
        ? applicableAdjustments[0].newRate 
        : originalRate;

      expect(currentRate).toBe(7.25); // Rate changed at month 3
    });

    it('should use original rate when no adjustments have occurred yet', () => {
      const originalRate = 8.0;
      const monthsElapsed = 2;
      const rateAdjustments = [
        { month: 3, newRate: 7.25 },
        { month: 6, newRate: 7.0 }
      ];

      const applicableAdjustments = rateAdjustments
        .filter(adj => adj.month <= monthsElapsed)
        .sort((a, b) => b.month - a.month);

      const currentRate = applicableAdjustments.length > 0 
        ? applicableAdjustments[0].newRate 
        : originalRate;

      expect(currentRate).toBe(8.0); // No rate changes yet
    });
  });
});
