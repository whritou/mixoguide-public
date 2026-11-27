/**
 * SEC-018: the address awaiting verification is handed from the sign-in /
 * sign-up pages to /check-email through sessionStorage instead of the URL
 * query string, so it doesn't end up in history, logs or Referer headers.
 */
const KEY = 'mg:pending-verification-email'

export function storePendingVerificationEmail(email: string): void {
    try {
        sessionStorage.setItem(KEY, email)
    } catch {
        /* storage unavailable (private mode / blocked) - check-email degrades gracefully */
    }
}

export function readPendingVerificationEmail(): string | null {
    try {
        return sessionStorage.getItem(KEY)
    } catch {
        return null
    }
}

export function subscribePendingVerificationEmail(callback: () => void): () => void {
    window.addEventListener('storage', callback)
    return () => window.removeEventListener('storage', callback)
}
