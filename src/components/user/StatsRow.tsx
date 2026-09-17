import Link from 'next/link'
import { Heart, Star, ShoppingBasket, CalendarDays } from 'lucide-react'
import type { ProfileData } from './types'

export function StatsRow({ stats }: { stats: ProfileData['stats'] }) {
    const items = [
        { icon: Heart,         label: 'Favourites',   value: stats.favoriteCocktails, href: '/cocktails' },
        { icon: Star,          label: 'Ratings',       value: stats.ratings,           href: '/cocktails' },
        { icon: ShoppingBasket,label: 'Pantry items',  value: stats.pantryItems,       href: '/pantry' },
        { icon: CalendarDays,  label: 'Planned',       value: stats.plannedCocktails,  href: '/planned-cocktails' },
    ]

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map(({ icon: Icon, label, value, href }) => (
                <Link
                    key={label}
                    href={href}
                    className="bg-mg-smoke rounded-2xl px-4 py-5 flex flex-col items-center gap-1
                               hover:bg-[#ece9e5] transition-colors group"
                >
                    <Icon size={18} className="text-mg-caramel group-hover:text-mg-brown transition-colors" />
                    <span className="font-headline text-2xl text-mg-ink">{value}</span>
                    <span className="text-xs text-mg-charcoal/60 font-body text-center">{label}</span>
                </Link>
            ))}
        </div>
    )
}
