"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const params =
        typeof window === "undefined"
            ? new URLSearchParams()
            : new URLSearchParams(window.location.search);
    const token = params.get("token");

    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password, passwordConfirm }),
        });

        setLoading(false);

        if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? "An error occurred. Please try again.");
            return;
        }

        setSuccess(true);
        setTimeout(() => router.push("/signin"), 2000);
    }

    return (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-mg-caramel/15 flex items-center justify-center mx-auto mb-6">
                <Lock size={28} className="text-mg-brown" />
            </div>

            <h1 className="font-headline text-3xl text-mg-ink mb-2">Reset your password</h1>
            <p className="text-mg-charcoal font-body text-sm mb-8">
                Enter your new password below.
            </p>

            {success ? (
                <div>
                    <p className="text-sm text-mg-brown bg-mg-caramel/10 rounded-xl px-4 py-4 font-body mb-4">
                        Password updated successfully. Redirecting to sign in...
                    </p>
                    <Link
                        href="/signin"
                        className="text-mg-brown font-semibold text-sm hover:underline"
                    >
                        Go to sign in
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-mg-charcoal mb-1.5">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError("");
                            }}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-mg-sand/50 text-sm font-body text-mg-ink
                                       placeholder:text-mg-muted border-none
                                       focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                            placeholder="Enter new password"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-mg-charcoal mb-1.5">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(e) => {
                                setPasswordConfirm(e.target.value);
                                setError("");
                            }}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-mg-sand/50 text-sm font-body text-mg-ink
                                       placeholder:text-mg-muted border-none
                                       focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                            placeholder="Confirm new password"
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
                        {loading ? "Resetting..." : "Reset password"}
                    </button>

                    {error && (
                        <p className="text-sm text-center text-mg-danger bg-mg-danger-light rounded-xl px-4 py-3 font-body">
                            {error}
                        </p>
                    )}
                </form>
            )}
        </div>
    );
}
