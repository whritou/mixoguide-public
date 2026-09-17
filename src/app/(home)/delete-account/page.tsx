import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { AlertTriangle, Trash2 } from "lucide-react";

import { DangerZone } from "@/components/user/DangerZone";
import { Section } from "@/components/user/Section";
import { options } from "@/lib/auth/authOptions";
import { userService } from "@/services/user.service";

const CALLBACK_URL = "/delete-account";

export const metadata: Metadata = {
    title: "Delete Account",
    description: "Request deletion of your MixoGuide account and associated data.",
    robots: {
        index: false,
        follow: false,
    },
};

async function getDeleteAccountState() {
    const session = await getServerSession(options);
    if (!session?.user?.id) return { isAuthenticated: false, hasPassword: false };

    try {
        const user = await userService.getWithStats(session.user.id);
        const linkedProviders = user.accounts.map((account) => account.provider);

        return {
            isAuthenticated: true,
            hasPassword: user.password !== null && !linkedProviders.includes("google"),
        };
    } catch {
        return { isAuthenticated: false, hasPassword: false };
    }
}

export default async function DeleteAccountPage() {
    const { isAuthenticated, hasPassword } = await getDeleteAccountState();
    const signupHref = `/signup?callbackUrl=${encodeURIComponent(CALLBACK_URL)}`;

    return (
        <div className="min-h-[calc(100vh-72px)] bg-mg-cream px-4 py-12 md:px-12">
            <div className="mx-auto max-w-3xl space-y-8">
                <div>
                    <p className="mb-3 font-label text-xs uppercase tracking-widest text-mg-muted">
                        Account deletion
                    </p>
                    <h1 className="font-headline text-4xl text-mg-ink">
                        Delete your MixoGuide account
                    </h1>
                </div>

                {isAuthenticated ? (
                    <DangerZone hasPassword={hasPassword} />
                ) : (
                    <Section icon={AlertTriangle} title="Danger Zone" danger>
                        <p className="mb-4 font-body text-sm text-mg-charcoal/80">
                            Permanently delete your account and all associated data: pantry,
                            favourites, ratings, and planned cocktails.
                        </p>

                        <Link
                            href={signupHref}
                            className="flex w-fit items-center gap-2 rounded-full border border-mg-danger/40 px-5 py-2.5
                                       font-label text-xs uppercase tracking-widest text-mg-danger transition-colors
                                       hover:bg-mg-danger/5"
                        >
                            <Trash2 size={14} />
                            Delete my account
                        </Link>
                    </Section>
                )}
            </div>
        </div>
    );
}
