"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import Link from "next/link";
import TurnstileWidget from "@/components/ui/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

export default function SignInPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return new URLSearchParams(window.location.search).get("error");
    });
    const [loading, setLoading] = useState(false);
    const [callbackUrl] = useState(() => {
        if (typeof window === "undefined") return "/";
        return new URLSearchParams(window.location.search).get("callbackUrl") || "/";
    });
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);
    const submittingRef = useRef(false);

    async function handleCredSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (submittingRef.current || !turnstileToken) return;

        submittingRef.current = true;
        setLoading(true);
        setError(null);
        const fd = new FormData(e.currentTarget);

        try {
            const res = await signIn("credentials", {
                email: fd.get("email") as string,
                password: fd.get("password") as string,
                turnstileToken,
                callbackUrl,
                redirect: false,
            });

            if (res?.error === "EmailNotVerified") {
                router.push(
                    `/check-email?email=${encodeURIComponent(fd.get("email") as string)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
                );
                return;
            }

            if (res?.error) {
                if (res.error === "RateLimited") {
                    setError("Too many attempts. Please wait a few minutes and try again.");
                } else if (res.error === "CaptchaFailed") {
                    setError("Captcha verification failed. Please try again.");
                } else {
                    setError(res.error === "CredentialsSignin" ? "Invalid email or password." : res.error);
                }
                setLoading(false);
                submittingRef.current = false;
                turnstileRef.current?.reset();
                setTurnstileToken(null);
                return;
            }

            if (res?.url) {
                router.push(res.url);
                return;
            }

            setError("Unable to sign in. Please try again.");
            setLoading(false);
            submittingRef.current = false;
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        } catch {
            setError("Unable to sign in. Please try again.");
            setLoading(false);
            submittingRef.current = false;
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        }
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="font-headline text-3xl text-fg mb-2">Welcome back</h1>
                <p className="text-fg-secondary font-body text-sm">
                    Sign in to your account to continue mixing.
                </p>
            </div>

            <button
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                           bg-surface text-fg text-sm font-body font-medium
                           shadow-sm hover:bg-surface-hover transition-colors duration-200"
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
            </button>

            <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-line-strong/40" />
                <span className="text-[10px] font-label uppercase tracking-widest text-fg-muted">
                    or
                </span>
                <div className="flex-1 h-px bg-line-strong/40" />
            </div>

            <form onSubmit={handleCredSubmit} className="space-y-4" autoComplete="on">
                <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-fg-secondary mb-1.5">
                        Email
                    </label>
                    <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full px-4 py-3 rounded-xl bg-line/50 text-sm font-body text-fg
                                   placeholder:text-fg-muted border border-line-control
                                   focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-fg-secondary mb-1.5">
                        Password
                    </label>
                    <input
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        className="w-full px-4 py-3 rounded-xl bg-line/50 text-sm font-body text-fg
                                   placeholder:text-fg-muted border border-line-control
                                   focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Enter your password"
                    />
                </div>

                <div className="flex justify-end">
                    <Link
                        href="/request-reset-password"
                        className="text-xs text-brand font-medium hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                <div className="flex justify-center">
                    <TurnstileWidget
                        ref={turnstileRef}
                        onSuccess={setTurnstileToken}
                        onExpire={() => setTurnstileToken(null)}
                        onError={() => setTurnstileToken(null)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !turnstileToken}
                    className="w-full py-3 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full
                               font-label text-sm uppercase tracking-widest
                               hover:scale-[0.98] transition-transform duration-200
                               disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            {error && error !== "OAuthAccountNotLinked" && (
                <p className="mt-4 text-sm text-center text-danger bg-danger-bg rounded-xl px-4 py-3 font-body">
                    {error}
                </p>
            )}

            {error === "OAuthAccountNotLinked" && (
                <p className="mt-4 text-sm text-center text-danger bg-danger-bg rounded-xl px-4 py-3 font-body">
                    This email is already registered with another provider.
                </p>
            )}

            <p className="mt-8 text-center text-sm text-fg-secondary font-body">
                Don&apos;t have an account?{" "}
                <Link
                    href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="text-brand font-semibold hover:underline"
                >
                    Sign up
                </Link>
            </p>
        </>
    );
}
