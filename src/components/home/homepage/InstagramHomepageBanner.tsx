import { Download, Instagram } from 'lucide-react'

import { PLAY_STORE_URL } from '@/lib/play-store'

const INSTAGRAM_URL = 'https://www.instagram.com/mixoguide/'

export function InstagramHomepageBanner() {
    return (
        <section className="relative z-10 px-4 md:px-12 pt-8 lg:pt-10">
            <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
                <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-32 flex-col justify-between gap-4 rounded-2xl border border-mg-caramel/20 bg-white/90 px-5 py-5 shadow-sm backdrop-blur-sm transition-colors hover:border-mg-caramel/45 hover:bg-white"
                    aria-label="Follow MixoGuide on Instagram"
                >
                    <span className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mg-caramel/15 text-mg-brown">
                            <Instagram size={19} aria-hidden="true" />
                        </span>
                        <span>
                            <span className="block font-label text-[10px] uppercase tracking-[0.2em] text-mg-brown">
                                Follow the pour
                            </span>
                            <span className="mt-1 block text-sm leading-relaxed text-mg-ink/70">
                                Recipes, bar notes, and behind-the-scenes updates.
                            </span>
                        </span>
                    </span>
                    <span className="text-sm font-semibold text-mg-brown">
                        @mixoguide
                    </span>
                </a>

                <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-32 flex-col justify-between gap-4 rounded-2xl border border-mg-caramel/20 bg-white/90 px-5 py-5 shadow-sm backdrop-blur-sm transition-colors hover:border-mg-caramel/45 hover:bg-white"
                    aria-label="Download MixoGuide on Google Play"
                >
                    <span className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mg-parchment-hover text-mg-brown">
                            <Download size={19} aria-hidden="true" />
                        </span>
                        <span>
                            <span className="block font-label text-[10px] uppercase tracking-[0.2em] text-mg-brown">
                                Android app
                            </span>
                            <span className="mt-1 block text-sm leading-relaxed text-mg-ink/70">
                                Download MixoGuide from Google Play for mobile planning.
                            </span>
                        </span>
                    </span>
                    <span className="text-sm font-semibold text-mg-brown">
                        Get it on Google Play
                    </span>
                </a>
            </div>
        </section>
    )
}
