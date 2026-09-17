"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useEffect } from "react";

interface TurnstileWidgetProps {
    onSuccess: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
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

const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
    ({ onSuccess, onExpire, onError }, ref) => {
        const siteKey = cleanSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

        useEffect(() => {
            if (!siteKey) console.error("[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured.");
        }, [siteKey]);

        if (!siteKey) return null;

        return (
            <Turnstile
                ref={ref}
                siteKey={siteKey}
                onSuccess={onSuccess}
                onExpire={onExpire}
                onError={onError}
                options={{ theme: "light" }}
            />
        );
    }
);

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
