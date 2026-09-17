import type {FieldConfig} from "@/components/crud/types";

export interface Glass {
    id:             string
    name:           string
    description?:   string
    imageUrl?:      string
}

export interface GlassDTO {
    id:             string
    name:           string
    description:    string | null
    imageUrl:       string | null
}

export interface GlassFormData {
    name: string
    description?: string
    imageUrl?: string
}

export const fields: FieldConfig[] = [
    {
        name: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Name of the glass',
        description: 'The unique name of the glass',
        required: true,
    },
    {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Describe the glass',
        description: 'A detailed description of the glass',
    },
    {
        name: 'imageUrl',
        label: 'Image URL',
        type: 'url',
        placeholder: 'https://example.com/image.jpg',
        description: 'URL to an image of the glass',
    },
]