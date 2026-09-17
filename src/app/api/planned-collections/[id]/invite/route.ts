import { z } from 'zod'
import { plannedCollectionService } from '@/services/planned-collection.service'
import { mailService } from '@/services/mail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { ValidationError } from '@/utils/errors'
import { rateLimit } from '@/lib/rateLimit'

const sendInviteSchema = z.object({
    email: z.string().email('Invalid email address'),
})

export const POST = withUser(async (req, { params }, session) => {
    await rateLimit('invite-email', req, session)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = sendInviteSchema.safeParse(body)
    if (!parsed.success) {
        throw new ValidationError('Invalid email', parsed.error.flatten().fieldErrors)
    }

    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')

    if (!item.shareEnabled || !item.shareToken) {
        throw new ValidationError('Generate an invite link before sending invites.')
    }

    await mailService.sendCollectionInvite({
        to:              parsed.data.email,
        hostName:        session.user.name ?? 'A friend',
        collectionTitle: item.title,
        shareToken:      item.shareToken,
        plannedFor:      item.plannedFor,
        location:        item.location,
    })

    return ApiResponse.success({ sent: true })
})
