import type { Zone } from '@/types';
import { ZoneCard } from './ZoneCard';

interface ZoneGridProps {
  zones: Zone[];
  expandedId: number | null;
  onToggle: (id: number) => void;
}

export function ZoneGrid({ zones, expandedId, onToggle }: ZoneGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {zones.map((zone) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          isExpanded={expandedId === zone.id}
          onToggle={() => onToggle(zone.id)}
        />
      ))}
    </div>
  );
}
