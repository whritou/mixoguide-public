"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { isDarkModeAvailable } from "@/lib/env";
import { useCallbackUrl } from "@/hooks/usePreviousUrl";
import { CalendarDays, FlaskConical, Home, Instagram, LogIn, Martini, MoreHorizontal, Package, Wrench } from "lucide-react";
import { useState } from "react";

type MenuItem = {
    label: string;
    href: string;
    requireAuth?: boolean;
    roles?: string[];
};

const MENU_ITEMS: MenuItem[] = [
    { label: "Home", href: "/" },
    { label: "Cocktails", href: "/cocktails" },
    { label: "Pantry", href: "/pantry", requireAuth: true },
    { label: "Planner", href: "/planner", requireAuth: true },
    { label: "Ingredients", href: "/ingredients" },
    { label: "Bar Tools", href: "/bar-tools" },
    { label: "Admin", href: "/admin", roles: ["ADMIN"] },
];

const INSTAGRAM_URL = "https://www.instagram.com/mixoguide/";

export default function AppBar() {
    const { data: session } = useSession();
    const callbackUrl = useCallbackUrl();
    const pathname = usePathname();
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

    const filteredItems = MENU_ITEMS.filter((item) => {
        if (item.requireAuth && !session) return false;
        if (item.roles) {
            if (!session?.user?.role) return false;
            return item.roles.includes(session.user.role);
        }
        return true;
    });

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    const mobilePrimaryItems = [
        { label: "Home", href: "/", icon: Home },
        { label: "Cocktails", href: "/cocktails", icon: Martini },
        { label: "Pantry", href: "/pantry", icon: Package, requireAuth: true },
        { label: "Planner", href: "/planner", icon: CalendarDays, requireAuth: true },
    ];

    const mobileGuestItems = [
        { label: "Home", href: "/", icon: Home },
        { label: "Cocktails", href: "/cocktails", icon: Martini },
        { label: "Ingredients", href: "/ingredients", icon: FlaskConical },
        { label: "Bar Tools", href: "/bar-tools", icon: Wrench },
    ];

    const morePaths = ["/ingredients", "/user", "/stats", "/bar-tools", "/admin"];
    const moreActive = morePaths.some((path) => isActive(path));
    const authCallback = callbackUrl ?? pathname ?? "/";

    return (
        <>
            <nav data-app-bar className="hidden md:block fixed top-0 w-full z-50 bg-canvas/80 backdrop-blur-md">
                <div className="flex justify-between items-center px-6 md:px-12 py-5 max-w-full mx-auto">
                    <div className="flex items-center gap-8 lg:gap-12">
                        <Link
                            href="/"
                            className="font-headline text-2xl italic text-brand shrink-0"
                        >
                            Mixoguide
                        </Link>

                        <div className="hidden md:flex gap-6 lg:gap-8">
                            {filteredItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        font-label uppercase tracking-widest text-[12px] pb-1 transition-colors duration-300
                                        ${isActive(item.href)
                                            ? "text-brand font-bold border-b-2 border-brand"
                                            : "text-fg/70 font-medium hover:text-brand"
                                        }
                                    `}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-6">
                        <ThemeToggle />
                        {session ? (
                            <>
                                <a
                                    href={INSTAGRAM_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Follow MixoGuide on Instagram"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-soft/25 bg-surface/60 text-brand transition-colors hover:border-brand-soft hover:bg-surface"
                                >
                                    <Instagram size={16} aria-hidden="true" />
                                </a>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="focus:outline-none">
                                            <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-line-strong/30 hover:ring-ring transition-all">
                                                <AvatarImage src={session.user?.image || ""} alt={"User profile image"} />
                                                <AvatarFallback className="bg-brand text-fg-on-brand text-xs font-label">
                                                    {session.user?.name?.[0]?.toUpperCase() ?? "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="z-[130] bg-surface/95 backdrop-blur-md border-line-strong/20 rounded-xl shadow-lg"
                                    >
                                        <DropdownMenuItem asChild>
                                            <Link href="/user" className="text-sm font-body text-fg">
                                                Profile
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/stats" className="text-sm font-body text-fg">
                                                My Stats
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => signOut({ callbackUrl: "/" })}
                                            className="text-sm font-body text-fg"
                                        >
                                            Logout
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <div className="hidden md:flex items-center gap-3">
                                <Link
                                    href={`/signin?callbackUrl=${encodeURIComponent(authCallback)}`}
                                    className="text-[10px] font-label uppercase tracking-widest text-brand font-bold hover:opacity-80 transition-opacity"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href={`/signup?callbackUrl=${encodeURIComponent(authCallback)}`}
                                    className="px-5 py-2 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full
                                                font-label text-[10px] uppercase tracking-widest hover:scale-95 transition-transform duration-200"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <div data-app-bar className="md:hidden fixed inset-x-4 bottom-4 z-[130]">
                {/* ── Authenticated: More drawer ── */}
                {session && mobileMoreOpen && (
                    <div className="mb-2 rounded-2xl border border-line-strong/50 bg-canvas/95 backdrop-blur-md shadow-[0_12px_30px_rgba(27,28,26,0.18)] p-2">
                        <div className="flex flex-col">
                            {isDarkModeAvailable() && (
                                <div className="flex items-center justify-between px-4 py-1 text-sm text-fg/85">
                                    Theme
                                    <ThemeToggle />
                                </div>
                            )}
                            <Link
                                href="/ingredients"
                                onClick={() => setMobileMoreOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-fg/85 hover:bg-surface-muted-hover transition-colors"
                            >
                                Ingredients
                            </Link>
                            <Link
                                href="/user"
                                onClick={() => setMobileMoreOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-fg/85 hover:bg-surface-muted-hover transition-colors"
                            >
                                Profile
                            </Link>
                            <Link
                                href="/stats"
                                onClick={() => setMobileMoreOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-fg/85 hover:bg-surface-muted-hover transition-colors"
                            >
                                Stats
                            </Link>
                            <Link
                                href="/bar-tools"
                                onClick={() => setMobileMoreOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-fg/85 hover:bg-surface-muted-hover transition-colors"
                            >
                                Bar tools
                            </Link>
                            {session.user?.role === "ADMIN" && (
                                <Link
                                    href="/admin"
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="px-4 py-3 rounded-xl text-sm text-fg/85 hover:bg-surface-muted-hover transition-colors"
                                >
                                    Admin
                                </Link>
                            )}
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="mt-2 px-4 py-3 rounded-xl text-left text-sm text-missing hover:bg-missing-bg transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}

                {!session && isDarkModeAvailable() && (
                    <div className="mb-2 flex justify-end">
                        <ThemeToggle className="size-11 bg-canvas/95 backdrop-blur-md" />
                    </div>
                )}

                {session ? (
                    /* ── Authenticated bottom bar: Home / Cocktails / Pantry / Planner / More ── */
                    <div className="grid grid-cols-5 gap-1 rounded-2xl border border-line-strong/50 bg-canvas/95 backdrop-blur-md shadow-[0_12px_30px_rgba(27,28,26,0.18)] p-2">
                        {mobilePrimaryItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className={`rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                                        active
                                            ? "bg-surface-muted-hover text-brand"
                                            : "text-fg-dim hover:bg-surface-muted"
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span className="font-label text-[9px] uppercase tracking-[0.08em]">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setMobileMoreOpen((prev) => !prev)}
                            className={`rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                                moreActive || mobileMoreOpen
                                    ? "bg-surface-muted-hover text-brand"
                                    : "text-fg-dim hover:bg-surface-muted"
                            }`}
                        >
                            <MoreHorizontal size={16} />
                            <span className="font-label text-[9px] uppercase tracking-[0.08em]">
                                More
                            </span>
                        </button>
                    </div>
                ) : (
                    /* ── Guest bottom bar: Home / Cocktails / Ingredients / Bar Tools / Login ── */
                    <div className="grid grid-cols-5 gap-1 rounded-2xl border border-line-strong/50 bg-canvas/95 backdrop-blur-md shadow-[0_12px_30px_rgba(27,28,26,0.18)] p-2">
                        {mobileGuestItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                                        active
                                            ? "bg-surface-muted-hover text-brand"
                                            : "text-fg-dim hover:bg-surface-muted"
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span className="font-label text-[9px] uppercase tracking-[0.08em]">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                        <Link
                            href={`/signin?callbackUrl=${encodeURIComponent(authCallback)}`}
                            className="rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-colors text-brand hover:bg-surface-muted"
                        >
                            <LogIn size={16} />
                            <span className="font-label text-[9px] uppercase tracking-[0.08em]">
                                Login
                            </span>
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}
