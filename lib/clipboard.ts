/**
 * Robust clipboard copy with fallback for iframes / Safari / older browsers
 * where navigator.clipboard.writeText silently throws or is undefined.
 *
 * Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Modern API — preferred when available and allowed.
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through to legacy path
    }

    // Legacy fallback: hidden textarea + execCommand. Works in iframes and
    // older Safari without the Clipboard API permission dance.
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}
