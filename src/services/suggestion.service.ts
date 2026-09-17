import { suggestionRepository } from '@/repositories/suggestion.repository'
import { NotFoundError, ForbiddenError, TooManyRequestsError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { CreateSuggestionInput, UpdateSuggestionInput } from '@/validations'
import { sendSuggestionEmail } from '@/utils/mail'
import { env } from '@/lib/env'
import { reportError } from '@/utils/reportError'

const ADMIN_EMAIL = env.ADMIN_NOTIFICATION_EMAIL

/** Maximum number of suggestions a single user can submit per calendar day. */
const DAILY_LIMIT = 5

class SuggestionService {
    async getAll(params: QueryParams) {
        return suggestionRepository.findMany(params)
    }

    async getById(id: string) {
        const suggestion = await suggestionRepository.findWithUser(id)
        if (!suggestion) throw new NotFoundError('Suggestion not found')
        return suggestion
    }

    async create(data: CreateSuggestionInput, userId: string, userName?: string | null) {
        // Rate-limit: max DAILY_LIMIT suggestions per user per calendar day
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const todayCount = await suggestionRepository.countCreatedSince(userId, startOfDay)

        if (todayCount >= DAILY_LIMIT) {
            throw new TooManyRequestsError(
                `You can submit at most ${DAILY_LIMIT} suggestions per day. Try again tomorrow.`
            )
        }

        const suggestion = await suggestionRepository.create({
            ...data,
            userId,
        })

        // Fire-and-forget email notification — don't block the response
        sendSuggestionEmail(ADMIN_EMAIL, {
            id:         suggestion.id,
            type:       suggestion.type,
            title:      suggestion.title,
            content:    suggestion.content,
            targetName: suggestion.targetName ?? undefined,
            userName:   userName ?? 'Anonymous',
        }).catch((e) => reportError(e, 'suggestion.sendNotification'))

        return suggestion
    }

    async update(id: string, data: UpdateSuggestionInput) {
        const existing = await suggestionRepository.findWithUser(id)
        if (!existing) throw new NotFoundError('Suggestion not found')

        return suggestionRepository.update(id, data)
    }

    async delete(id: string, userId: string, isAdmin: boolean) {
        const existing = await suggestionRepository.findWithUser(id)
        if (!existing) throw new NotFoundError('Suggestion not found')
        if (!isAdmin && existing.userId !== userId) throw new ForbiddenError('Cannot delete this suggestion')

        await suggestionRepository.hardDelete(id)
    }
}

export const suggestionService = new SuggestionService()
