"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

interface TurnstileWidgetProps {
    onSuccess: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    /**
     * Turnstile action name (e.g. "signin", "signup"). Sent with the challenge so
     * the server can check the token was minted for this form.
     */
    action?: string;
}

function cleanSiteKey(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;

    if (
        (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim() || undefined;
    }

    return trimmed;
}

/**
 * Cloudflare Turnstile challenge. When the widget can't load (missing site key)
 * or the challenge errors, it renders a visible, announced message so people
 * understand why the submit button stays disabled, plus a retry button.
 */
const TurnstileWidget = forwardRef<TurnstileInstance | null, TurnstileWidgetProps>(
    ({ onSuccess, onExpire, onError, action }, ref) => {
        const siteKey = cleanSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
        const innerRef = useRef<TurnstileInstance | null>(null);
        const [failed, setFailed] = useState(false);

        useImperativeHandle(ref, () => innerRef.current as TurnstileInstance, []);

        useEffect(() => {
            if (!siteKey) console.error("[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured.");
        }, [siteKey]);

        const handleError = useCallback(() => {
            setFailed(true);
            onError?.();
        }, [onError]);

        const handleSuccess = useCallback(
            (token: string) => {
                setFailed(false);
                onSuccess(token);
            },
            [onSuccess],
        );

        const retry = useCallback(() => {
            setFailed(false);
            innerRef.current?.reset();
        }, []);

        if (!siteKey) {
            return (
                <p role="alert" className="text-sm text-center text-danger bg-danger-bg rounded-xl px-4 py-3 font-body">
                    The security check is unavailable right now, so this form can&apos;t be submitted.
                    Please try again later.
                </p>
            );
        }

        return (
            <div className="flex flex-col items-center gap-2">
                <Turnstile
                    ref={innerRef}
                    siteKey={siteKey}
                    onSuccess={handleSuccess}
                    onExpire={onExpire}
                    onError={handleError}
                    options={{ theme: "auto", ...(action ? { action } : {}) }}
                />
                {failed && (
                    <div role="alert" className="flex flex-col items-center gap-2 text-sm text-danger font-body text-center">
                        <p>The security check failed, so the form can&apos;t be submitted yet.</p>
                        <button
                            type="button"
                            onClick={retry}
                            className="min-h-8 px-4 rounded-full border border-line-control text-xs font-label uppercase tracking-widest text-fg-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Retry security check
                        </button>
                    </div>
                )}
            </div>
        );
    }
);

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
