'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pantryApi } from '@/lib/api/pantry.api'
import { invalidators } from '@/lib/invalidation'
import { clearDemoBar, readDemoBar } from '@/lib/demo-bar/storage'

export function DemoBarImporter() {
    const queryClient = useQueryClient()
    const started = useRef(false)

    useEffect(() => {
        if (started.current) return
        const ids = readDemoBar()
        if (ids.length === 0) return
        started.current = true

        pantryApi.importDemoBar(ids)
            .then(({ imported }) => {
                clearDemoBar()
                if (imported > 0) {
                    toast.success(`Your bar is saved: ${imported} ${imported === 1 ? 'bottle' : 'bottles'}`)
                    invalidators.pantry(queryClient)
                }
            })
            .catch(() => {
                started.current = false
            })
    }, [queryClient])

    return null
}
