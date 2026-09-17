import { createMapper } from './createMapper'
import type { BarToolDTO, BarTool } from '@/types/models/bartool'

export const [mapBarTool, mapBarTools] = createMapper<BarToolDTO, BarTool>((dto, n) => ({
    id:            dto.id,
    name:          dto.name,
    type:          dto.type,
    isEssential:   n(dto.isEssential),
    description:   n(dto.description),
    imageUrl:      n(dto.imageUrl),
}))
