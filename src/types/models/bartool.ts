import type {FieldConfig} from "@/components/crud/types";

export type BarToolType = 'bar' | 'kitchen' | 'glassware' | 'other'

export interface BarTool {
    id:            string
    name:          string
    type:          BarToolType
    isEssential?:  boolean
    description?:  string
    imageUrl?:     string
}

export interface BarToolDTO {
    id:            string
    name:          string
    type:          BarToolType
    isEssential:   boolean | null
    description:   string | null
    imageUrl:      string | null
}

export interface BarToolFormData {
    name: string
    description?: string
    imageUrl?: string
    type?: BarToolType
    isEssential?: boolean
}

export const fields: FieldConfig[] = [
    {
        name: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Name of the bar tool',
        description: 'The unique name of the bar tool',
        required: true,
    },
    {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Describe the bar tool',
        description: 'A detailed description of the bar tool',
    },
    {
        name: 'imageUrl',
        label: 'Image URL',
        type: 'url',
        placeholder: 'https://example.com/image.jpg',
        description: 'URL to an image of the bar tool',
    },
    {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: [
            { label: 'Bar', value: 'bar' },
            { label: 'Kitchen', value: 'kitchen' },
            { label: 'Other', value: 'other' },
        ],
        description: 'The type of tool',
    },
    {
        name: 'isEssential',
        label: 'Essential Tool',
        type: 'switch',
        description: 'Is this tool essential?',
    },
]