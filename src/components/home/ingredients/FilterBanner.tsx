import { useState, useRef, type TouchEvent } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterKey } from './FilterConstants';
import { FilterPanel } from './FilterPanel';

type MobileSectionKey = 'type' | 'subType' | 'alcohol' | 'sort';

// First entry is the default fallback shown when no sortBy/sortOrder is in the
// URL. Keep "Most used" first so the dropdown matches the server-side default
// (orderBy cocktailIngredients _count desc).
const SORT_OPTIONS = [
  { label: 'Most used',   sortBy: 'usageCount', sortOrder: 'desc' },
  { label: 'Least used',  sortBy: 'usageCount', sortOrder: 'asc'  },
  { label: 'A - Z',       sortBy: 'name',       sortOrder: 'asc'  },
  { label: 'Z - A',       sortBy: 'name',       sortOrder: 'desc' },
  { label: 'Highest ABV', sortBy: 'abv',        sortOrder: 'desc' },
  { label: 'Lowest ABV',  sortBy: 'abv',        sortOrder: 'asc'  },
] as const;

export function FilterBanner({
  openKey,
  setOpenKey,
  filters,
  typeOpts = [],
  subTypeOpts = [],
}: {
  openKey: FilterKey | null;
  setOpenKey: React.Dispatch<React.SetStateAction<FilterKey | null>>;
  filters: ReturnType<typeof import('@/hooks/useFilters').useFilters>;
  typeOpts?: { id: string; name: string }[];
  subTypeOpts?: { id: string; name: string; typeId: string }[];
}) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [mobileOpenSection, setMobileOpenSection] = useState<MobileSectionKey | null>(null);
  const [mobileSheetOffset, setMobileSheetOffset] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const mobileSheetStartY = useRef<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const p = filters.params;

  const typeCount = (p.get('types') || '').split(',').filter(Boolean).length;
  const subTypeCount = (p.get('subTypes') || '').split(',').filter(Boolean).length;
  const alcoholActive = p.get('alcoholic') && p.get('alcoholic') !== 'any';
  const alcoholValue = p.get('alcoholic') ?? 'any';
  const totalActive = typeCount + subTypeCount + (alcoholActive ? 1 : 0) + (p.get('search') ? 1 : 0);

  const openPanel = (key: FilterKey) => {
    setShowSortMenu(false);
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const closeMobileSheet = () => {
    setIsMobileFiltersOpen(false);
    setMobileOpenSection(null);
    setMobileSheetOffset(0);
    setIsSheetDragging(false);
    mobileSheetStartY.current = null;
  };

  const onMobileSheetTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    mobileSheetStartY.current = e.touches[0]?.clientY ?? null;
    setIsSheetDragging(true);
  };

  const onMobileSheetTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (mobileSheetStartY.current == null) return;
    const currentY = e.touches[0]?.clientY ?? mobileSheetStartY.current;
    const delta = currentY - mobileSheetStartY.current;
    setMobileSheetOffset(delta > 0 ? Math.min(delta, 180) : 0);
  };

  const onMobileSheetTouchEnd = () => {
    if (mobileSheetOffset > 90) {
      closeMobileSheet();
      return;
    }
    setMobileSheetOffset(0);
    setIsSheetDragging(false);
    mobileSheetStartY.current = null;
  };

  const setSort = (sortBy: string, sortOrder: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('sortBy', sortBy);
    next.set('sortOrder', sortOrder);
    router.push('?' + next.toString(), { scroll: false });
    setShowSortMenu(false);
  };

  const currentSort = SORT_OPTIONS.find(
    s => s.sortBy === p.get('sortBy') && s.sortOrder === p.get('sortOrder')
  ) ?? SORT_OPTIONS[0];

  const pill = (label: string, key: FilterKey, count = 0) => (
    <button
      key={key}
      onClick={() => openPanel(key)}
      className={clsx(
        'hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-label border transition-colors whitespace-nowrap',
        openKey === key || count > 0
          ? 'border-brand bg-surface-subtle text-brand'
          : 'border-line-strong bg-surface text-fg-secondary hover:bg-surface-hover-alt'
      )}
    >
      {label}
      {count > 0 && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-fg-on-brand">
          {count}
        </span>
      )}
      <ChevronDown
        size={13}
        className={clsx('transition-transform', openKey === key ? 'rotate-180' : '')}
      />
    </button>
  );

  return (
    <>
      <div className="sticky top-0 md:top-[64px] z-[100] bg-canvas/95 backdrop-blur-md border-b border-line">
        <div className="px-4 md:px-12 py-3 flex items-center gap-2 md:flex-wrap">
          <div className="relative flex-1 md:flex-none">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              placeholder="Search ingredients..."
              value={p.get('search') ?? ''}
              onChange={e => filters.setDebounced('search', e.target.value || null)}
              className="pl-8 pr-7 py-2 w-full md:w-94 rounded-full bg-line/50 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring border border-line-control"
            />
            {p.get('search') && (
              <button
                type="button"
                onClick={() => filters.set('search', null)}
                aria-label="Clear ingredient search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="hidden md:block w-px h-5 bg-line flex-shrink-0" />

          {pill('Type', 'type', typeCount)}
          {pill('Sub-type', 'subType', subTypeCount)}
          {pill('Alcohol', 'alcohol', alcoholActive ? 1 : 0)}

          <div className="relative ml-auto flex-shrink-0 hidden md:block" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowSortMenu(v => !v);
                setOpenKey(null);
              }}
              className={clsx(
                'flex items-center gap-1.5 text-sm transition-colors whitespace-nowrap',
                showSortMenu ? 'text-fg font-medium' : 'text-fg-muted hover:text-fg'
              )}
            >
              <span className="font-normal text-fg-muted">Sort</span>
              <span>·</span>
              <span className="font-medium">{currentSort.label}</span>
              <ChevronDown size={13} className={clsx('transition-transform', showSortMenu ? 'rotate-180' : '')} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-[110] bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[200px]">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setSort(opt.sortBy, opt.sortOrder)}
                    className={clsx(
                      'w-full text-left px-4 py-2 text-sm hover:bg-surface-hover-alt',
                      currentSort.label === opt.label ? 'text-brand font-medium' : 'text-fg-secondary'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
        <div className="hidden md:block">
          <FilterPanel openKey={openKey} filters={filters} typeOpts={typeOpts} subTypeOpts={subTypeOpts} />
        </div>
      </div>

      {!isMobileFiltersOpen && (
        <button
          type="button"
          onClick={() => {
            setMobileOpenSection(null);
            setIsMobileFiltersOpen(true);
          }}
          aria-label="Open ingredient filters"
          className="md:hidden fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-[120] inline-flex items-center gap-2 px-4 py-3 rounded-full bg-surface-inverse text-fg-on-inverse inset-ring-1 inset-ring-fg/40 shadow-[0_10px_24px_rgba(27,28,26,0.28)]"
        >
          <SlidersHorizontal size={15} />
          <span className="font-label text-[11px] uppercase tracking-widest">Filters</span>
          {totalActive > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-fg-on-brand">
              {totalActive}
            </span>
          )}
        </button>
      )}

      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-overlay/53 backdrop-blur-sm md:hidden" onClick={closeMobileSheet}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              'absolute bottom-0 inset-x-0 bg-surface rounded-t-3xl p-6 max-h-[82vh] overflow-y-auto',
              !isSheetDragging && 'transition-transform duration-200'
            )}
            style={{ transform: `translateY(${mobileSheetOffset}px)` }}
          >
            <div
              className="w-10 h-1.5 bg-line rounded-full mx-auto mb-5"
              onTouchStart={onMobileSheetTouchStart}
              onTouchMove={onMobileSheetTouchMove}
              onTouchEnd={onMobileSheetTouchEnd}
            />
            <div className="flex justify-between items-center mb-4">
              <span className="font-label text-base font-semibold">Filters</span>
              <button onClick={closeMobileSheet} className="text-sm text-fg-muted">Close</button>
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Search</span>
                <div className="relative mt-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                  <input
                    placeholder="Search ingredients..."
                    value={p.get('search') ?? ''}
                    onChange={e => filters.setDebounced('search', e.target.value || null)}
                    className="pl-8 pr-7 py-2 w-full rounded-full bg-line/50 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring border border-line-control"
                  />
                  {p.get('search') && (
                    <button
                      type="button"
                      onClick={() => filters.set('search', null)}
                      aria-label="Clear ingredient search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <button
                  onClick={() => setMobileOpenSection(prev => (prev === 'type' ? null : 'type'))}
                  className="w-full flex items-center justify-between"
                >
                  <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Type</span>
                  <ChevronDown size={14} className={clsx('transition-transform', mobileOpenSection === 'type' && 'rotate-180')} />
                </button>
                {mobileOpenSection === 'type' && (
                  <div className="flex flex-wrap gap-2 mt-2 max-h-36 overflow-y-auto pr-1">
                    {typeOpts.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => filters.toggleCsvValue('types', type.name)}
                        className={clsx(
                          'rounded-full px-3 py-1.5 text-xs font-label border',
                          (p.get('types') || '').split(',').includes(type.name)
                            ? 'border-brand bg-surface-subtle text-brand'
                            : 'border-line-strong text-fg-secondary bg-surface'
                        )}
                      >
                        {type.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setMobileOpenSection(prev => (prev === 'subType' ? null : 'subType'))}
                  className="w-full flex items-center justify-between"
                >
                  <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Sub-type</span>
                  <ChevronDown size={14} className={clsx('transition-transform', mobileOpenSection === 'subType' && 'rotate-180')} />
                </button>
                {mobileOpenSection === 'subType' && (
                  <div className="flex flex-wrap gap-2 mt-2 max-h-36 overflow-y-auto pr-1">
                    {subTypeOpts.map((subType) => (
                      <button
                        key={subType.id}
                        onClick={() => filters.toggleCsvValue('subTypes', subType.name)}
                        className={clsx(
                          'rounded-full px-3 py-1.5 text-xs font-label border',
                          (p.get('subTypes') || '').split(',').includes(subType.name)
                            ? 'border-brand bg-surface-subtle text-brand'
                            : 'border-line-strong text-fg-secondary bg-surface'
                        )}
                      >
                        {subType.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setMobileOpenSection(prev => (prev === 'alcohol' ? null : 'alcohol'))}
                  className="w-full flex items-center justify-between"
                >
                  <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Alcohol</span>
                  <ChevronDown size={14} className={clsx('transition-transform', mobileOpenSection === 'alcohol' && 'rotate-180')} />
                </button>
                {mobileOpenSection === 'alcohol' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { label: 'All', value: 'any' },
                      { label: 'Without Alcohol', value: 'false' },
                      { label: 'With Alcohol', value: 'true' },
                    ].map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => filters.set('alcoholic', value === 'any' ? null : value)}
                        className={clsx(
                          'rounded-full px-3 py-1.5 text-xs font-label border',
                          alcoholValue === value
                            ? 'border-brand bg-surface-subtle text-brand'
                            : 'border-line-strong text-fg-secondary bg-surface'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setMobileOpenSection(prev => (prev === 'sort' ? null : 'sort'))}
                  className="w-full flex items-center justify-between"
                >
                  <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Sort</span>
                  <ChevronDown size={14} className={clsx('transition-transform', mobileOpenSection === 'sort' && 'rotate-180')} />
                </button>
                {mobileOpenSection === 'sort' && (
                  <div className="mt-2 space-y-1">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setSort(opt.sortBy, opt.sortOrder)}
                        className={clsx(
                          'w-full text-left px-3 py-2 rounded-lg text-sm',
                          currentSort.label === opt.label ? 'bg-surface-subtle text-brand font-medium' : 'text-fg-secondary hover:bg-surface-hover-alt'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  filters.resetAll();
                  setOpenKey(null);
                  closeMobileSheet();
                }}
              >
                Reset
              </Button>
              <Button className="flex-1 bg-brand-soft hover:bg-brand" onClick={closeMobileSheet}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
