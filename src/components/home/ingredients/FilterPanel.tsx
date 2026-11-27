'use client';
import { FilterKey } from './FilterConstants';
import clsx from 'clsx';

interface PanelProps {
  openKey: FilterKey | null;
  filters: ReturnType<typeof import('@/hooks/useFilters').useFilters>;
  typeOpts?: { id: string; name: string }[];
  subTypeOpts?: { id: string; name: string; typeId: string }[];
}

export function FilterPanel({ openKey, filters, typeOpts = [], subTypeOpts = [] }: PanelProps) {
  if (!openKey) return null;

  const formatLabel = (text: string) =>
    text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const chip = (text: string, active: boolean, onClick: () => void) => (
    <button
      key={text}
      className={clsx(
        'rounded-full px-3 py-1.5 text-xs font-label cursor-pointer transition-colors border',
        active
          ? 'border-brand bg-surface-subtle text-brand'
          : 'bg-surface text-fg-secondary border-line-strong hover:bg-surface-hover-alt'
      )}
      onClick={onClick}
    >
      {formatLabel(text)}
    </button>
  );

  return (
    <div className="animate-fade-in px-4 md:px-12 py-4 bg-canvas-hover-alt border-b border-line">
      {openKey === 'type' && (
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
          {typeOpts.map(t =>
            chip(
              t.name,
              (filters.params.get('types') || '').split(',').includes(t.name),
              () => filters.toggleCsvValue('types', t.name)
            )
          )}
        </div>
      )}

      {openKey === 'subType' && (
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
          {subTypeOpts.map(st =>
            chip(
              st.name,
              (filters.params.get('subTypes') || '').split(',').includes(st.name),
              () => filters.toggleCsvValue('subTypes', st.name)
            )
          )}
        </div>
      )}

      {openKey === 'alcohol' && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All', value: 'any' },
            { label: 'Without Alcohol', value: 'false' },
            { label: 'With Alcohol', value: 'true' },
          ].map(({ label, value }) => {
            const current = filters.params.get('alcoholic') ?? 'any';
            const isActive = current === value || (value === 'any' && current === null);

            return chip(label, isActive, () => filters.set('alcoholic', value === 'any' ? null : value));
          })}
        </div>
      )}
    </div>
  );
}
