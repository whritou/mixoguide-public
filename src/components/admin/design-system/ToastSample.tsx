'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ToastSample() {
    return (
        <Button variant="outline" onClick={() => toast('Saved')}>
            Show toast
        </Button>
    )
}
