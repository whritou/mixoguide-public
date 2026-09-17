import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withOptionalUser } from '@/middlewares/withAuth'
import { createRsvpSchema } from '@/validations'

export const POST = withOptionalUser(async (req, { params }, session) => {
    const { token } = await params
    const body = await req.json()
    const raw = createRsvpSchema.parse(body)
    const data = {
        ...raw,
        userId: session?.user?.id ?? null,
        email:  raw.email ?? null,
    }
    const rsvp = await plannedCollectionService.addRsvp(token, data)
    return ApiResponse.created(rsvp)
})
