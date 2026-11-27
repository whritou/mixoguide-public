'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * URL-backed filter state. The URL is the single source of truth: `params` is
 * derived from `useSearchParams()` (memoized on its string form), so browser
 * back/forward needs no syncing effect.
 *
 * The only local state is an optimistic overlay for writes that have not
 * reached the URL yet (router transition in flight, or a debounced search
 * keystroke). It is tied to the URL it was based on and is ignored as soon as
 * the URL changes, so it can never diverge from navigation.
 */
export function useFilters(defaultLimit = 20) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlString = searchParams.toString();
  const [pending, setPending] = useState<{ base: string; next: string } | null>(null);
  const source = pending && pending.base === urlString ? pending.next : urlString;

  const params = useMemo(() => {
    const p = new URLSearchParams(source);
    if (!p.has('limit')) p.set('limit', String(defaultLimit));
    return p;
  }, [source, defaultLimit]);

  const pushParams = useCallback((next: URLSearchParams) => {
    startTransition(() => {
      router.push('?' + next.toString(), { scroll: false });
    });
  }, [router]);

  const build = useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') { next.delete(key) } else { next.set(key, value) }
    if (!next.has('limit')) next.set('limit', String(defaultLimit));
    return next;
  }, [params, defaultLimit]);

  const set = useCallback((key: string, value: string | null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const next = build(key, value);
    setPending({ base: urlString, next: next.toString() });
    pushParams(next);
  }, [build, pushParams, urlString]);

  const setDebounced = useCallback((key: string, value: string | null, delay = 350) => {
    const next = build(key, value);
    setPending({ base: urlString, next: next.toString() });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams(next), delay);
  }, [build, pushParams, urlString]);

  const toggleCsvValue = useCallback((key: string, val: string) => {
    const list = new Set((params.get(key) ?? '').split(',').filter(Boolean));
    if (list.has(val)) { list.delete(val) } else { list.add(val) }
    set(key, list.size ? Array.from(list).join(',') : null);
  }, [params, set]);

  const resetAll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const fresh = new URLSearchParams();
    fresh.set('limit', String(defaultLimit));
    setPending({ base: urlString, next: fresh.toString() });
    pushParams(fresh);
  }, [defaultLimit, pushParams, urlString]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return { params, set, setDebounced, toggleCsvValue, resetAll };
}
