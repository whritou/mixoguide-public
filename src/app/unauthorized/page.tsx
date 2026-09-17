"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-mg-cream px-6">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-mg-danger-light flex items-center justify-center mx-auto mb-6">
                    <ShieldX size={28} className="text-mg-danger" />
                </div>

                <h1 className="font-headline text-3xl text-mg-ink mb-2">Access Denied</h1>
                <p className="text-mg-charcoal font-body text-sm mb-8">
                    You don&apos;t have permission to view this page. If you believe this
                    is a mistake, try signing in with a different account.
                </p>

                <div className="flex gap-4 justify-center">
                    <Link
                        href="/"
                        className="px-8 py-3 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full
                                   font-label text-sm uppercase tracking-widest
                                   hover:scale-[0.98] transition-transform duration-200"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/signin"
                        className="px-8 py-3 rounded-full text-mg-brown font-label text-sm uppercase tracking-widest
                                   shadow-sm bg-white hover:bg-mg-smoke transition-colors"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
