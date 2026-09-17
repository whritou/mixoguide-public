import { notFound } from 'next/navigation'
import Image from 'next/image'
import { CalendarDays, MapPin, MessageSquare, Users, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { options } from '@/lib/auth/authOptions'
import { plannedCollectionService } from '@/services/planned-collection.service'
import RsvpForm from './RsvpForm'
import Link from 'next/link'

interface Props {
    params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params
    try {
        const c = await plannedCollectionService.getPublicView(token)
        return {
            title: `${c.title} — You're invited!`,
            description: `${c.user?.name ?? 'Someone'} is hosting a cocktail event on ${new Date(c.plannedFor).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. See the drink list and RSVP.`,
        }
    } catch {
        return { title: 'Invite | MixoGuide' }
    }
}

const RSVP_LABEL: Record<string, string> = {
    going:     'Going',
    maybe:     'Maybe',
    not_going: "Can't make it",
}

function formatLabel(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function InvitePage({ params }: Props) {
    const { token } = await params

    const [collectionResult, session] = await Promise.all([
        plannedCollectionService.getPublicView(token).catch(() => null),
        getServerSession(options),
    ])

    if (!collectionResult) notFound()
    const collection = collectionResult

    const date = new Date(collection.plannedFor)
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const showTime = date.getHours() !== 12 || date.getMinutes() !== 0
    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })

    const existingRsvp = session?.user?.id
        ? (collection.rsvps.find((r) => r.userId === session!.user!.id) ?? null)
        : null

    const goingCount = collection.rsvps.filter((r) => r.status === 'going').length
    const totalGuests = collection.rsvps
        .filter((r) => r.status === 'going')
        .reduce((s, r) => s + r.guestCount, 0)

    return (
        <main className="min-h-screen bg-mg-cream">
            {/* Hero header */}
            <div className="bg-gradient-to-br from-mg-ink via-mg-espresso to-mg-brown px-6 py-12 text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-label uppercase tracking-widest text-white/70 mb-4">
                    <Sparkles size={10} />
                    You&apos;re invited
                </div>
                <h1 className="font-headline text-3xl sm:text-4xl text-white mb-2">{collection.title}</h1>
                {collection.user?.name && (
                    <p className="text-mg-caramel text-sm">Hosted by {collection.user.name}</p>
                )}

                <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-white/80">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        {showTime ? `${formattedDate} at ${formattedTime}` : formattedDate}
                    </span>
                    {collection.location && (
                        <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {collection.location}
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <Users size={14} />
                        {collection.servings} serving{collection.servings !== 1 ? 's' : ''}
                    </span>
                </div>

                {collection.occasions.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        {collection.occasions.map((occ) => (
                            <span
                                key={occ}
                                className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-label uppercase tracking-widest text-white/70"
                            >
                                {formatLabel(occ)}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

                {collection.guestNote && (
                    <section className="rounded-2xl border border-mg-sand bg-white p-4">
                        <p className="flex items-start gap-2 text-sm text-mg-charcoal">
                            <MessageSquare size={15} className="mt-0.5 shrink-0 text-mg-brown" />
                            <span>{collection.guestNote}</span>
                        </p>
                    </section>
                )}

                {/* Cocktail list */}
                {collection.cocktails.length > 0 && (
                    <section>
                        <h2 className="font-headline text-xl text-mg-ink mb-4">
                            The drink list
                        </h2>
                        <div className="space-y-3">
                            {collection.cocktails.map((entry) => {
                                const c = entry.cocktail
                                return (
                                    <div
                                        key={c.id}
                                        className="flex items-center gap-4 rounded-2xl border border-mg-sand bg-white p-3"
                                    >
                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mg-sand">
                                            <Image
                                                src={c.imageUrl ?? '/placeholder.svg'}
                                                alt={c.name}
                                                fill
                                                className="object-cover"
                                                sizes="64px"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-headline text-base text-mg-ink truncate">{c.name}</p>
                                            <p className="text-xs text-mg-muted mt-0.5">
                                                {c.ingredients.length} ingredient{c.ingredients.length !== 1 ? 's' : ''}
                                                {' · '}
                                                {formatLabel(c.difficulty)}
                                            </p>
                                            {c.ingredients.length > 0 && (
                                                <p className="text-xs text-mg-muted/80 mt-0.5 truncate">
                                                    {c.ingredients.map((i) => i.ingredient.name).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* RSVP section */}
                <section className="rounded-2xl border border-mg-sand bg-white p-6">
                    <h2 className="font-headline text-xl text-mg-ink mb-1">RSVP</h2>
                    {goingCount > 0 && (
                        <p className="text-xs text-mg-muted mb-5">
                            {goingCount} {goingCount === 1 ? 'person' : 'people'} going
                            {totalGuests > goingCount ? ` (${totalGuests} guests total)` : ''}
                        </p>
                    )}
                    <RsvpForm
                        token={token}
                        userId={session?.user?.id ?? null}
                        userName={session?.user?.name ?? null}
                        userEmail={session?.user?.email ?? null}
                        existingRsvp={existingRsvp}
                    />
                </section>

                {/* Existing RSVPs */}
                {collection.rsvps.length > 0 && (
                    <section>
                        <h2 className="font-headline text-xl text-mg-ink mb-4">Who&apos;s coming</h2>
                        <div className="space-y-2">
                            {collection.rsvps.map((r) => (
                                <div
                                    key={r.id}
                                    className="flex items-center justify-between rounded-xl border border-mg-sand bg-white px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-mg-ink">{r.name}</p>
                                        {r.note && (
                                            <p className="text-xs text-mg-muted truncate mt-0.5">{r.note}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-3">
                                        {r.guestCount > 1 && (
                                            <span className="flex items-center gap-1 text-xs text-mg-muted">
                                                <Users size={11} />
                                                {r.guestCount}
                                            </span>
                                        )}
                                        <span className="text-xs text-mg-charcoal">
                                            {RSVP_LABEL[r.status] ?? r.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <p className="text-center text-xs text-mg-muted pb-4">
                    Powered by{' '}
                    <Link href="/" className="text-mg-brown hover:underline">MixoGuide</Link>
                </p>
            </div>
        </main>
    )
}
