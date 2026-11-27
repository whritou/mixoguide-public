/**
 * Tiny structured JSON logger (no dependencies).
 *
 * Emits one JSON object per line: { ts, level, msg, requestId?, ...context }.
 * Works in the Node and Edge runtimes. Level threshold comes from LOG_LEVEL
 * (debug | info | warn | error), defaulting to "info" ("warn" under test).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown> & { requestId?: string }

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function threshold(): number {
    const configured = process.env.LOG_LEVEL as LogLevel | undefined
    if (configured && configured in LEVEL_ORDER) return LEVEL_ORDER[configured]
    return process.env.NODE_ENV === 'test' ? LEVEL_ORDER.warn : LEVEL_ORDER.info
}

/** Serialize an unknown thrown value without leaking arbitrary own properties. */
export function serializeError(err: unknown): { name: string; message: string; stack?: string } {
    if (err instanceof Error) {
        return { name: err.name, message: err.message, stack: err.stack }
    }
    return { name: 'UnknownError', message: String(err) }
}

function safeStringify(value: unknown): string {
    const seen = new WeakSet<object>()
    return JSON.stringify(value, (_key, v: unknown) => {
        if (v instanceof Error) return serializeError(v)
        if (typeof v === 'bigint') return v.toString()
        if (v && typeof v === 'object') {
            if (seen.has(v)) return '[Circular]'
            seen.add(v)
        }
        return v
    })
}

function write(level: LogLevel, msg: string, context?: LogContext): void {
    if (LEVEL_ORDER[level] < threshold()) return

    const entry = { ts: new Date().toISOString(), level, msg, ...context }
    const line = safeStringify(entry)

    // Route to the matching console method so platform log collectors keep severity.
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    // eslint-disable-next-line no-console
    else console.log(line)
}

export interface Logger {
    debug(msg: string, context?: LogContext): void
    info(msg: string, context?: LogContext): void
    warn(msg: string, context?: LogContext): void
    error(msg: string, context?: LogContext): void
    /** Returns a logger that merges `bindings` into every entry (e.g. { requestId }). */
    child(bindings: LogContext): Logger
}

function createLogger(bindings: LogContext = {}): Logger {
    const merge = (context?: LogContext): LogContext => ({ ...bindings, ...context })
    return {
        debug: (msg, context) => write('debug', msg, merge(context)),
        info:  (msg, context) => write('info', msg, merge(context)),
        warn:  (msg, context) => write('warn', msg, merge(context)),
        error: (msg, context) => write('error', msg, merge(context)),
        child: (extra) => createLogger({ ...bindings, ...extra }),
    }
}

export const logger: Logger = createLogger()
