import React from 'react';
import { CardInstance, getKeywordDefinition, getCounterDefinition } from '@mtgc/shared';
import {
  Skull,
  ShieldOff,
  Swords,
  Ghost,
  Zap,
  Feather,
  Flame,
  ShieldCheck,
  Sparkles,
  Heart,
  Eye,
  Crosshair,
  Footprints,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Crown,
  BatteryCharging,
  BookOpen,
  Shield,
  RotateCcw,
  Hourglass,
  ShieldX,
  CircleDot,
  Tag,
} from 'lucide-react';

interface CardBadgesProps {
  card: CardInstance;
}

export const KEYWORD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  deathtouch: Skull,
  defender: ShieldOff,
  double_strike: Swords,
  fear: Ghost,
  first_strike: Zap,
  flying: Feather,
  haste: Flame,
  hexproof: ShieldCheck,
  indestructible: Sparkles,
  lifelink: Heart,
  menace: Eye,
  reach: Crosshair,
  trample: Footprints,
  vigilance: ShieldAlert,
};

export const COUNTER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '+1/+1': TrendingUp,
  '−1/−1': TrendingDown,
  '-1/-1': TrendingDown,
  loyalty: Crown,
  charge: BatteryCharging,
  lore: BookOpen,
  shield: Shield,
  stun: RotateCcw,
  time: Hourglass,
  finality: ShieldX,
  generic: CircleDot,
  custom: Tag,
};

export const CardBadges: React.FC<CardBadgesProps> = ({ card }) => {
  const activeKeywords = card.keywords || [];
  const activeCounters = Object.entries(card.counters || {}).filter(([_, count]) => count > 0);

  if (activeKeywords.length === 0 && activeCounters.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="card-badge-row"
      className="absolute top-1 left-1 right-1 flex flex-row flex-wrap items-center gap-0.5 z-20 pointer-events-auto"
      onClick={e => e.stopPropagation()}
    >
      {/* Insignias de Palabras Clave */}
      {activeKeywords.map(kwId => {
        const def = getKeywordDefinition(kwId);
        const IconComponent = KEYWORD_ICONS[kwId.toLowerCase()] || Sparkles;
        const label = def?.label || kwId;
        const reminder = def?.reminderText || '';

        return (
          <span
            key={`kw-${kwId}`}
            data-badge-item="true"
            data-testid={`card-badge-keyword-${kwId}`}
            title={`${label}\n${reminder}`}
            className="inline-flex items-center justify-center p-0.5 rounded bg-slate-900/95 border border-amber-400/60 text-amber-300 shadow shadow-black/60 cursor-help transition-transform hover:scale-110"
          >
            <IconComponent className="w-2.5 h-2.5" />
          </span>
        );
      })}

      {/* Insignias de Contadores */}
      {activeCounters.map(([type, count]) => {
        const def = getCounterDefinition(type);
        const IconComponent = COUNTER_ICONS[type] || Tag;
        const label = def?.label || type;
        const reminder = def?.reminderText || '';

        const isPlus = type === '+1/+1';
        const isMinus = type === '−1/−1' || type === '-1/-1';
        const isFinality = type === 'finality';

        let badgeStyle = 'bg-slate-900/95 border-slate-600 text-slate-200';
        if (isPlus) badgeStyle = 'bg-emerald-950/95 border-emerald-500/70 text-emerald-300';
        if (isMinus) badgeStyle = 'bg-rose-950/95 border-rose-500/70 text-rose-300';
        if (type === 'loyalty') badgeStyle = 'bg-amber-950/95 border-amber-500/70 text-amber-300';

        return (
          <span
            key={`cnt-${type}`}
            data-badge-item="true"
            data-testid={`card-badge-counter-${type}`}
            title={`${label} (${count})\n${reminder}`}
            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold border shadow shadow-black/60 cursor-help transition-transform hover:scale-110 ${badgeStyle}`}
          >
            <IconComponent className="w-2.5 h-2.5 flex-shrink-0" />
            {!isFinality && (
              <span className="leading-none">
                {isPlus ? `+${count}` : isMinus ? `-${count}` : count > 1 ? count : ''}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};
