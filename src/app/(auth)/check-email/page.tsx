"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, RotateCw } from "lucide-react";
import { useSearchParams } from "next/navigation";

function CheckEmailContent() {
    const searchParams = useSearchParams();

    const email = searchParams.get("email");
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
        return (
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-mg-sand flex items-center justify-center mx-auto mb-6">
                    <Mail size={28} className="text-mg-brown" />
                </div>
                <p className="text-mg-charcoal font-body">Loading...</p>
            </div>
        );
    }

    return (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-mg-caramel/15 flex items-center justify-center mx-auto mb-6">
                <Mail size={28} className="text-mg-brown" />
            </div>

            <h1 className="font-headline text-3xl text-mg-ink mb-2">Check your email</h1>
            <p className="text-mg-charcoal font-body text-sm mb-2">
                We&apos;ve sent a confirmation link to
            </p>
            <p className="text-mg-brown font-body font-semibold text-sm mb-8">
                {email}
            </p>
            <p className="text-mg-muted font-body text-sm mb-8">
                Click the link in the email to verify your account. If you don&apos;t see it,
                check your spam folder.
            </p>

            <button
                onClick={resend}
                disabled={remaining > 0 || sending}
                className="w-full py-3 rounded-full font-label text-sm uppercase tracking-widest transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed
                           bg-white text-mg-brown shadow-sm hover:bg-mg-smoke
                           flex items-center justify-center gap-2"
            >
                <RotateCw size={14} className={sending ? "animate-spin" : ""} />
                {remaining > 0
                    ? `Resend in ${remaining}s`
                    : "Resend verification email"
                }
            </button>

            {sent && (
                <p className="mt-4 text-sm text-mg-brown bg-mg-caramel/10 rounded-xl px-4 py-3 font-body">
                    Email sent! Check your inbox.
                </p>
            )}

            <p className="mt-8 text-center text-sm text-mg-charcoal font-body">
                <Link href="/signin" className="text-mg-brown font-semibold hover:underline">
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
                <div className="w-16 h-16 rounded-full bg-mg-sand flex items-center justify-center mx-auto mb-6">
                    <Mail size={28} className="text-mg-brown" />
                </div>
                <p className="text-mg-charcoal font-body">Loading...</p>
            </div>
        }>
            <CheckEmailContent />
        </Suspense>
    );
}
