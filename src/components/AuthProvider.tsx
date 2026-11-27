"use client";

import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Last session value observed on the client. next-auth v4 keeps its session
 * cache in a module-global that is wiped when a `SessionProvider` unmounts, so
 * when the user navigates between top-level layouts (e.g. /planner → /cocktails)
 * the new provider would otherwise start as "unauthenticated" until it refetches.
 * Seeding the new provider with the last known value avoids that flicker.
 */
let lastKnownSession: Session | null | undefined = undefined;

function SessionTracker() {
  const { data, status } = useSession();
  useEffect(() => {
    if (status !== "loading") lastKnownSession = data ?? null;
  }, [data, status]);
  return null;
}

interface AuthProviderProps {
  children: ReactNode;
  /**
   * Session resolved on the server (guarded layouts already call
   * `guardUser()`/`guardAdmin()`). When provided, `useSession()` is
   * `authenticated` on first paint and no `/api/auth/session` request is made.
   * Public layouts omit it so they stay statically renderable.
   */
  session?: Session | null;
}

/**
 * Mounted once per top-level layout (never nested — next-auth's client state is
 * module-global, so nested providers would overwrite each other).
 */
export default function AuthProvider({ children, session }: AuthProviderProps) {
  // Captured once per mount: SessionProvider only reads `session` on mount anyway.
  const [initialSession] = useState(() =>
    session !== undefined ? session : lastKnownSession,
  );

  return (
    <SessionProvider session={initialSession}>
      <SessionTracker />
      {children}
    </SessionProvider>
  );
}
