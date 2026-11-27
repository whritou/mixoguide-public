"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Mail, RotateCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
    readPendingVerificationEmail,
    subscribePendingVerificationEmail,
} from "@/components/auth/pending-verification-email";

function CheckEmailContent() {
    const searchParams = useSearchParams();

    // SEC-018: the address arrives via sessionStorage; the ?email= query param
    // is only a fallback for links created before this change.
    const storedEmail = useSyncExternalStore(
        subscribePendingVerificationEmail,
        readPendingVerificationEmail,
        () => null,
    );
    const email = storedEmail ?? searchParams.get("email");
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [remaining, setRemaining] = useState(60);
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (remaining <= 0) return;
        const id = setInterval(() => setRemaining((r) => r - 1), 1000);
        return () => clearInterval(id);
    }, [remaining]);

    async function resend() {
        setSent(false);
        setSending(true);
        const res = await fetch("/api/auth/resend-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, callbackUrl }),
        });
        setSending(false);
        if (res.ok) {
            setSent(true);
            setRemaining(60);
        }
    }

    if (!email) {
        // No address available (new tab, storage blocked): explain instead of
        // spinning forever, and let the person get back to sign in.
        return (
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-line flex items-center justify-center mx-auto mb-6">
                    <Mail size={28} aria-hidden="true" className="text-brand" />
                </div>
                <h1 className="font-headline text-3xl text-fg mb-2">Check your email</h1>
                <p className="text-fg-secondary font-body text-sm mb-8">
                    If you just signed up, we&apos;ve sent a confirmation link to your inbox.
                    Sign in again to get a new link.
                </p>
                <Link href="/signin" className="text-brand font-semibold text-sm hover:underline">
                    Back to sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-brand-soft/15 flex items-center justify-center mx-auto mb-6">
                <Mail size={28} aria-hidden="true" className="text-brand" />
            </div>

            <h1 className="font-headline text-3xl text-fg mb-2">Check your email</h1>
            <p className="text-fg-secondary font-body text-sm mb-2">
                We&apos;ve sent a confirmation link to
            </p>
            <p className="text-brand font-body font-semibold text-sm mb-8">
                {email}
            </p>
            <p className="text-fg-muted font-body text-sm mb-8">
                Click the link in the email to verify your account. If you don&apos;t see it,
                check your spam folder.
            </p>

            <button
                type="button"
                onClick={resend}
                disabled={remaining > 0 || sending}
                className="w-full py-3 rounded-full font-label text-sm uppercase tracking-widest transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed
                           bg-surface text-brand shadow-sm hover:bg-surface-hover
                           flex items-center justify-center gap-2"
            >
                <RotateCw size={14} aria-hidden="true" className={sending ? "animate-spin motion-reduce:animate-none" : ""} />
                {remaining > 0
                    ? `Resend in ${remaining}s`
                    : "Resend verification email"
                }
            </button>

            {sent && (
                <p role="status" className="mt-4 text-sm text-brand bg-brand-soft/10 rounded-xl px-4 py-3 font-body">
                    Email sent! Check your inbox.
                </p>
            )}

            <p className="mt-8 text-center text-sm text-fg-secondary font-body">
                <Link href="/signin" className="text-brand font-semibold hover:underline">
                    Back to sign in
                </Link>
            </p>
        </div>
    );
}

export default function CheckEmailPage() {
    return (
        <Suspense fallback={
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-line flex items-center justify-center mx-auto mb-6">
                    <Mail size={28} aria-hidden="true" className="text-brand" />
                </div>
                <p role="status" className="text-fg-secondary font-body">Loading...</p>
            </div>
        }>
            <CheckEmailContent />
        </Suspense>
    );
}
