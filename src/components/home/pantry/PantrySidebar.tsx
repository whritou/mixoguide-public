'use client';

import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type { ScopeFilter } from './pantry.constants';

interface Props {
    categories:       [string, number][];
    pantryCount:      number;
    shoppingCount:    number;
    selectedStatus:   ScopeFilter;
    onStatusSelect:   (status: ScopeFilter) => void;
    selectedCategory: string | null;
    onCategorySelect: (category: string | null) => void;
    mobileOpen:       boolean;
    onMobileClose:    () => void;
}

export function PantrySidebar({
    categories, pantryCount, shoppingCount, selectedStatus, onStatusSelect,
    selectedCategory, onCategorySelect, mobileOpen, onMobileClose,
}: Props) {
    const statusList = (
        <ul aria-label="Pantry status" className="space-y-0.5 mb-4 pb-4 border-b border-line">
            <NavItem
                label="All"
                active={selectedStatus === 'all'}
                onClick={() => { onStatusSelect('all'); onMobileClose(); }}
            />
            <NavItem
                label="Pantry"
                count={pantryCount}
                active={selectedStatus === 'in-pantry'}
                onClick={() => { onStatusSelect('in-pantry'); onMobileClose(); }}
            />
            <NavItem
                label="Shopping list"
                count={shoppingCount}
                active={selectedStatus === 'shopping'}
                onClick={() => { onStatusSelect('shopping'); onMobileClose(); }}
            />
        </ul>
    );

    const navList = (
        <ul aria-label="Categories" className="space-y-0.5">
            <NavItem
                label="All ingredients"
                count={pantryCount}
                active={!selectedCategory}
                onClick={() => { onCategorySelect(null); onMobileClose(); }}
            />
            {categories.map(([name, count]) => (
                <NavItem
                    key={name}
                    label={name}
                    count={count}
                    active={selectedCategory === name}
                    onClick={() => { onCategorySelect(name); onMobileClose(); }}
                />
            ))}
        </ul>
    );

    return (
        <>
            {/* ── Desktop sidebar ─────────────────────────────────── */}
            <aside aria-label="Pantry filters" className="hidden md:block w-72 flex-shrink-0 border-r border-line/60 self-start sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
                <div className="flex flex-col gap-1 py-6 px-4">
                    {statusList}
                    {navList}
                </div>
            </aside>

            {/* ── Mobile drawer ────────────────────────────────────── */}
            <Sheet open={mobileOpen} onOpenChange={(o) => { if (!o) onMobileClose(); }}>
                <SheetContent
                    side="left"
                    showCloseButton={false}
                    overlayClassName="z-[150] md:hidden bg-overlay/40 backdrop-blur-sm"
                    className="z-[150] md:hidden block gap-0 border-0 w-72 sm:max-w-72 bg-canvas h-full overflow-y-auto shadow-xl"
                >
                        <div className="flex items-center justify-between px-4 pt-5 pb-2">
                            <SheetTitle className="font-label text-xs font-normal uppercase tracking-widest text-fg-muted">My Pantry</SheetTitle>
                            <button type="button" onClick={onMobileClose} aria-label="Close sidebar" className="text-fg-muted hover:text-fg-secondary p-1 rounded-full">
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                        <SheetDescription className="sr-only">Filter your pantry by status and category.</SheetDescription>
                        <div className="flex flex-col gap-1 py-6 px-4">
                            {statusList}
                            {navList}
                        </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

function NavItem({ label, count, active, onClick }: {
    label: string; count?: number; active: boolean; onClick: () => void;
}) {
    const empty = count !== undefined && count === 0;
    return (
        <li>
            <button
                type="button"
                aria-pressed={active}
                onClick={onClick}
                className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-all ${
                    active
                        ? 'bg-surface-subtle text-brand font-medium'
                        : empty
                            ? 'text-fg-muted hover:bg-canvas-hover-alt'
                            : 'text-fg-secondary hover:bg-canvas-hover-alt'
                }`}
            >
                <span>{label}</span>
                {count !== undefined && (
                    <span className={`text-xs ${active ? 'text-brand-soft-strong' : 'text-fg-muted'}`}>
                        {count}
                        <span className="sr-only"> {count === 1 ? 'item' : 'items'}</span>
                    </span>
                )}
            </button>
        </li>
    );
}
