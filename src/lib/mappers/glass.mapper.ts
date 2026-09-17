import { createMapper } from './createMapper'
import type { GlassDTO, Glass } from '@/types/models/glass'

export const [mapGlass, mapGlasses] = createMapper<GlassDTO, Glass>((dto, n) => ({
    id:            dto.id,
    name:          dto.name,
    description:   n(dto.description),
    imageUrl:      n(dto.imageUrl),
}))
