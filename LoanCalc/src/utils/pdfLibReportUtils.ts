import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Currency } from './storage';
import { formatCurrency } from './currencyUtils';

export interface LoanData {
  loanId: string;
  name: string;
  amount: number;
  interestRate: number;
  termInMonths: number;
  monthlyPayment: number;
  totalPayment: number;
  payments: {
    number: number;
    principal: number;
    interest: number;
    balance: number;
    date: string;
    // Portfolio-specific fields
    loanName?: string;
    interestRate?: number;
    term?: string;
    totalInterest?: number;
    startDate?: string;
    freedomDate?: string | null;
    earlyPayments?: { 
      name?: string;
      type: 'one-time' | 'recurring';
      amount: number;
      month: string;
      frequency?: string;
    }[];
    rateAdjustments?: {
      month: string;
      newRate: string;
    }[];
  }[];
  // Optional fields for individual loan reports
  interestSaved?: number;
  periodDecrease?: number;
  earlyPayments?: { 
    name?: string;
    type: 'one-time' | 'recurring';
    amount: number;
    month: string;
    frequency?: string;
  }[];
  rateAdjustments?: {
    month: string;
    newRate: string;
  }[];
  // Additional fields for enhanced individual loan reports
  currentBalance?: number;
  currentPaymentNumber?: number;
  totalPayments?: number;
  originalTotalPayment?: number;
  originalTotalInterest?: number;
}

export async function generateRobustLoanPDF(loanData: LoanData, currency: Currency, startDate?: Date): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Embed the app icon
  const iconBase64 = "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"; // Replace with base64 string
  const iconImageBytes = Uint8Array.from(atob(iconBase64), c => c.charCodeAt(0));
  const iconImage = await pdfDoc.embedPng(iconImageBytes);
  
  // Constants for layout
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const headerHeight = 80;
  const footerHeight = 40;
  const contentTop = pageHeight - margin - headerHeight;
  const contentBottom = margin + footerHeight;
  const rowHeight = 18;
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = contentTop;
  
  // Function to add header to any page
  const addHeader = (page: any) => {
    // Header background with subtle gradient effect using rectangles
    page.drawRectangle({
      x: margin - 10,
      y: pageHeight - margin - 65,
      width: pageWidth - 2 * margin + 20,
      height: 70,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.2, 0.4, 0.7),
      borderWidth: 0.5,
    });
    
    // App icon with border for professional look
    page.drawImage(iconImage, {
      x: margin + 5, 
      y: pageHeight - margin - 55,
      width: 40, 
      height: 40,
    });
    
    // Title - Different for portfolio vs individual loans
    const isPortfolio = loanData.loanId === 'portfolio-summary';
    page.drawText(isPortfolio ? 'Portfolio Summary' : 'Loan Report', {
      x: margin + 55, y: pageHeight - margin - 25,
      size: 18, font: helveticaBold, color: rgb(0.15, 0.3, 0.55)
    });
    
    // Loan info - Conditional display for portfolio
    let infoText;
    if (isPortfolio) {
      infoText = `${loanData.name} - Total: ${formatCurrency(loanData.amount, currency, 0)} - Monthly: ${formatCurrency(loanData.monthlyPayment, currency, 0)}`;
    } else {
      infoText = `${loanData.name} - ${formatCurrency(loanData.amount, currency, 0)} - ${loanData.interestRate}% - ${Math.floor(loanData.termInMonths/12)}y ${loanData.termInMonths%12}m`;
    }
    
    page.drawText(infoText, {
      x: margin + 55, y: pageHeight - margin - 45,
      size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4)
    });
    
    // Accent line under header
    page.drawRectangle({
      x: margin - 10,
      y: pageHeight - margin - 68,
      width: pageWidth - 2 * margin + 20,
      height: 3,
      color: rgb(0.2, 0.45, 0.75)
    });
  };
  
  // Function to add footer to any page
  const addFooter = (page: any, pageNum: number, totalPages: number) => {
    // Top border line
    page.drawRectangle({
      x: margin - 10,
      y: margin + 30,
      width: pageWidth - 2 * margin + 20,
      height: 1,
      color: rgb(0.85, 0.85, 0.85)
    });
    
    // Disclaimer in a professional box
    page.drawRectangle({
      x: margin - 10, y: margin - 5,
      width: pageWidth - 2 * margin + 20, height: 30,
      color: rgb(0.98, 0.98, 0.99),
      borderWidth: 0.5,
      borderColor: rgb(0.8, 0.85, 0.9)
    });
    
    // Disclaimer icon/symbol
    page.drawText('i', {
      x: margin, y: margin + 8,
      size: 10, font: helveticaBold, color: rgb(0.3, 0.5, 0.75)
    });
    
    // Disclaimer text
    page.drawText('Disclaimer: Estimates only. Verify with lender. Not responsible for financial decisions.', {
      x: margin + 15, y: margin + 8,
      size: 7, font: helvetica, color: rgb(0.45, 0.45, 0.45)
    });
    
    // Page numbers - right aligned
    page.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: pageWidth - margin - 55, y: margin - 20,
      size: 8, font: helvetica, color: rgb(0.5, 0.5, 0.5)
    });
    
    // Generation date - left aligned
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    page.drawText(`Generated: ${dateStr}`, {
      x: margin, y: margin - 20,
      size: 8, font: helvetica, color: rgb(0.5, 0.5, 0.5)
    });
  };
  
  // Calculate total pages needed
  const rowsPerPage = Math.floor((contentTop - contentBottom) / rowHeight) - 3; // -3 for table header
  let totalPages = Math.ceil(loanData.payments.length / rowsPerPage) || 1;
  
  // Add first page header
  addHeader(currentPage);
  
  // Check if this is portfolio or individual loan
  const isPortfolio = loanData.loanId === 'portfolio-summary';
  
  // Add summary sections BEFORE payment schedule for individual loans
  if (!isPortfolio) {
    currentY -= 20;
    
    // 1. LOAN DETAILS SECTION
    currentPage.drawRectangle({
      x: margin - 5, y: currentY - 100,
      width: pageWidth - 2 * margin + 10, height: 95,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.2, 0.45, 0.75),
      borderWidth: 1
    });
    
    currentPage.drawRectangle({
      x: margin - 5, y: currentY - 22,
      width: pageWidth - 2 * margin + 10, height: 20,
      color: rgb(0.2, 0.45, 0.75)
    });
    
    currentPage.drawText('Loan Details', {
      x: margin + 5, y: currentY - 13,
      size: 12, font: helveticaBold, color: rgb(1, 1, 1)
    });
    currentY -= 40;
    
    const loanDetailLines = [
      `Loan Name: ${loanData.name}`,
      `Loan Amount: ${formatCurrency(loanData.amount, currency, 0)}`,
      `Interest Rate: ${loanData.interestRate}%`,
      `Loan Term: ${Math.floor(loanData.termInMonths/12)} years ${loanData.termInMonths%12} months`
    ];
    
    loanDetailLines.forEach((line, index) => {
      currentPage.drawText(line, {
        x: margin + 15, y: currentY - (index * 18),
        size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2)
      });
    });
    
    currentY -= 85;
    
    // CURRENT STATUS SECTION (if available)
    if (loanData.currentBalance !== undefined || loanData.currentPaymentNumber !== undefined) {
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - 100,
        width: pageWidth - 2 * margin + 10, height: 95,
        color: rgb(0.95, 0.99, 0.95),
        borderColor: rgb(0.2, 0.65, 0.2),
        borderWidth: 1
      });
      
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - 22,
        width: pageWidth - 2 * margin + 10, height: 20,
        color: rgb(0.2, 0.65, 0.2)
      });
      
      currentPage.drawText('Current Status', {
        x: margin + 5, y: currentY - 13,
        size: 12, font: helveticaBold, color: rgb(1, 1, 1)
      });
      currentY -= 40;
      
      const statusLines = [];
      if (loanData.currentPaymentNumber !== undefined && loanData.totalPayments !== undefined) {
        statusLines.push(`Current Payment: #${loanData.currentPaymentNumber} of ${loanData.totalPayments}`);
      }
      if (loanData.currentBalance !== undefined) {
        statusLines.push(`Remaining Balance: ${formatCurrency(loanData.currentBalance, currency, 0)}`);
      }
      const paidOff = loanData.currentBalance !== undefined && loanData.currentBalance <= 0;
      statusLines.push(`Status: ${paidOff ? 'PAID OFF ✓' : 'Active'}`);
      
      statusLines.forEach((line, index) => {
        currentPage.drawText(line, {
          x: margin + 15, y: currentY - (index * 18),
          size: 9, font: helveticaBold, color: rgb(0.1, 0.4, 0.1)
        });
      });
      
      currentY -= (statusLines.length * 18) + 20;
    }
    
    // 2. PAYMENT SUMMARY SECTION
    currentPage.drawRectangle({
      x: margin - 5, y: currentY - 100,
      width: pageWidth - 2 * margin + 10, height: 95,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.2, 0.45, 0.75),
      borderWidth: 1
    });
    
    currentPage.drawRectangle({
      x: margin - 5, y: currentY - 22,
      width: pageWidth - 2 * margin + 10, height: 20,
      color: rgb(0.2, 0.45, 0.75)
    });
    
    currentPage.drawText('Payment Summary', {
      x: margin + 5, y: currentY - 13,
      size: 12, font: helveticaBold, color: rgb(1, 1, 1)
    });
    currentY -= 40;
    
    const totalInterest = loanData.totalPayment - loanData.amount;
    const payoffDate = loanData.payments[loanData.payments.length - 1]?.date || 'N/A';
    
    // Determine monthly payment display based on rate adjustments
    let monthlyPaymentText = `Monthly Payment: ${formatCurrency(loanData.monthlyPayment, currency, 0)}`;
    if (loanData.rateAdjustments && loanData.rateAdjustments.length > 0) {
      // Calculate payment range when there are rate adjustments
      const payments = loanData.payments.map(p => p.principal + p.interest);
      const minPayment = Math.min(...payments);
      const maxPayment = Math.max(...payments);
      if (Math.abs(maxPayment - minPayment) > 0.01) {
        monthlyPaymentText = `Monthly Payment: ${formatCurrency(minPayment, currency, 0)} - ${formatCurrency(maxPayment, currency, 0)} (varies)`;
      }
    }
    
    const paymentSummaryLines = [
      monthlyPaymentText,
      `Total Interest: ${formatCurrency(totalInterest, currency, 0)}`,
      `Total Cost: ${formatCurrency(loanData.totalPayment, currency, 0)}`,
      `Payoff Date: ${payoffDate} (${loanData.payments.length} payments)`
    ];
    
    paymentSummaryLines.forEach((line, index) => {
      currentPage.drawText(line, {
        x: margin + 15, y: currentY - (index * 18),
        size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2)
      });
    });
    
    currentY -= 85;
    
    // 3. YOUR SAVINGS SECTION (if applicable)
    if (loanData.interestSaved && loanData.interestSaved > 0) {
      const hasComparison = loanData.originalTotalPayment && loanData.originalTotalInterest;
      const sectionHeight = hasComparison ? 115 : 75;
      
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - sectionHeight,
        width: pageWidth - 2 * margin + 10, height: sectionHeight,
        color: rgb(0.95, 0.99, 0.95),
        borderColor: rgb(0.2, 0.65, 0.2),
        borderWidth: 1
      });
      
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - 22,
        width: pageWidth - 2 * margin + 10, height: 20,
        color: rgb(0.2, 0.65, 0.2)
      });
      
      currentPage.drawText('Your Savings (Impact of Early Payments)', {
        x: margin + 5, y: currentY - 13,
        size: 12, font: helveticaBold, color: rgb(1, 1, 1)
      });
      currentY -= 40;
      
      // Format time saved properly - periodDecrease is number of months
      const timeSavedText = loanData.periodDecrease 
        ? `${loanData.periodDecrease} month${loanData.periodDecrease !== 1 ? 's' : ''}`
        : 'N/A';
      
      const savingsLines = [
        `Interest Saved: ${formatCurrency(loanData.interestSaved, currency, 0)}`,
        `Time Saved: ${timeSavedText}`
      ];
      
      // Add comparison if available
      if (hasComparison) {
        const originalInterest = loanData.originalTotalInterest!;
        const newTotalPayment = loanData.totalPayment;
        const newTotalInterest = newTotalPayment - loanData.amount;
        
        savingsLines.push('---');
        savingsLines.push(`Original Total Interest: ${formatCurrency(originalInterest, currency, 0)}`);
        savingsLines.push(`New Total Interest: ${formatCurrency(newTotalInterest, currency, 0)}`);
      }
      
      savingsLines.forEach((line, index) => {
        if (line === '---') {
          currentPage.drawLine({
            start: { x: margin + 15, y: currentY - (index * 18) + 6 },
            end: { x: pageWidth - margin - 15, y: currentY - (index * 18) + 6 },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7)
          });
        } else {
          currentPage.drawText(line, {
            x: margin + 15, y: currentY - (index * 18),
            size: 9, font: helveticaBold, color: rgb(0.1, 0.4, 0.1)
          });
        }
      });
      
      currentY -= (savingsLines.length * 18) + 20;
    }
    
    // 4. EARLY PAYMENTS SECTION (if applicable)
    if (loanData.earlyPayments && loanData.earlyPayments.length > 0) {
      const earlyPaymentHeight = 20 + 18 + (loanData.earlyPayments.length * 18) + 10;
      
      // Check if we need a new page
      if (currentY - earlyPaymentHeight < contentBottom) {
        addFooter(currentPage, 1, totalPages);
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = contentTop - 20;
        addHeader(currentPage);
      }
      
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - earlyPaymentHeight,
        width: pageWidth - 2 * margin + 10, height: earlyPaymentHeight,
        color: rgb(0.95, 0.97, 0.99),
        borderColor: rgb(0.2, 0.45, 0.75),
        borderWidth: 1
      });
      
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - 22,
        width: pageWidth - 2 * margin + 10, height: 20,
        color: rgb(0.2, 0.45, 0.75)
      });
      
      currentPage.drawText('Early Payments', {
        x: margin + 5, y: currentY - 13,
        size: 12, font: helveticaBold, color: rgb(1, 1, 1)
      });
      currentY -= 40;
      
      loanData.earlyPayments.forEach((ep, index) => {
        // Format the early payment details with name prominently
        const nameText = ep.name ? `"${ep.name}"` : 'Extra Payment';
        const amountText = formatCurrency(ep.amount, currency, 0);
        
        // Better frequency formatting
        let typeText = '';
        if (ep.type === 'recurring') {
          const freq = ep.frequency || '1';
          typeText = freq === '1' ? 'Monthly' : `Every ${freq} months`;
        } else {
          typeText = 'One-time';
        }
        
        // Calculate actual date from month number and start date
        let dateText = '';
        if (ep.month && startDate) {
          const monthNum = parseInt(ep.month);
          if (!isNaN(monthNum)) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + monthNum - 1);
            dateText = paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }
        }
        
        const displayText = `${nameText}: ${amountText} (${typeText}) - Starting ${dateText}`;
        
        currentPage.drawText(displayText, {
          x: margin + 15, y: currentY - (index * 18),
          size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2)
        });
      });
      
      currentY -= (loanData.earlyPayments.length * 18) + 10;
    }
    
    // 5. INTEREST RATE CHANGES SECTION (if applicable)
    if (loanData.rateAdjustments && loanData.rateAdjustments.length > 0) {
      // Add spacing before rate adjustments section
      currentY -= 20;
      
      const rateAdjustmentHeight = 20 + 18 + (loanData.rateAdjustments.length * 18) + 10;
      
      // Check if we need a new page
      if (currentY - rateAdjustmentHeight < contentBottom) {
        addFooter(currentPage, 1, totalPages);
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = contentTop - 20;
        addHeader(currentPage);
      }
      
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - rateAdjustmentHeight,
        width: pageWidth - 2 * margin + 10, height: rateAdjustmentHeight,
        color: rgb(0.99, 0.97, 0.95),
        borderColor: rgb(0.75, 0.55, 0.2),
        borderWidth: 1
      });
      
      currentPage.drawRectangle({
        x: margin - 5, y: currentY - 22,
        width: pageWidth - 2 * margin + 10, height: 20,
        color: rgb(0.75, 0.55, 0.2)
      });
      
      currentPage.drawText('Interest Rate Changes', {
        x: margin + 5, y: currentY - 13,
        size: 12, font: helveticaBold, color: rgb(1, 1, 1)
      });
      currentY -= 40;
      
      loanData.rateAdjustments.forEach((ra, index) => {
        // Calculate actual date from month number and start date
        let dateText = 'Unknown Date';
        if (ra.month && startDate) {
          const monthNum = parseInt(ra.month);
          if (!isNaN(monthNum)) {
            const adjustmentDate = new Date(startDate);
            adjustmentDate.setMonth(adjustmentDate.getMonth() + monthNum - 1);
            dateText = adjustmentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }
        }
        
        const displayText = `Effective ${dateText}: New Rate ${ra.newRate}%`;
        
        currentPage.drawText(displayText, {
          x: margin + 15, y: currentY - (index * 18),
          size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2)
        });
      });
      
      currentY -= (loanData.rateAdjustments.length * 18) + 10;
    }
    
    // Add spacing before payment schedule
    currentY -= 35;
    
    // Check if we need a new page for the payment schedule
    if (currentY < contentBottom + 100) {
      addFooter(currentPage, 1, totalPages);
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = contentTop - 20;
      addHeader(currentPage);
    }
    
    // PAYMENT SCHEDULE HEADER
    currentPage.drawRectangle({
      x: margin - 5, y: currentY - 25,
      width: pageWidth - 2 * margin + 10, height: 22,
      color: rgb(0.2, 0.45, 0.75)
    });
    
    currentPage.drawText('Payment Schedule', {
      x: margin + 5, y: currentY - 15,
      size: 12, font: helveticaBold, color: rgb(1, 1, 1)
    });
    
    currentY -= 35;
  }
  
  // Table headers - Different for portfolio vs individual loans
  const tableHeaders = isPortfolio 
    ? ['#', 'Loan Name', 'Amount', 'Remaining', 'Monthly', 'Rate', 'Start Date', 'Payoff Date']
    : ['Payment #', 'Principal', 'Interest', 'Balance', 'Date'];
  const colWidths = isPortfolio ? [25, 95, 65, 65, 60, 45, 65, 65] : [60, 80, 80, 80, 80];
  const colPositions = isPortfolio 
    ? [margin, margin + 25, margin + 120, margin + 185, margin + 250, margin + 310, margin + 355, margin + 420]
    : [margin, margin + 60, margin + 140, margin + 220, margin + 300];
  
  // Calculate total table width
  const tableWidth = isPortfolio ? 485 : 380; // Sum of all column widths
  
  // Draw table header on first page
  currentY -= 40;
  tableHeaders.forEach((header, index) => {
    // Header cell background
    currentPage.drawRectangle({
      x: colPositions[index], y: currentY - 2,
      width: colWidths[index], height: 20,
      color: rgb(0.2, 0.45, 0.75),
      borderColor: rgb(0.15, 0.35, 0.65),
      borderWidth: 0.5
    });
    
    // Header text
    currentPage.drawText(header, {
      x: colPositions[index] + 5, y: currentY + 6,
      size: 9, font: helveticaBold, color: rgb(1, 1, 1)
    });
  });
  
  currentY -= rowHeight;
  let currentPageNum = 1;
  let rowsOnCurrentPage = 0;
  
  // Draw payment data
  loanData.payments.forEach((payment, index) => {
    // Check if we need a new page
    if (rowsOnCurrentPage >= rowsPerPage || currentY < contentBottom) {
      // Add footer to current page
      addFooter(currentPage, currentPageNum, totalPages);
      
      // Create new page
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentPageNum++;
      currentY = contentTop - 30;
      rowsOnCurrentPage = 0;
      
      // Add header to new page
      addHeader(currentPage);
      
      // Redraw table header on new page
      tableHeaders.forEach((header, headerIndex) => {
        // Header cell background
        currentPage.drawRectangle({
          x: colPositions[headerIndex], y: currentY - 2,
          width: colWidths[headerIndex], height: 20,
          color: rgb(0.2, 0.45, 0.75),
          borderColor: rgb(0.15, 0.35, 0.65),
          borderWidth: 0.5
        });
        
        // Header text
        currentPage.drawText(header, {
          x: colPositions[headerIndex] + 5, y: currentY + 6,
          size: 9, font: helveticaBold, color: rgb(1, 1, 1)
        });
      });
      
      currentY -= rowHeight;
    }
    
    // Determine if this is the current payment (for individual loans)
    const isCurrentPayment = !isPortfolio && loanData.currentPaymentNumber && payment.number === loanData.currentPaymentNumber;
    
    // Draw row background with borders (alternate colors, highlight current payment)
    let rowColor;
    if (isCurrentPayment) {
      rowColor = rgb(0.9, 0.95, 0.9); // Light green for current payment
    } else {
      rowColor = index % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1);
    }
    
    currentPage.drawRectangle({
      x: margin, y: currentY - 2,
      width: tableWidth, height: rowHeight,
      color: rowColor,
      borderColor: isCurrentPayment ? rgb(0.2, 0.65, 0.2) : rgb(0.9, 0.92, 0.95),
      borderWidth: isCurrentPayment ? 1 : 0.3
    });
    
    // Draw cell data - Different format for portfolio vs payment schedule
    const rowData = isPortfolio ? [
      (payment.number).toString(),
      payment.loanName || payment.date, // Loan name
      formatCurrency(payment.principal, currency, 0), // Loan amount
      formatCurrency(payment.interest, currency, 0), // Remaining balance
      formatCurrency(payment.balance, currency, 0), // Monthly payment
      `${payment.interestRate}%`, // Rate
      payment.startDate ? new Date(payment.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A', // Start date
      payment.freedomDate ? new Date(payment.freedomDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A' // Freedom day
    ] : [
      (payment.number).toString(),
      formatCurrency(payment.principal, currency),
      formatCurrency(payment.interest, currency),
      formatCurrency(payment.balance, currency),
      payment.date
    ];
    
    rowData.forEach((data, dataIndex) => {
      let textColor;
      if (isCurrentPayment && !isPortfolio) {
        textColor = rgb(0.1, 0.5, 0.1); // Green text for current payment
      } else if (dataIndex === 0) {
        textColor = rgb(0.4, 0.4, 0.4);
      } else if (isPortfolio && dataIndex === 7 && payment.freedomDate) {
        textColor = rgb(0.1, 0.5, 0.1); // Green for freedom date
      } else {
        textColor = rgb(0.2, 0.2, 0.2);
      }
      
      const textSize = isPortfolio && (dataIndex === 5 || dataIndex === 6 || dataIndex === 7) ? 7 : 8; // Smaller text for rate/dates
      const displayData = isCurrentPayment && !isPortfolio && dataIndex === 0 ? `${data} <` : data;
      
      currentPage.drawText(displayData, {
        x: colPositions[dataIndex] + 3, y: currentY + 5,
        size: textSize, font: isCurrentPayment && !isPortfolio ? helveticaBold : helvetica, 
        color: textColor
      });
    });
    
    currentY -= rowHeight;
    rowsOnCurrentPage++;
    
    // For portfolio view, add extra payment and rate adjustment info below the loan row
    if (isPortfolio) {
      try {
        const hasEarlyPayments = payment.earlyPayments && Array.isArray(payment.earlyPayments) && payment.earlyPayments.length > 0;
        const hasRateAdjustments = payment.rateAdjustments && Array.isArray(payment.rateAdjustments) && payment.rateAdjustments.length > 0;
        
        if (hasEarlyPayments || hasRateAdjustments) {
          // Show early payments if they exist
          if (hasEarlyPayments) {
            for (const ep of payment.earlyPayments!) {
              // Check if we need a new page
              if (currentY < contentBottom + 20) {
                addFooter(currentPage, currentPageNum, totalPages);
                currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                currentPageNum++;
                currentY = contentTop - 30;
                rowsOnCurrentPage = 0;
                addHeader(currentPage);
                tableHeaders.forEach((header, headerIndex) => {
                  currentPage.drawRectangle({
                    x: colPositions[headerIndex], y: currentY - 2,
                    width: colWidths[headerIndex], height: 20,
                    color: rgb(0.2, 0.45, 0.75),
                    borderColor: rgb(0.15, 0.35, 0.65),
                    borderWidth: 0.5
                  });
                  currentPage.drawText(header, {
                    x: colPositions[headerIndex] + 5, y: currentY + 6,
                    size: 9, font: helveticaBold, color: rgb(1, 1, 1)
                  });
                });
                currentY -= rowHeight;
              }
              
              // Calculate date from month number
              let epDateText = '';
              if (ep.month && payment.startDate) {
                const monthNum = parseInt(ep.month);
                if (!isNaN(monthNum)) {
                  const epDate = new Date(payment.startDate);
                  epDate.setMonth(epDate.getMonth() + monthNum - 1);
                  epDateText = ` - ${epDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
                }
              }
              
              const epText = `      > Extra: ${formatCurrency(ep.amount, currency, 0)} (${ep.type === 'recurring' ? `Every ${ep.frequency || '1'}mo` : 'One-time'})${epDateText}`;
              currentPage.drawText(epText, {
                x: margin + 35, y: currentY + 5,
                size: 7, font: helvetica, color: rgb(0.2, 0.6, 0.2)
              });
              currentY -= 14;
            }
          }
          
          // Show rate adjustments if they exist
          if (hasRateAdjustments) {
            for (const ra of payment.rateAdjustments!) {
              // Check if we need a new page
              if (currentY < contentBottom + 20) {
                addFooter(currentPage, currentPageNum, totalPages);
                currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                currentPageNum++;
                currentY = contentTop - 30;
                rowsOnCurrentPage = 0;
                addHeader(currentPage);
                tableHeaders.forEach((header, headerIndex) => {
                  currentPage.drawRectangle({
                    x: colPositions[headerIndex], y: currentY - 2,
                    width: colWidths[headerIndex], height: 20,
                    color: rgb(0.2, 0.45, 0.75),
                    borderColor: rgb(0.15, 0.35, 0.65),
                    borderWidth: 0.5
                  });
                  currentPage.drawText(header, {
                    x: colPositions[headerIndex] + 5, y: currentY + 6,
                    size: 9, font: helveticaBold, color: rgb(1, 1, 1)
                  });
                });
                currentY -= rowHeight;
              }
              
              // Calculate date from month number
              let raDateText = '';
              if (ra.month && payment.startDate) {
                const monthNum = parseInt(ra.month);
                if (!isNaN(monthNum)) {
                  const raDate = new Date(payment.startDate);
                  raDate.setMonth(raDate.getMonth() + monthNum - 1);
                  raDateText = raDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
              }
              
              const raText = `      > Rate Change: ${ra.newRate}% - ${raDateText || 'N/A'}`;
              currentPage.drawText(raText, {
                x: margin + 35, y: currentY + 5,
                size: 7, font: helvetica, color: rgb(0.7, 0.4, 0)
              });
              currentY -= 14;
            }
          }
        }
      } catch (error) {
        // Silently skip if there's an error with extra payments/rate adjustments
        console.log('Error displaying extra info:', error);
      }
    }
  });
  
  // Add summary section for portfolio reports ONLY
  if (isPortfolio && loanData.payments.length > 0) {
    // Check if we need space for summary
    if (currentY < contentBottom + 60) {
      addFooter(currentPage, currentPageNum, totalPages + 1); // Account for potential extra page
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentPageNum++;
      currentY = contentTop;
      addHeader(currentPage);
    }
    
    // Add spacing before summary
    currentY -= 35;
    
    // Summary box background
    currentPage.drawRectangle({
      x: margin - 5, 
      y: currentY - 110,
      width: pageWidth - 2 * margin + 10, 
      height: 105,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.2, 0.45, 0.75),
      borderWidth: 1
    });
    
    // Summary title with background accent
    currentPage.drawRectangle({
      x: margin - 5, 
      y: currentY - 25,
      width: pageWidth - 2 * margin + 10, 
      height: 22,
      color: rgb(0.2, 0.45, 0.75)
    });
    
    currentPage.drawText('Portfolio Summary', {
      x: margin + 5, y: currentY - 15,
      size: 13, font: helveticaBold, color: rgb(1, 1, 1)
    });
    currentY -= 40;
    
    // Summary statistics - matching index page display
    const totalBorrowed = loanData.payments.reduce((sum, payment) => sum + payment.principal, 0);
    const totalRemaining = loanData.payments.reduce((sum, payment) => sum + payment.interest, 0);
    const totalMonthlyPayment = loanData.payments.reduce((sum, payment) => sum + payment.balance, 0);
    
    const summaryLines = [
      `Total Borrowed: ${formatCurrency(totalBorrowed, currency, 0)}`,
      `Remaining Principal: ${formatCurrency(totalRemaining, currency, 0)}`,
      `Total Monthly Payment: ${formatCurrency(totalMonthlyPayment, currency, 0)}`
    ];
    
    summaryLines.forEach((line, index) => {
      // Add bullet points
      currentPage.drawText('*', {
        x: margin + 5, y: currentY - (index * 20),
        size: 10, font: helveticaBold, color: rgb(0.2, 0.45, 0.75)
      });
      
      currentPage.drawText(line, {
        x: margin + 20, y: currentY - (index * 20),
        size: 10, font: helvetica, color: rgb(0.2, 0.2, 0.2)
      });
    });
    
    // Update current position
    currentY -= summaryLines.length * 18;
    
    // Update total pages if we added a summary page
    totalPages = currentPageNum;
  }
  
  // Add footer to last page
  addFooter(currentPage, currentPageNum, totalPages);
  
  return await pdfDoc.save();
}