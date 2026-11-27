'use client';
import Link from 'next/link';
import { Wine, Droplets, Sparkles, GlassWater } from 'lucide-react';
import { Ingredient } from "@/types/models/ingredient"

export default function IngredientCard({ ingredient: i, types, subTypes }: {
    ingredient: Ingredient,
    types: { id: string; name: string; }[]
    subTypes: { id: string; name: string; }[]
}) {
  const typeName = types.find(t => t.id === i.typeId)?.name || 'Unknown';
  const subTypeName = i.subTypeId
    ? subTypes.find(st => st.id === i.subTypeId)?.name || null
    : null;
  const usageCount = i._count?.cocktailIngredients;

  return (
    <Link
      href={`/ingredients/${i.id}`}
      className="group bg-surface rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md block"
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[1]">
        <div
          role="img"
          aria-label={i.name}
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${i.imageUrl ?? '/placeholder.svg'})` }}
        />
        {usageCount != null && usageCount > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-wider text-fg-on-image bg-overlay/73 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <GlassWater size={10} />
            {usageCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="font-headline text-lg text-fg leading-tight line-clamp-1">
          {i.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-fg-secondary">
          <Wine size={13} className="text-brand-soft" />
          <span className="font-medium">{typeName}</span>
          {subTypeName && (
            <>
              <span className="text-line-strong">/</span>
              <span>{subTypeName}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {i.isAlcoholic === false && (
            <span className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-wider text-brand bg-brand-soft/10 px-2 py-0.5 rounded-full">
              <Sparkles size={10} /> Non-alcoholic
            </span>
          )}
          {i.abv != null && i.isAlcoholic === true && (
            <span className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-wider text-brand bg-brand-soft/10 px-2 py-0.5 rounded-full">
              <Droplets size={10} /> {i.abv}% ABV
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
