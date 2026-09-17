import { SearchIcon }   from '@/components/icons/Search';
import { AlcoholIcon }  from '@/components/icons/Alcohol';
import { CategoryIcon } from '@/components/icons/Category';
import { SubTypeIcon }  from '@/components/icons/SubType';

export const FILTERS_META = [
  {
    label: 'Search',
    key: 'search',
    icon:      (props: React.SVGProps<SVGSVGElement>) => <SearchIcon          {...props} />,
    iconHover: (props: React.SVGProps<SVGSVGElement>) => <SearchIcon   filled {...props} />,
  },
  {
    label: 'Type',
    key: 'type',
    icon:      (props: React.SVGProps<SVGSVGElement>) => <CategoryIcon         {...props} />,
    iconHover: (props: React.SVGProps<SVGSVGElement>) => <CategoryIcon  filled {...props} />,
  },
  {
    label: 'Sub-type',
    key: 'subType',
    icon:      (props: React.SVGProps<SVGSVGElement>) => <SubTypeIcon          {...props} />,
    iconHover: (props: React.SVGProps<SVGSVGElement>) => <SubTypeIcon   filled {...props} />,
  },
  {
    label: 'Alcohol',
    key: 'alcohol',
    icon:      (props: React.SVGProps<SVGSVGElement>) => <AlcoholIcon          {...props} />,
    iconHover: (props: React.SVGProps<SVGSVGElement>) => <AlcoholIcon   filled {...props} />,
  },
] as const;

export type FilterMeta = typeof FILTERS_META[number];
export type FilterKey  = FilterMeta['key'];
