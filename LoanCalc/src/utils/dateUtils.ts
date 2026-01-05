/**
 * Date formatting utilities for consistent date handling across the app
 */

/**
 * Format Date object to YYYY-MM-DD for storage
 */
export function formatDateForStorage(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format Date object to MM/DD/YYYY for display
 */
export function formatDateForDisplay(date: Date): string {
    // Ensure date is valid before formatting
    if (!date || isNaN(date.getTime())) {
        return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Parse date string from YYYY-MM-DD format to Date object
 */
export function parseDateFromStorage(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Format date for report display (e.g., "Jan 5, 2026")
 */
export function formatDateForReport(date: Date): string {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Get current date formatted for display
 */
export function getCurrentDateDisplay(): string {
    return formatDateForDisplay(new Date());
}

/**
 * Get current date formatted for storage
 */
export function getCurrentDateStorage(): string {
    return formatDateForStorage(new Date());
}
