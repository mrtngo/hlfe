/**
 * Session-based approval system
 * Stores approval timestamps to reduce signature prompts for a short period
 */

const SESSION_APPROVAL_KEY = 'hyperliquid_session_approval';
const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes

export interface SessionApproval {
    timestamp: number;
    address: string;
}

export function getSessionApproval(address: string): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
        const stored = localStorage.getItem(SESSION_APPROVAL_KEY);
        if (!stored) return false;
        
        const approval: SessionApproval = JSON.parse(stored);
        
        // Check if approval is for the same address and still valid
        if (approval.address.toLowerCase() !== address.toLowerCase()) {
            return false;
        }
        
        const now = Date.now();
        const elapsed = now - approval.timestamp;
        
        return elapsed < SESSION_DURATION;
    } catch (e) {
        return false;
    }
}

export function setSessionApproval(address: string): void {
    if (typeof window === 'undefined') return;
    
    try {
        const approval: SessionApproval = {
            timestamp: Date.now(),
            address: address.toLowerCase(),
        };
        localStorage.setItem(SESSION_APPROVAL_KEY, JSON.stringify(approval));
    } catch (e) {
        console.error('Failed to store session approval:', e);
    }
}

export function clearSessionApproval(): void {
    if (typeof window === 'undefined') return;
    
    try {
        localStorage.removeItem(SESSION_APPROVAL_KEY);
    } catch (e) {
        console.error('Failed to clear session approval:', e);
    }
}






