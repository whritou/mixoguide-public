import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withOptionalUser } from '@/middlewares/withAuth'
import { createRsvpSchema } from '@/validations'

// CSRF is enforced by withOptionalUser for POST; anonymous RSVPs are rate limited per IP (SEC-012).
export const POST = withOptionalUser(async (req, { params }, session) => {
    const { token } = await params
    const body = await req.json().catch(() => ({}))
    const raw = createRsvpSchema.parse(body)
    const data = {
        ...raw,
        userId: session?.user?.id ?? null,
        email:  raw.email ?? null,
    }
    const rsvp = await plannedCollectionService.addRsvp(token, data)
    return ApiResponse.created(rsvp)
}, { rateLimit: 'rsvp' })
