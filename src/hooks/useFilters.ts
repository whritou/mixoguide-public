'use client';
import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function useFilters(defaultLimit = 20) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [params, setParams] = useState(() => {
    const init = new URLSearchParams(searchParams.toString());
    if (!init.has('limit')) init.set('limit', String(defaultLimit));
    return init;
  });

  // Resync when URL changes via browser back/forward — intentional: syncs state to external URL
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (!p.has('limit')) p.set('limit', String(defaultLimit));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParams(p);
  }, [searchParams, defaultLimit]);

  const pushParams = (next: URLSearchParams) => {
    startTransition(() => {
      router.push('?' + next.toString(), { scroll: false });
    });
  };

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') { next.delete(key) } else { next.set(key, value) }
    if (!next.has('limit')) next.set('limit', String(defaultLimit));
    setParams(next);
    pushParams(next);
  };

  const setDebounced = (key: string, value: string | null, delay = 350) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') { next.delete(key) } else { next.set(key, value) }
    if (!next.has('limit')) next.set('limit', String(defaultLimit));
    setParams(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams(next), delay);
  };

  const toggleCsvValue = (key: string, val: string) => {
    const list = new Set((params.get(key) ?? '').split(',').filter(Boolean));
    if (list.has(val)) { list.delete(val) } else { list.add(val) }
    set(key, list.size ? Array.from(list).join(',') : null);
  };

  const resetAll = () => {
    const fresh = new URLSearchParams();
    fresh.set('limit', String(defaultLimit));
    setParams(fresh);
    pushParams(fresh);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return { params, set, setDebounced, toggleCsvValue, resetAll };
}