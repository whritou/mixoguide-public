import { NextRequest } from 'next/server'
import { ApiResponse } from '@/utils/apiResponse'

type RouteContext = {
    params: Promise<Record<string, string>>
}

type RouteHandler = (
    req: NextRequest,
    context: RouteContext
) => Promise<Response>

function toLoggableError(err: unknown) {
    if (err instanceof Error) {
        return {
            name: err.name,
            message: err.message,
            stack: err.stack,
        }
    }

    return {
        name: 'UnknownError',
        message: String(err),
    }
}

export function withErrorHandler(handler: RouteHandler): RouteHandler {
    return async (req, context) => {
        try {
            return await handler(req, context)
        } catch (err) {
            console.error('[API Error]', {
                method: req.method,
                path: req.nextUrl.pathname,
                error: toLoggableError(err),
            })
            return ApiResponse.fromError(err)
        }
    }
}
