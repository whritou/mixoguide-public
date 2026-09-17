'use client'

import { useMutation } from '@tanstack/react-query'
import { uploadApi } from '@/lib/api/upload.api'

export function useUploadAvatar() {
    return useMutation({
        mutationFn: (file: File) => uploadApi.avatar(file),
    })
}
