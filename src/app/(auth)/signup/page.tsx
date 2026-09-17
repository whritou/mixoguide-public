"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Camera } from "lucide-react";
import TurnstileWidget from "@/components/ui/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useUploadAvatar } from "@/hooks/mutations/use-upload-avatar";

export default function SignUpPage() {
    const router = useRouter();
    const [callbackUrl] = useState(() => {
        if (typeof window === "undefined") return "/";
        return new URLSearchParams(window.location.search).get("callbackUrl") || "/";
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [ageConfirmed, setAgeConfirmed] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);
    const submittingRef = useRef(false);
    const uploadAvatar = useUploadAvatar();

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        if (file) {
            setPreview(URL.createObjectURL(file));
            setImageFile(file);
        } else {
            setPreview(null);
            setImageFile(null);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (submittingRef.current || !turnstileToken) return;

        submittingRef.current = true;
        setLoading(true);
        setError("");
        const fd = new FormData(e.currentTarget);

        let imageUrl: string | null = null;
        if (imageFile) {
            try {
                imageUrl = await uploadAvatar.mutateAsync(imageFile);
            } catch {
                setError("Avatar upload failed. Please try a smaller image or continue without one.");
                setLoading(false);
                submittingRef.current = false;
                return;
            }
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fd.get("name"),
                    email: fd.get("email"),
                    password: fd.get("password"),
                    confirmPassword: fd.get("confirmPassword"),
                    image: imageUrl,
                    callbackUrl,
                    turnstileToken,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error?.message ?? "An error occurred. Please try again.");
                setLoading(false);
                submittingRef.current = false;
                turnstileRef.current?.reset();
                setTurnstileToken(null);
                return;
            }

            router.push(
                `/check-email?email=${encodeURIComponent(fd.get("email") as string)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
            );
        } catch {
            setError("An error occurred. Please try again.");
            setLoading(false);
            submittingRef.current = false;
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        }
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="font-headline text-3xl text-mg-ink mb-2">Create your account</h1>
                <p className="text-mg-charcoal font-body text-sm">
                    Join Mixoguide and start crafting your perfect cocktails.
                </p>
            </div>

            <button
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                           bg-white text-mg-ink text-sm font-body font-medium
                           shadow-sm hover:bg-mg-smoke transition-colors duration-200"
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
                <div className="flex-1 h-px bg-mg-bone/40" />
                <span className="text-[10px] font-label uppercase tracking-widest text-mg-muted">or</span>
                <div className="flex-1 h-px bg-mg-bone/40" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
                {/* Avatar upload */}
                <div className="flex justify-center mb-2">
                    <label className="relative cursor-pointer group">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-mg-sand flex items-center justify-center
                                        ring-2 ring-mg-bone/30 group-hover:ring-mg-caramel transition-all">
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={24} className="text-mg-muted" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-mg-brown to-mg-caramel
                                        rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs">+</span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>

                <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-mg-charcoal mb-1.5">
                        Name
                    </label>
                    <input
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        className="w-full px-4 py-3 rounded-xl bg-mg-sand/50 text-sm font-body text-mg-ink
                                   placeholder:text-mg-muted border-none
                                   focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                        placeholder="Your name"
                    />
                </div>
                <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-mg-charcoal mb-1.5">
                        Email
                    </label>
                    <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full px-4 py-3 rounded-xl bg-mg-sand/50 text-sm font-body text-mg-ink
                                   placeholder:text-mg-muted border-none
                                   focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-mg-charcoal mb-1.5">
                        Password
                    </label>
                    <input
                        name="password"
                        type="password"
                        required
                        autoComplete="new-password"
                        className="w-full px-4 py-3 rounded-xl bg-mg-sand/50 text-sm font-body text-mg-ink
                                   placeholder:text-mg-muted border-none
                                   focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                        placeholder="Create a password"
                    />
                </div>
                <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-mg-charcoal mb-1.5">
                        Confirm Password
                    </label>
                    <input
                        name="confirmPassword"
                        type="password"
                        required
                        autoComplete="new-password"
                        className="w-full px-4 py-3 rounded-xl bg-mg-sand/50 text-sm font-body text-mg-ink
                                   placeholder:text-mg-muted border-none
                                   focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                        placeholder="Confirm your password"
                    />
                </div>

                {/* Age confirmation */}
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={ageConfirmed}
                        onChange={(e) => setAgeConfirmed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-mg-brown flex-shrink-0"
                    />
                    <span className="text-xs text-mg-charcoal font-body leading-relaxed">
                        I confirm that I am at least 18 years old and of legal drinking age in my country or region.
                    </span>
                </label>

                {/* Terms & Privacy */}
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-mg-brown flex-shrink-0"
                    />
                    <span className="text-xs text-mg-charcoal font-body leading-relaxed">
                        I agree to the{" "}
                        <Link href="/terms-of-use" target="_blank" className="text-mg-brown hover:underline font-semibold">
                            Terms of Use
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy-policy" target="_blank" className="text-mg-brown hover:underline font-semibold">
                            Privacy Policy
                        </Link>
                        .
                    </span>
                </label>

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
                    disabled={loading || !ageConfirmed || !termsAccepted || !turnstileToken}
                    className="w-full py-3 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full
                               font-label text-sm uppercase tracking-widest
                               hover:scale-[0.98] transition-transform duration-200
                               disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating account..." : "Create account"}
                </button>
            </form>

            {error && (
                <p className="mt-4 text-sm text-center text-mg-danger bg-mg-danger-light rounded-xl px-4 py-3 font-body">
                    {error}
                </p>
            )}

            <p className="mt-8 text-center text-sm text-mg-charcoal font-body">
                Already have an account?{" "}
                <Link
                    href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="text-mg-brown font-semibold hover:underline"
                >
                    Sign in
                </Link>
            </p>
        </>
    );
}
