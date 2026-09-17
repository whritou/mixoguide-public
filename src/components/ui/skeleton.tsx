'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            className={cn('relative overflow-hidden rounded-md bg-accent', className)}
            {...props}
        >
            <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['0%', '200%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', repeatDelay: 0.3 }}
            />
        </div>
    )
}

export { Skeleton }
