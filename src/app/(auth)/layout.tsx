import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex bg-canvas">
            {/* Left decorative panel */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-end p-12">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            "linear-gradient(135deg, #1b1c1a 0%, #3d2e1f 30%, #7a5830 60%, #bc9366 85%, #d3c4b7 100%)",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 70% 30%, #bc9366 0%, transparent 50%), radial-gradient(circle at 20% 80%, #7a5830 0%, transparent 40%)",
                    }}
                />
                <div className="relative z-10 max-w-md">
                    <Link
                        href="/"
                        className="font-headline text-3xl italic text-fg-on-image/90 mb-6 block"
                    >
                        Mixoguide
                    </Link>
                    <p className="text-fg-on-image/70 text-lg font-body leading-relaxed">
                        Elevate your home bar into a professional atelier. Curate your
                        collection, master techniques, and discover recipes tailored to
                        your pantry.
                    </p>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex flex-col">
                {/* Mobile logo */}
                <div className="lg:hidden px-6 pt-8">
                    <Link
                        href="/"
                        className="font-headline text-2xl italic text-brand"
                    >
                        Mixoguide
                    </Link>
                </div>

                <main id="main" tabIndex={-1} className="flex-1 flex items-center justify-center px-6 py-12 outline-none">
                    <div className="w-full max-w-md">{children}</div>
                </main>
            </div>
        </div>
    );
}
