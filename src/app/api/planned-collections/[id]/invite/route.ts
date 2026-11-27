import { z } from 'zod'
import { plannedCollectionService } from '@/services/planned-collection.service'
import { mailService } from '@/services/mail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { ForbiddenError, ValidationError } from '@/utils/errors'
import { prisma } from '@/lib/db/prisma'

const sendInviteSchema = z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address').max(254),
})

export const POST = withUser(async (req, { params }, session) => {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = sendInviteSchema.safeParse(body)
    if (!parsed.success) {
        throw new ValidationError('Invalid email', parsed.error.flatten().fieldErrors)
    }

    // Invites are sent from our domain to arbitrary addresses: only verified
    // accounts may send them (SEC-006). Template values are HTML-escaped in mail.ts.
    const sender = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailVerified: true, name: true },
    })
    if (!sender?.emailVerified) {
        throw new ForbiddenError('Verify your email address before sending invites.')
    }

    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')

    if (!item.shareEnabled || !item.shareToken) {
        throw new ValidationError('Generate an invite link before sending invites.')
    }

    await mailService.sendCollectionInvite({
        to:              parsed.data.email,
        hostName:        (sender.name ?? 'A friend').slice(0, 80),
        collectionTitle: item.title.slice(0, 120),
        shareToken:      item.shareToken,
        plannedFor:      item.plannedFor,
        location:        item.location?.slice(0, 200) ?? null,
    })

    return ApiResponse.success({ sent: true })
}, { rateLimit: 'invite-email' })
