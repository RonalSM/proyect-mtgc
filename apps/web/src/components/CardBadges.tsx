import React from 'react';
import { CardInstance, getKeywordDefinition, getCounterDefinition } from '@mtgc/shared';
import { KEYWORD_ICONS, COUNTER_ICONS, MtgKeywordIcon, MtgCounterIcon } from '../utils/mana-icons';

export { KEYWORD_ICONS, COUNTER_ICONS };

interface CardBadgesProps {
  card: CardInstance;
}

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
        const label = def?.label || kwId;
        const reminder = def?.reminderText || '';

        return (
          <span
            key={`kw-${kwId}`}
            data-badge-item="true"
            data-testid={`card-badge-keyword-${kwId}`}
            title={`${label}\n${reminder}`}
            className="inline-flex items-center justify-center p-0.5 rounded bg-[#092328]/95 border border-[#12544F] text-[#8BBB92] shadow shadow-black/60 cursor-help transition-transform hover:scale-110"
          >
            <MtgKeywordIcon keyword={kwId} className="w-2.5 h-2.5 text-[10px]" />
          </span>
        );
      })}

      {/* Insignias de Contadores */}
      {activeCounters.map(([type, count]) => {
        const def = getCounterDefinition(type);
        const label = def?.label || type;
        const reminder = def?.reminderText || '';

        const isPlus = type === '+1/+1';
        const isMinus = type === '−1/−1' || type === '-1/-1';
        const isFinality = type === 'finality';

        let badgeStyle = 'bg-[#092328]/95 border-[#12544F] text-zinc-200';
        if (isPlus) badgeStyle = 'bg-[#12544F]/95 border-[#2A835F] text-[#8BBB92]';
        if (isMinus) badgeStyle = 'bg-rose-950/95 border-rose-500/70 text-rose-300';
        if (type === 'loyalty') badgeStyle = 'bg-[#12544F]/95 border-[#2A835F] text-[#8BBB92]';

        return (
          <span
            key={`cnt-${type}`}
            data-badge-item="true"
            data-testid={`card-badge-counter-${type}`}
            title={`${label} (${count})\n${reminder}`}
            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold border shadow shadow-black/60 cursor-help transition-transform hover:scale-110 ${badgeStyle}`}
          >
            <MtgCounterIcon counterType={type} className="w-2.5 h-2.5 flex-shrink-0 text-[10px]" />
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
