'use client'

import { motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import { cardVariants, DIFFICULTY_COLORS, type Technique } from '@/data/bar-tools'

export function TechniqueCard({ technique }: { technique: Technique }) {
    const Icon = technique.icon
    return (
        <motion.article
            variants={cardVariants}
            className="bg-white rounded-2xl p-7 flex flex-col gap-5 shadow-xs hover:shadow-md transition-shadow duration-300"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-mg-caramel/15 text-mg-brown shrink-0">
                    <Icon size={20} />
                </div>
                <span className={`font-label text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[technique.difficulty]}`}>
                    {technique.difficulty}
                </span>
            </div>

            <div>
                <h3 className="font-headline text-xl text-mg-ink leading-snug">{technique.name}</h3>
                <p className="font-body text-xs text-mg-muted mt-0.5 italic">Used for: {technique.usedFor}</p>
            </div>

            <p className="font-body text-sm text-mg-charcoal leading-relaxed">{technique.description}</p>

            <div className="border-t border-mg-bone/50" />

            <div>
                <p className="font-label text-[10px] uppercase tracking-[0.18em] text-mg-brown mb-3">
                    Pro Tips
                </p>
                <ul className="space-y-2">
                    {technique.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                            <CheckCircle2 size={14} className="text-mg-caramel mt-0.5 shrink-0" />
                            <span className="font-body text-xs text-mg-charcoal leading-relaxed">{tip}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </motion.article>
    )
}
