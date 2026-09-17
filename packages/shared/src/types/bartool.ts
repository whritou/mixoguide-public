export type BarToolType = 'bar' | 'kitchen' | 'glassware' | 'other'

export interface BarToolDTO {
    id: string
    name: string
    type: BarToolType
    isEssential: boolean | null
    description: string | null
    imageUrl: string | null
}
