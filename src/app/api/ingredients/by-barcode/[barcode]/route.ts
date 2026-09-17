import { barcodeService } from '@/services/barcode.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { z } from 'zod'

export const GET = withUser(async (_req, { params }) => {
    const { barcode } = await params
    const result = await barcodeService.lookup(barcode)
    return ApiResponse.success(result)
})

export const POST = withUser(async (req, { params }) => {
    const { barcode } = await params
    const body = await req.json()
    const { ingredientId } = z.object({ ingredientId: z.string().min(1) }).parse(body)
    const mapping = await barcodeService.confirmMapping(barcode, ingredientId)
    return ApiResponse.success(mapping)
})
