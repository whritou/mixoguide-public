'use client'

import { motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import { cardVariants, type BarTool } from '@/data/bar-tools'

export function ToolCard({ tool }: { tool: BarTool }) {
    const Icon = tool.icon
    return (
        <motion.article
            variants={cardVariants}
            className="bg-surface rounded-2xl p-7 flex flex-col gap-5 shadow-xs hover:shadow-md transition-shadow duration-300"
        >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-brand/10 text-brand shrink-0">
                <Icon size={20} />
            </div>

            <div>
                <h3 className="font-headline text-xl text-fg leading-snug">{tool.name}</h3>
                {tool.alsoKnownAs && (
                    <p className="font-body text-xs text-fg-muted mt-0.5 italic">
                        Also known as: {tool.alsoKnownAs}
                    </p>
                )}
            </div>

            <p className="font-body text-sm text-fg-secondary leading-relaxed">{tool.description}</p>

            <div className="border-t border-line-strong/50" />

            <div>
                <p className="font-label text-[10px] uppercase tracking-[0.18em] text-brand mb-3">
                    Pro Tips
                </p>
                <ul className="space-y-2">
                    {tool.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                            <CheckCircle2 size={14} className="text-brand-soft mt-0.5 shrink-0" />
                            <span className="font-body text-xs text-fg-secondary leading-relaxed">{tip}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </motion.article>
    )
}
