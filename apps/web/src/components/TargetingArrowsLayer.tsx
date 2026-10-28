import React, { useState, useEffect, useRef } from 'react';
import type { RoomState, CardInstance } from '@mtgc/shared';
import { Crosshair, Swords, X } from 'lucide-react';

export interface TargetingArrowsLayerProps {
  roomState?: RoomState;
  allBattlefieldCards?: CardInstance[];
  activeTargetingSourceId?: string | null;
  activeTargetingSourceIds?: string[] | null;
  targetingMousePos: { x: number; y: number } | null;
  onClearArrow: (arrowId?: string) => void;
}

export const TargetingArrowsLayer: React.FC<TargetingArrowsLayerProps> = ({
  roomState,
  allBattlefieldCards,
  activeTargetingSourceId,
  activeTargetingSourceIds,
  targetingMousePos,
  onClearArrow,
}) => {
  const [elementPositions, setElementPositions] = useState<Record<string, { x: number; y: number }>>({});
  const animFrameRef = useRef<number | null>(null);

  // Continuously or reactively compute screen coordinates of cards and player headers
  useEffect(() => {
    const updatePositions = () => {
      const nextPos: Record<string, { x: number; y: number }> = {};

      // 1. Battlefield cards
      const cardElements = document.querySelectorAll<HTMLElement>('[data-battlefield-card="true"]');
      cardElements.forEach(el => {
        const instanceId = el.getAttribute('data-card-instance-id');
        if (instanceId) {
          const rect = el.getBoundingClientRect();
          nextPos[`card:${instanceId}`] = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }
      });

      // 2. Player headers / cells
      const playerElements = document.querySelectorAll<HTMLElement>('[data-player-header]');
      playerElements.forEach(el => {
        const playerId = el.getAttribute('data-player-header');
        if (playerId) {
          const rect = el.getBoundingClientRect();
          nextPos[`player:${playerId}`] = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }
      });

      setElementPositions(nextPos);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 300);
    window.addEventListener('resize', updatePositions);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePositions);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [allBattlefieldCards, roomState?.targetingArrows]);

  const arrows = roomState?.targetingArrows || [];

  // Helper to calculate quadratic bezier control point
  const getCurveControlPoint = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Offset perpendicular to the chord
    const normalX = -dy / (dist || 1);
    const normalY = dx / (dist || 1);
    // Slight curvature
    const curveAmount = Math.min(60, Math.max(25, dist * 0.15));
    const midX = (x1 + x2) / 2 + normalX * curveAmount;
    const midY = (y1 + y2) / 2 + normalY * curveAmount;
    return { midX, midY };
  };

  // Normalize source IDs from either activeTargetingSourceIds array or activeTargetingSourceId string
  const sourceIds = (activeTargetingSourceIds && activeTargetingSourceIds.length > 0)
    ? activeTargetingSourceIds
    : activeTargetingSourceId
    ? [activeTargetingSourceId]
    : [];

  return (
    <svg
      id="targeting-arrows-overlay"
      data-testid="targeting-arrows-layer"
      className="fixed inset-0 w-screen h-[100dvh] pointer-events-none z-30 overflow-visible select-none"
    >
      <defs>
        {/* Arrowhead marker: Green/Sage */}
        <marker
          id="arrowhead-target"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#8BBB92" />
        </marker>

        {/* Arrowhead marker: Attack Red/Crimson */}
        <marker
          id="arrowhead-attack"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#F43F5E" />
        </marker>

        {/* Arrowhead marker: Dynamic Aiming */}
        <marker
          id="arrowhead-aim"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#34D399" />
        </marker>

        {/* Drop shadow filters for glowing spell lines */}
        <filter id="glow-target" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2A835F" floodOpacity="0.8" />
        </filter>
        <filter id="glow-attack" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#F43F5E" floodOpacity="0.8" />
        </filter>
        <filter id="glow-aim" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10B981" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* 1. Render all persisted arrows from RoomState */}
      {arrows.map(arrow => {
        const p1 = elementPositions[`card:${arrow.sourceCardInstanceId}`];
        const p2 =
          arrow.targetType === 'player'
            ? elementPositions[`player:${arrow.targetId}`]
            : elementPositions[`card:${arrow.targetId}`];

        if (!p1 || !p2) return null;

        const { midX, midY } = getCurveControlPoint(p1.x, p1.y, p2.x, p2.y);
        const isAttack = arrow.arrowType === 'attack';
        const strokeColor = isAttack ? '#F43F5E' : '#8BBB92';
        const filterId = isAttack ? 'url(#glow-attack)' : 'url(#glow-target)';
        const markerId = isAttack ? 'url(#arrowhead-attack)' : 'url(#arrowhead-target)';

        return (
          <g key={arrow.id} data-targeting-arrow={arrow.id} className="transition-opacity duration-300">
            {/* Outer halo path */}
            <path
              d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="6"
              strokeOpacity="0.25"
            />

            {/* Main curved path with arrowhead */}
            <path
              d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3"
              strokeDasharray={isAttack ? '8 4' : undefined}
              filter={filterId}
              markerEnd={markerId}
            />

            {/* Action pill / dismiss badge at midpoint */}
            <foreignObject
              x={midX - 22}
              y={midY - 14}
              width="44"
              height="28"
              className="overflow-visible pointer-events-auto"
            >
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-[#092328]/95 border border-[#12544F] text-zinc-100 shadow-xl backdrop-blur-md group hover:border-rose-500 transition-all cursor-pointer">
                {isAttack ? (
                  <Swords className="w-3 h-3 text-rose-400" />
                ) : (
                  <Crosshair className="w-3 h-3 text-[#8BBB92]" />
                )}
                <button
                  type="button"
                  data-testid={`dismiss-arrow-${arrow.id}`}
                  onClick={e => {
                    e.stopPropagation();
                    onClearArrow(arrow.id);
                  }}
                  className="w-3.5 h-3.5 rounded-full hover:bg-rose-900 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Eliminar flecha de objetivo"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </foreignObject>
          </g>
        );
      })}

      {/* 2. Live Dynamic Aiming Arrows (for ALL active targeting sources) */}
      {sourceIds.length > 0 && targetingMousePos && (
        <g data-testid="live-aiming-arrow">
          {sourceIds.map(srcId => {
            const sourcePos = elementPositions[`card:${srcId}`];
            if (!sourcePos) return null;

            const { midX, midY } = getCurveControlPoint(
              sourcePos.x,
              sourcePos.y,
              targetingMousePos.x,
              targetingMousePos.y,
            );

            return (
              <g key={`live-aim-${srcId}`}>
                {/* Thick background aura */}
                <path
                  d={`M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${targetingMousePos.x} ${targetingMousePos.y}`}
                  fill="none"
                  stroke="#2A835F"
                  strokeWidth="8"
                  strokeOpacity="0.3"
                />

                {/* Pulsing aiming beam */}
                <path
                  d={`M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${targetingMousePos.x} ${targetingMousePos.y}`}
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  filter="url(#glow-aim)"
                  markerEnd="url(#arrowhead-aim)"
                  className="animate-pulse"
                />
              </g>
            );
          })}

          {/* Reticle icon following mouse pointer */}
          <circle
            cx={targetingMousePos.x}
            cy={targetingMousePos.y}
            r="14"
            fill="none"
            stroke="#34D399"
            strokeWidth="2"
            strokeDasharray="4 2"
            className="animate-spin"
            style={{ transformOrigin: `${targetingMousePos.x}px ${targetingMousePos.y}px` }}
          />
        </g>
      )}
    </svg>
  );
};
