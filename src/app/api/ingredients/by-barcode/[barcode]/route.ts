import { z } from 'zod'

import { barcodeService } from '@/services/barcode.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

const confirmSchema = z.object({ ingredientId: z.string().min(1).max(64) })

export const GET = withUser(async (_req, { params }) => {
    const { barcode } = await params
    const result = await barcodeService.lookup(barcode)
    return ApiResponse.success(result)
}, { rateLimit: 'barcode' })

export const POST = withUser(async (req, { params }, session) => {
    const { barcode } = await params
    const { ingredientId } = confirmSchema.parse(await req.json())
    const mapping = await barcodeService.confirmMapping(barcode, ingredientId, {
        isAdmin: session.user.role === 'ADMIN',
    })
    return ApiResponse.success(mapping)
}, { rateLimit: 'barcode' })
