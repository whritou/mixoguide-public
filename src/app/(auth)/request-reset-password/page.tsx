"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export default function RequestResetPassword() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setStatus("idle");
        setLoading(true);

        const res = await fetch("/api/auth/request-reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        setLoading(false);

        if (res.ok) {
            setStatus("sent");
        } else {
            try {
                const data = await res.json();
                setError(data.error ?? "An error occurred. Please try again.");
            } catch {
                setError("An error occurred. Please try again.");
            }
            setStatus("error");
        }
    }

    return (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-mg-caramel/15 flex items-center justify-center mx-auto mb-6">
                <KeyRound size={28} className="text-mg-brown" />
            </div>

            <h1 className="font-headline text-3xl text-mg-ink mb-2">Forgot password?</h1>
            <p className="text-mg-charcoal font-body text-sm mb-8">
                No worries. Enter your email and we&apos;ll send you a reset link.
            </p>

            {status === "sent" ? (
                <div>
                    <p className="text-sm text-mg-brown bg-mg-caramel/10 rounded-xl px-4 py-4 font-body mb-6">
                        Check your email for a password reset link.
                    </p>
                    <Link
                        href="/signin"
                        className="text-mg-brown font-semibold text-sm hover:underline"
                    >
                        Back to sign in
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-mg-charcoal mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-mg-sand/50 text-sm font-body text-mg-ink
                                       placeholder:text-mg-muted border-none
                                       focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                            placeholder="you@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full
                                   font-label text-sm uppercase tracking-widest
                                   hover:scale-[0.98] transition-transform duration-200
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sending..." : "Send reset link"}
                    </button>

                    {error && (
                        <p className="text-sm text-center text-mg-danger bg-mg-danger-light rounded-xl px-4 py-3 font-body">
                            {error}
                        </p>
                    )}

                    <p className="text-center text-sm text-mg-charcoal font-body pt-4">
                        <Link href="/signin" className="text-mg-brown font-semibold hover:underline">
                            Back to sign in
                        </Link>
                    </p>
                </form>
            )}
        </div>
    );
}
