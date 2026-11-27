import { NextRequest } from 'next/server'
import { ApiResponse } from '@/utils/apiResponse'
import { AppError } from '@/utils/errors'
import { logger, serializeError } from '@/lib/logger'
import { forwardToErrorReporter } from '@/utils/reportError'

type RouteContext = {
    params: Promise<Record<string, string>>
}

type RouteHandler = (
    req: NextRequest,
    context: RouteContext
) => Promise<Response>

export const REQUEST_ID_HEADER = 'x-request-id'

// Accept only reasonably-shaped incoming ids so clients cannot inject log noise.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export function resolveRequestId(req: Pick<NextRequest, 'headers'>): string {
    const incoming = req.headers.get(REQUEST_ID_HEADER)
    if (incoming && REQUEST_ID_PATTERN.test(incoming)) return incoming
    return crypto.randomUUID()
}

function withRequestIdHeader(response: Response, requestId: string): Response {
    try {
        response.headers.set(REQUEST_ID_HEADER, requestId)
        return response
    } catch {
        // Some responses have immutable headers (e.g. Response.redirect); clone them.
        const headers = new Headers(response.headers)
        headers.set(REQUEST_ID_HEADER, requestId)
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        })
    }
}

export function withErrorHandler(handler: RouteHandler): RouteHandler {
    return async (req, context) => {
        const requestId = resolveRequestId(req)
        try {
            const response = await handler(req, context)
            return withRequestIdHeader(response, requestId)
        } catch (err) {
            const logContext = {
                requestId,
                method: req.method,
                path: req.nextUrl.pathname,
                error: serializeError(err),
            }
            const isExpected = err instanceof AppError && err.statusCode < 500
            if (isExpected) {
                // Client errors (4xx) are routine: log at info, without a stack trace.
                logger.info('api.client_error', {
                    ...logContext,
                    status: (err as AppError).statusCode,
                    error: { name: logContext.error.name, message: logContext.error.message },
                })
            } else {
                logger.error('api.error', logContext)
                forwardToErrorReporter(err, 'api', { requestId, method: req.method, path: req.nextUrl.pathname })
            }
            return withRequestIdHeader(ApiResponse.fromError(err), requestId)
        }
    }
}
