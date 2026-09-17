export function reportError(error: unknown, context: string): void {
    if (process.env.NODE_ENV === 'development') {
        console.error(`[${context}]`, error)
    }
}
