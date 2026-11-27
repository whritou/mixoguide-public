import { describe, expect, it } from 'vitest'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

describe('buttonVariants pill', () => {
    it.each(['default', 'sm', 'lg', 'icon'] as const)('stays fully rounded at size %s', (size) => {
        const classes = cn(buttonVariants({ variant: 'pill', size })).split(' ')
        expect(classes).toContain('rounded-full')
        expect(classes).not.toContain('rounded-md')
    })
})
