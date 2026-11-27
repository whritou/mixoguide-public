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
            <div className="w-16 h-16 rounded-full bg-brand-soft/15 flex items-center justify-center mx-auto mb-6">
                <KeyRound size={28} className="text-brand" />
            </div>

            <h1 className="font-headline text-3xl text-fg mb-2">Forgot password?</h1>
            <p className="text-fg-secondary font-body text-sm mb-8">
                No worries. Enter your email and we&apos;ll send you a reset link.
            </p>

            {status === "sent" ? (
                <div>
                    <p className="text-sm text-brand bg-brand-soft/10 rounded-xl px-4 py-4 font-body mb-6">
                        Check your email for a password reset link.
                    </p>
                    <Link
                        href="/signin"
                        className="text-brand font-semibold text-sm hover:underline"
                    >
                        Back to sign in
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-fg-secondary mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-line/50 text-sm font-body text-fg
                                       placeholder:text-fg-muted border border-line-control
                                       focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="you@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full
                                   font-label text-sm uppercase tracking-widest
                                   hover:scale-[0.98] transition-transform duration-200
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sending..." : "Send reset link"}
                    </button>

                    {error && (
                        <p className="text-sm text-center text-danger bg-danger-bg rounded-xl px-4 py-3 font-body">
                            {error}
                        </p>
                    )}

                    <p className="text-center text-sm text-fg-secondary font-body pt-4">
                        <Link href="/signin" className="text-brand font-semibold hover:underline">
                            Back to sign in
                        </Link>
                    </p>
                </form>
            )}
        </div>
    );
}
