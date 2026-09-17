import { NextRequest } from 'next/server'
import { suggestionService } from '@/services/suggestion.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withUser } from '@/middlewares/withAuth'
import { updateSuggestionSchema } from '@/validations'

export const GET = withAdmin(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const suggestion = await suggestionService.getById(id)
    return ApiResponse.success(suggestion)
})

export const PUT = withAdmin(async (req: NextRequest, { params }) => {
    const { id } = await params
    const body = await req.json()
    const data = updateSuggestionSchema.parse(body)
    const suggestion = await suggestionService.update(id, data)
    return ApiResponse.success(suggestion)
})

export const DELETE = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const isAdmin = session.user.role === 'ADMIN'
    await suggestionService.delete(id, session.user.id, isAdmin)
    return ApiResponse.success({ deleted: true })
})
