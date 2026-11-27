'use client'

import { motion, useReducedMotion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import { cardVariants, DIFFICULTY_COLORS, type Technique } from '@/data/bar-tools'

export function TechniqueCard({ technique }: { technique: Technique }) {
    const reduceMotion = useReducedMotion()
    const Icon = technique.icon
    return (
        <motion.article
            // Skip the reveal animation when the user prefers reduced motion (A11Y-020).
            variants={reduceMotion ? undefined : cardVariants}
            className="bg-surface rounded-2xl p-7 flex flex-col gap-5 shadow-xs hover:shadow-md transition-shadow duration-300"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-brand-soft/15 text-brand shrink-0">
                    <Icon size={20} aria-hidden="true" />
                </div>
                <span className={`font-label text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[technique.difficulty]}`}>
                    {technique.difficulty}
                </span>
            </div>

            <div>
                <h3 className="font-headline text-xl text-fg leading-snug">{technique.name}</h3>
                <p className="font-body text-xs text-fg-muted mt-0.5 italic">Used for: {technique.usedFor}</p>
            </div>

            <p className="font-body text-sm text-fg-secondary leading-relaxed">{technique.description}</p>

            <div className="border-t border-line-strong/50" />

            <div>
                <p className="font-label text-[10px] uppercase tracking-[0.18em] text-brand mb-3">
                    Pro Tips
                </p>
                <ul className="space-y-2">
                    {technique.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                            <CheckCircle2 size={14} aria-hidden="true" className="text-brand-soft mt-0.5 shrink-0" />
                            <span className="font-body text-xs text-fg-secondary leading-relaxed">{tip}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </motion.article>
    )
}
