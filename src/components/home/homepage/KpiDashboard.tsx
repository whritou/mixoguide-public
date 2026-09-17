'use client'

import { Martini, FlaskConical, Wine } from "lucide-react"
import { motion } from 'motion/react'

export function KpiDashboard() {

    const kpis = [
        {
            label: 'Library Size',
            value: "400 +",
            sub: 'Cocktails available',
            icon: Martini,
        },
        {
            label: 'Global Pantry',
            value: "300 +",
            sub: 'Ingredients tracked',
            icon: FlaskConical,
        },
        {
            label: 'Glassware and Bartools',
            value: "40 +",
            sub: 'Essential items cataloged',
            icon: Wine,
        },
    ]

    return (
        <section className="px-4 md:px-12 -mt-16 relative z-20 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {kpis.map((kpi, i) => {
                const Icon = kpi.icon

                return (
                    <motion.div
                        key={kpi.label}
                        className="bg-white p-6 lg:p-8 rounded-xl flex items-center justify-between group hover:bg-mg-smoke transition-colors duration-300 shadow-sm"
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
                    >
                        <div>
                            <span className="font-label uppercase text-[10px] tracking-widest text-mg-dim mb-1 block">
                                {kpi.label}
                            </span>

                            <h2 className="font-headline text-3xl text-mg-brown">
                                {kpi.value}
                            </h2>

                            <p className="text-sm text-mg-charcoal">{kpi.sub}</p>
                        </div>

                        <Icon
                            size={36}
                            className="opacity-40 group-hover:opacity-70 transition-opacity text-mg-brown"
                        />
                    </motion.div>
                )
            })}
        </section>
    )
}
