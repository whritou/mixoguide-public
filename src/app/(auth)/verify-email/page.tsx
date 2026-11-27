"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";

/**
 * Email verification confirmation (SEC-009).
 * The emailed link lands here (GET has no side effects); the token is only
 * consumed when the person clicks the button, so link scanners and prefetchers
 * cannot burn it.
 */
function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    async function confirm() {
        setStatus("submitting");
        setError(null);
        try {
            const res = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, callbackUrl }),
            });
            const json = await res.json().catch(() => null) as
                | { success: true; data: { redirectTo: string } }
                | { success: false; error?: { message?: string } }
                | null;

            if (res.ok && json?.success) {
                // Full navigation so the new session cookie is picked up everywhere.
                window.location.assign(json.data.redirectTo || "/");
                return;
            }
            setError(
                (json && !json.success && json.error?.message) ||
                "This link is invalid or has expired. Request a new one from the sign-in page.",
            );
            setStatus("error");
        } catch {
            setError("Something went wrong. Check your connection and try again.");
            setStatus("error");
        }
    }

    if (!token) {
        return (
            <div className="text-center">
                <h1 className="font-headline text-3xl text-fg mb-4">Verification link incomplete</h1>
                <p className="text-fg-secondary font-body text-sm mb-6">
                    Open the link from your email again, or request a new one.
                </p>
                <Link href="/signin" className="text-brand underline font-body text-sm">Back to sign in</Link>
            </div>
        );
    }

    return (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-brand-soft/15 flex items-center justify-center mx-auto mb-6" aria-hidden="true">
                <MailCheck size={28} className="text-brand" />
            </div>

            <h1 className="font-headline text-3xl text-fg mb-2">Confirm your email</h1>
            <p className="text-fg-secondary font-body text-sm mb-8">
                Click the button below to finish verifying your MixoGuide account.
            </p>

            <button
                type="button"
                onClick={confirm}
                disabled={status === "submitting"}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-8 py-3 font-label text-sm uppercase tracking-widest text-fg-on-brand transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
            >
                {status === "submitting" ? "Confirming…" : "Confirm my email"}
            </button>

            {error && (
                <p role="alert" className="mt-6 text-sm text-danger font-body">
                    {error}{" "}
                    <Link href="/signin" className="underline">Back to sign in</Link>
                </p>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<p className="text-center text-fg-secondary font-body" role="status">Loading…</p>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
