import { cn } from '@/lib/utils'

/**
 * Loading placeholder with a CSS shimmer (PERF-004: no `motion` dependency).
 * Decorative: hidden from assistive tech — announce loading with <Loader> or a
 * role="status" region instead. The shimmer stops under prefers-reduced-motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            aria-hidden="true"
            className={cn('relative overflow-hidden rounded-md bg-accent', className)}
            {...props}
        >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-fg-on-image/30 to-transparent animate-[mg-shimmer_1.7s_linear_infinite] motion-reduce:hidden" />
        </div>
    )
}

export { Skeleton }
