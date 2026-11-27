import { NextResponse } from 'next/server'
import { AppError } from './errors'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export class ApiResponse {
  static success<T>(data: T, status = 200, headers?: Record<string, string>) {
    return NextResponse.json(
      { success: true, data },
      { status, headers }
    )
  }

  static created<T>(data: T) {
    return ApiResponse.success(data, 201)
  }

  static noContent() {
    return new NextResponse(null, { status: 204 })
  }

  static paginated<T>(result: {
    data: T[]
    meta: object
  }, headers?: Record<string, string>) {
    return NextResponse.json(
      { success: true, ...result },
      { status: 200, headers }
    )
  }

  static error(message: string, status = 500, code: string = 'INTERNAL_ERROR', errors?: unknown) {
    return NextResponse.json(
      { success: false, error: { message, code, errors } },
      { status }
    )
  }

  static fromError(err: unknown) {

    if (err instanceof AppError) {
      return ApiResponse.error(err.message, err.statusCode, err.code)
    }

    if (err instanceof ZodError) {
      return ApiResponse.error(
        'Validation failed',
        422,
        'VALIDATION_ERROR',
        err.flatten().fieldErrors
      )
    }

    // DB-005: translate known Prisma errors instead of surfacing them as 500s.
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002':
          return ApiResponse.error('Resource already exists', 409, 'CONFLICT')
        case 'P2003':
          return ApiResponse.error('Related resource is missing or still in use', 409, 'CONSTRAINT_VIOLATION')
        case 'P2025':
          return ApiResponse.error('Resource not found', 404, 'NOT_FOUND')
        case 'P2034':
          return ApiResponse.error('Concurrent update conflict, please retry', 409, 'CONFLICT')
      }
    }

    return ApiResponse.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}
