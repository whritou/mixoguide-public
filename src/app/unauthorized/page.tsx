"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-danger-bg flex items-center justify-center mx-auto mb-6">
                    <ShieldX size={28} className="text-danger" />
                </div>

                <h1 className="font-headline text-3xl text-fg mb-2">Access Denied</h1>
                <p className="text-fg-secondary font-body text-sm mb-8">
                    You don&apos;t have permission to view this page. If you believe this
                    is a mistake, try signing in with a different account.
                </p>

                <div className="flex gap-4 justify-center">
                    <Link
                        href="/"
                        className="px-8 py-3 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full
                                   font-label text-sm uppercase tracking-widest
                                   hover:scale-[0.98] transition-transform duration-200"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/signin"
                        className="px-8 py-3 rounded-full text-brand font-label text-sm uppercase tracking-widest
                                   shadow-sm bg-surface hover:bg-surface-hover transition-colors"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
