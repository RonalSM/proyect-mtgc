import React, { useState, useRef } from 'react';
import type {
  CardInstance,
  PlayerZones,
  GameActionType,
  ZoneType,
  CardDefinition,
} from '@mtgc/shared';
import {
  Layers,
  Sparkles,
  Shuffle,
  RotateCcw,
  Maximize2,
  X,
  Trash2,
  Move,
  ShieldAlert,
  BookOpen,
  Plus,
  Minus,
} from 'lucide-react';

interface BattlefieldProps {
  localPlayerId: string;
  zones: PlayerZones;
  onAction: (type: GameActionType, payload: unknown) => void;
}

interface DragCardData {
  cardInstanceId: string;
  fromZone: ZoneType;
  cardDefinition: CardDefinition;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
}

const CARD_WIDTH = 124;
const CARD_HEIGHT = 174;

export const Battlefield: React.FC<BattlefieldProps> = ({ localPlayerId, zones, onAction }) => {
  const [zoomedCard, setZoomedCard] = useState<CardInstance | null>(null);
  const [viewingZone, setViewingZone] = useState<'graveyard' | 'exile' | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragCardData | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<
    'battlefield' | 'graveyard' | 'exile' | 'hand' | 'command' | 'library' | null
  >(null);
  const [highestZIndex, setHighestZIndex] = useState(25);

  const battlefieldRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isHtml5DraggingRef = useRef(false);

  // ----------------------------------------------------
  // Tap & Game Actions
  // ----------------------------------------------------
  const handleTap = (card: CardInstance) => {
    onAction('TAP_CARD', {
      cardInstanceId: card.instanceId,
      isTapped: !card.isTapped,
    });
  };

  const handleUntapAll = () => {
    onAction('UNTAP_ALL', {});
  };

  const handleDraw = () => {
    onAction('DRAW_CARDS', {
      playerId: localPlayerId,
      count: 1,
    });
  };

  const handleShuffle = () => {
    onAction('SHUFFLE_LIBRARY', {});
  };

  const handleMulligan = () => {
    if (
      confirm(
        '¿Deseas realizar un Mulligan? Tu mano actual volverá a la biblioteca y robarás 7 cartas.',
      )
    ) {
      onAction('MULLIGAN', {});
    }
  };

  const adjustCounter = (card: CardInstance, counterType: string, delta: number) => {
    onAction('SET_CARD_COUNTER', {
      cardInstanceId: card.instanceId,
      counterType,
      delta,
    });
  };

  // ----------------------------------------------------
  // Dispatch Move Card Helper
  // ----------------------------------------------------
  const executeMoveCard = (
    cardInstanceId: string,
    fromZone: ZoneType,
    toZone: ZoneType,
    position?: { x: number; y: number; zIndex?: number },
  ) => {
    if (fromZone === toZone && toZone !== 'battlefield') {
      return;
    }

    if (toZone === 'battlefield') {
      const nextZ = (position?.zIndex ?? highestZIndex) + 1;
      setHighestZIndex(nextZ);
      onAction('MOVE_CARD', {
        cardInstanceId,
        fromZone,
        toZone: 'battlefield',
        position: {
          x: position?.x ?? 50,
          y: position?.y ?? 50,
          zIndex: nextZ,
        },
      });
    } else if (toZone === 'library') {
      onAction('MOVE_CARD', {
        cardInstanceId,
        fromZone,
        toZone: 'library',
        destinationIndex: 0,
      });
    } else {
      onAction('MOVE_CARD', {
        cardInstanceId,
        fromZone,
        toZone,
      });
    }
  };

  // ----------------------------------------------------
  // Robust Unified Pointer Events Drag & Drop
  // Works with Mouse, Touch, and Mobile Screens
  // ----------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent, card: CardInstance, fromZone: ZoneType) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffsetX = startX - rect.left;
    const grabOffsetY = startY - rect.top;

    let hasMoved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!hasMoved && Math.hypot(dx, dy) > 4) {
        hasMoved = true;
        isDraggingRef.current = true;
      }

      if (hasMoved) {
        setActiveDrag({
          cardInstanceId: card.instanceId,
          fromZone,
          cardDefinition: card.definition,
          offsetX: grabOffsetX,
          offsetY: grabOffsetY,
          currentX: moveEvent.clientX,
          currentY: moveEvent.clientY,
        });

        const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const zone = elem?.closest('[data-drop-zone]')?.getAttribute('data-drop-zone');
        if (
          zone === 'battlefield' ||
          zone === 'graveyard' ||
          zone === 'exile' ||
          zone === 'hand' ||
          zone === 'command' ||
          zone === 'library'
        ) {
          setHoveredDropZone(zone as any);
        } else {
          setHoveredDropZone(null);
        }
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (isHtml5DraggingRef.current) {
        return;
      }

      if (hasMoved) {
        const elem = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const dropZoneElem = elem?.closest('[data-drop-zone]');
        const dropZone = dropZoneElem?.getAttribute('data-drop-zone') as ZoneType | null;

        if (dropZone === 'battlefield' && battlefieldRef.current) {
          const bfRect = battlefieldRef.current.getBoundingClientRect();
          const scrollLeft = battlefieldRef.current.scrollLeft;
          const scrollTop = battlefieldRef.current.scrollTop;
          const rawX = upEvent.clientX - bfRect.left + scrollLeft - grabOffsetX;
          const rawY = upEvent.clientY - bfRect.top + scrollTop - grabOffsetY;
          const maxX = Math.max(bfRect.width, battlefieldRef.current.scrollWidth) - CARD_WIDTH - 12;
          const maxY =
            Math.max(bfRect.height, battlefieldRef.current.scrollHeight, 460) - CARD_HEIGHT - 12;
          const clampedX = Math.max(12, Math.min(maxX, rawX));
          const clampedY = Math.max(12, Math.min(maxY, rawY));

          executeMoveCard(card.instanceId, fromZone, 'battlefield', {
            x: Math.round(clampedX),
            y: Math.round(clampedY),
          });
        } else if (dropZone) {
          executeMoveCard(card.instanceId, fromZone, dropZone);
        }

        setActiveDrag(null);
        setHoveredDropZone(null);
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // ----------------------------------------------------
  // HTML5 Drag & Drop Handlers (Native browser & Playwright)
  // ----------------------------------------------------
  const handleDragStart = (e: React.DragEvent, card: CardInstance, fromZone: ZoneType) => {
    isHtml5DraggingRef.current = true;
    isDraggingRef.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const dragData: DragCardData = {
      cardInstanceId: card.instanceId,
      fromZone,
      cardDefinition: card.definition,
      offsetX: offsetX > 0 && offsetX < CARD_WIDTH ? offsetX : CARD_WIDTH / 2,
      offsetY: offsetY > 0 && offsetY < CARD_HEIGHT ? offsetY : CARD_HEIGHT / 2,
      currentX: e.clientX,
      currentY: e.clientY,
    };

    setActiveDrag(dragData);
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', card.instanceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    isHtml5DraggingRef.current = false;
    setActiveDrag(null);
    setHoveredDropZone(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const getDragData = (e: React.DragEvent): DragCardData | null => {
    if (activeDrag) return activeDrag;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    const plainId = e.dataTransfer.getData('text/plain');
    if (plainId) {
      return {
        cardInstanceId: plainId,
        fromZone: 'battlefield',
        cardDefinition: {
          scryfallId: plainId,
          name: 'Card',
          cmc: 0,
          typeLine: 'Card',
          colors: [],
          colorIdentity: [],
        },
        offsetX: CARD_WIDTH / 2,
        offsetY: CARD_HEIGHT / 2,
        currentX: e.clientX,
        currentY: e.clientY,
      };
    }
    return null;
  };

  const handleDropOnZone = (e: React.DragEvent, targetZone: ZoneType) => {
    e.preventDefault();
    setHoveredDropZone(null);
    const data = getDragData(e);
    if (!data) return;

    if (targetZone === 'battlefield' && battlefieldRef.current) {
      const rect = battlefieldRef.current.getBoundingClientRect();
      const scrollLeft = battlefieldRef.current.scrollLeft;
      const scrollTop = battlefieldRef.current.scrollTop;
      const grabX = data.offsetX > 0 && data.offsetX < CARD_WIDTH ? data.offsetX : CARD_WIDTH / 2;
      const grabY = data.offsetY > 0 && data.offsetY < CARD_HEIGHT ? data.offsetY : CARD_HEIGHT / 2;

      const rawX = e.clientX - rect.left + scrollLeft - grabX;
      const rawY = e.clientY - rect.top + scrollTop - grabY;
      const maxX = Math.max(rect.width, battlefieldRef.current.scrollWidth) - CARD_WIDTH - 12;
      const maxY =
        Math.max(rect.height, battlefieldRef.current.scrollHeight, 460) - CARD_HEIGHT - 12;
      const clampedX = Math.max(12, Math.min(maxX, rawX));
      const clampedY = Math.max(12, Math.min(maxY, rawY));

      executeMoveCard(data.cardInstanceId, data.fromZone, 'battlefield', {
        x: Math.round(clampedX),
        y: Math.round(clampedY),
      });
    } else {
      executeMoveCard(data.cardInstanceId, data.fromZone, targetZone);
    }

    setActiveDrag(null);
  };

  const isDragging = activeDrag !== null;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Floating Drag Avatar / Ghost Preview (Follows finger/cursor) */}
      {activeDrag && (
        <div
          className="fixed pointer-events-none z-50 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400 bg-slate-900/90 backdrop-blur-sm -rotate-2 scale-105 select-none transition-none"
          style={{
            left: `${activeDrag.currentX - activeDrag.offsetX}px`,
            top: `${activeDrag.currentY - activeDrag.offsetY}px`,
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
          }}
        >
          {activeDrag.cardDefinition.imageUrlNormal ? (
            <img
              src={activeDrag.cardDefinition.imageUrlNormal}
              alt={activeDrag.cardDefinition.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-3 h-full flex flex-col justify-between text-xs text-white bg-slate-950">
              <span className="font-bold leading-tight">{activeDrag.cardDefinition.name}</span>
              <span className="text-[10px] text-amber-300 font-semibold uppercase">
                {activeDrag.fromZone}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top Battlefield Toolbar & Reactive Zone Drop Targets */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 backdrop-blur shadow-md gap-3 flex-wrap">
        {/* Left: Table Action Buttons (Draw, Untap All, Shuffle, Mulligan) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDraw}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs shadow-md transition-all active:scale-95"
            title="Robar la carta superior de tu biblioteca a tu mano"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Robar Carta (+1)</span>
          </button>
          <button
            onClick={handleUntapAll}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs border border-slate-700 transition-colors"
            title="Enderezar todas tus cartas giradas en el campo de batalla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Enderezar Todo</span>
          </button>
          <button
            onClick={handleShuffle}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs border border-slate-700 transition-colors"
            title="Barajar aleatoriamente la biblioteca con CSPRNG"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Barajar ({zones.library.length})</span>
          </button>
          <button
            onClick={handleMulligan}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs border border-slate-700 transition-colors"
            title="Regresar tu mano a la biblioteca, barajar y robar 7 cartas"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mulligan</span>
          </button>
        </div>

        {/* Right: Reactive Drop Target Docks for Library, Graveyard, Exile & Battlefield Count */}
        <div className="flex items-center space-x-3">
          {/* Library (Biblioteca) Drop Zone */}
          <div
            data-drop-zone="library"
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (hoveredDropZone !== 'library') setHoveredDropZone('library');
            }}
            onDragLeave={() => {
              if (hoveredDropZone === 'library') setHoveredDropZone(null);
            }}
            onDrop={e => handleDropOnZone(e, 'library')}
            onClick={handleDraw}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
              hoveredDropZone === 'library'
                ? 'bg-blue-950/80 border-blue-400 text-blue-200 ring-2 ring-blue-500/50 scale-105 shadow-lg shadow-blue-950/50 animate-pulse'
                : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-300'
            }`}
            title="Biblioteca (Clic para robar. Arrastra cartas aquí para poner en el tope de la biblioteca)"
          >
            <BookOpen
              className={`w-4 h-4 ${hoveredDropZone === 'library' ? 'text-blue-300' : 'text-blue-400'}`}
            />
            <span>Biblioteca</span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[11px] font-bold text-white">
              {zones.library.length}
            </span>
          </div>

          {/* Graveyard Drop Zone */}
          <div
            data-drop-zone="graveyard"
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (hoveredDropZone !== 'graveyard') setHoveredDropZone('graveyard');
            }}
            onDragLeave={() => {
              if (hoveredDropZone === 'graveyard') setHoveredDropZone(null);
            }}
            onDrop={e => handleDropOnZone(e, 'graveyard')}
            onClick={() => setViewingZone('graveyard')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
              hoveredDropZone === 'graveyard'
                ? 'bg-rose-950/80 border-rose-400 text-rose-200 ring-2 ring-rose-500/50 scale-105 shadow-lg shadow-rose-950/50 animate-pulse'
                : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-300'
            }`}
            title="Zona de Cementerio (Arrastra cartas aquí para destruir o descartar. Clic para ver cartas)"
          >
            <Trash2
              className={`w-4 h-4 ${hoveredDropZone === 'graveyard' ? 'text-rose-300' : 'text-rose-400'}`}
            />
            <span>Cementerio</span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[11px] font-bold text-white">
              {zones.graveyard.length}
            </span>
          </div>

          {/* Exile Drop Zone */}
          <div
            data-drop-zone="exile"
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (hoveredDropZone !== 'exile') setHoveredDropZone('exile');
            }}
            onDragLeave={() => {
              if (hoveredDropZone === 'exile') setHoveredDropZone(null);
            }}
            onDrop={e => handleDropOnZone(e, 'exile')}
            onClick={() => setViewingZone('exile')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
              hoveredDropZone === 'exile'
                ? 'bg-purple-950/80 border-purple-400 text-purple-200 ring-2 ring-purple-500/50 scale-105 shadow-lg shadow-purple-950/50 animate-pulse'
                : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-300'
            }`}
            title="Zona de Exilio (Arrastra cartas aquí para exiliarlas. Clic para ver cartas)"
          >
            <Sparkles
              className={`w-4 h-4 ${hoveredDropZone === 'exile' ? 'text-purple-300' : 'text-purple-400'}`}
            />
            <span>Exilio</span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[11px] font-bold text-white">
              {zones.exile.length}
            </span>
          </div>

          {/* Permanents Active Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
            <span>Campo:</span>
            <strong className="text-amber-400 font-bold">{zones.battlefield.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Freeform Battlefield Canvas */}
      <div
        ref={battlefieldRef}
        data-drop-zone="battlefield"
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (hoveredDropZone !== 'battlefield') setHoveredDropZone('battlefield');
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (hoveredDropZone === 'battlefield') setHoveredDropZone(null);
          }
        }}
        onDrop={e => handleDropOnZone(e, 'battlefield')}
        className={`relative min-h-[440px] flex-1 bg-slate-950/90 border-2 rounded-2xl p-4 overflow-auto select-none transition-all duration-200 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] ${
          hoveredDropZone === 'battlefield'
            ? 'border-amber-400/80 shadow-2xl shadow-amber-500/10 bg-slate-950/95'
            : isDragging
              ? 'border-dashed border-amber-500/40'
              : 'border-slate-800/80'
        }`}
      >
        {/* Subtle Drop Hint Banner when dragging */}
        {isDragging && (
          <div className="pointer-events-none sticky top-2 left-0 right-0 z-40 flex justify-center mb-2">
            <div className="bg-slate-900/95 border border-amber-500/50 text-amber-300 px-4 py-1.5 rounded-full text-xs font-semibold shadow-xl flex items-center space-x-2 backdrop-blur animate-pulse">
              <Move className="w-3.5 h-3.5" />
              <span>Suelta la carta en cualquier posición del campo de batalla</span>
            </div>
          </div>
        )}

        {/* Empty Battlefield Placeholder */}
        {zones.battlefield.length === 0 ? (
          <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-slate-500 space-y-3 pointer-events-none">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-center">
              <Layers className="w-10 h-10 stroke-[1.5] text-slate-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-300">
                El campo de batalla está despejado
              </p>
              <p className="text-xs text-slate-500">
                Arrastra cartas desde tu mano o zona de comando para desplegarlas aquí
              </p>
            </div>
          </div>
        ) : (
          /* Cards placed with absolute coordinates on the battlefield */
          zones.battlefield.map((card, idx) => {
            const defaultX = 20 + (idx % 5) * (CARD_WIDTH + 24);
            const defaultY = 20 + Math.floor(idx / 5) * (CARD_HEIGHT + 36);
            const posX = card.position?.x ?? defaultX;
            const posY = card.position?.y ?? defaultY;
            const cardZ = card.position?.zIndex ?? idx + 1;
            const plusCounters = card.counters['+1/+1'] || 0;

            const isCardBeingDragged = activeDrag?.cardInstanceId === card.instanceId;

            return (
              <div
                key={card.instanceId}
                data-card-id={card.instanceId}
                data-card-name={card.definition.name}
                data-from-zone="battlefield"
                draggable={true}
                onDragStart={e => handleDragStart(e, card, 'battlefield')}
                onDragEnd={handleDragEnd}
                onPointerDown={e => handlePointerDown(e, card, 'battlefield')}
                style={{
                  position: 'absolute',
                  left: `${posX}px`,
                  top: `${posY}px`,
                  zIndex: cardZ,
                  width: `${CARD_WIDTH}px`,
                  height: `${CARD_HEIGHT}px`,
                }}
                className={`select-none cursor-grab active:cursor-grabbing rounded-xl overflow-hidden shadow-2xl bg-slate-900 border transition-transform duration-150 touch-none group ${
                  card.isTapped
                    ? 'border-amber-400/80 ring-2 ring-amber-400/20'
                    : 'border-slate-800 hover:border-amber-400/70 hover:shadow-amber-500/10'
                } ${isCardBeingDragged ? 'opacity-30 scale-95' : 'opacity-100'}`}
              >
                {/* Full Card Art & Interactive Tap Frame */}
                <div
                  onClick={() => {
                    if (!isDraggingRef.current) handleTap(card);
                  }}
                  onDoubleClick={() => setZoomedCard(card)}
                  className="relative w-full h-full bg-slate-950 overflow-hidden cursor-pointer"
                  title="Clic para Girar/Enderezar. Doble clic para ampliar. Arrastra para mover o reposicionar"
                >
                  {card.definition.imageUrlNormal ? (
                    <img
                      src={card.definition.imageUrlNormal}
                      alt={card.definition.name}
                      className={`w-full h-full object-cover pointer-events-none transition-transform duration-200 ${
                        card.isTapped ? 'rotate-90 scale-90' : ''
                      }`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="p-2.5 h-full flex flex-col justify-between text-xs pointer-events-none">
                      <span className="font-bold text-white leading-tight">
                        {card.definition.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{card.definition.typeLine}</span>
                    </div>
                  )}

                  {/* Tapped Overlay Indicator */}
                  {card.isTapped && (
                    <div className="absolute inset-0 bg-amber-950/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950/90 px-2 py-0.5 rounded text-amber-300 border border-amber-400/50 shadow">
                        GIRADA
                      </span>
                    </div>
                  )}

                  {/* Floating +1/+1 Counters Controls (Clean overlay on hover) */}
                  <div className="absolute top-1.5 left-1.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 backdrop-blur rounded-lg p-0.5 border border-slate-700/80 shadow">
                    {plusCounters > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          adjustCounter(card, '+1/+1', -1);
                        }}
                        title="Restar -1/-1"
                        className="p-1 hover:bg-slate-800 text-rose-400 rounded transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        adjustCounter(card, '+1/+1', 1);
                      }}
                      title="Añadir +1/+1"
                      className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setZoomedCard(card);
                      }}
                      title="Ver en grande"
                      className="p-1 hover:bg-slate-800 text-slate-300 rounded transition-colors"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Counters Badge Display */}
                  {plusCounters > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
                      +{plusCounters}/+{plusCounters}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Command Zone & Private Hand Tray */}
      <div
        data-drop-zone="hand"
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (hoveredDropZone !== 'hand') setHoveredDropZone('hand');
        }}
        onDragLeave={() => {
          if (hoveredDropZone === 'hand') setHoveredDropZone(null);
        }}
        onDrop={e => handleDropOnZone(e, 'hand')}
        className={`bg-slate-900 border rounded-2xl p-4 shadow-xl space-y-3 transition-all ${
          hoveredDropZone === 'hand'
            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-950/20'
            : 'border-slate-800'
        }`}
      >
        {/* Command Zone (Always visible as a drop zone so commander can be returned) */}
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-800 flex-wrap gap-2">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Zona de Comando:</span>
          </span>

          {zones.command.length > 0 ? (
            zones.command.map(cmd => (
              <div
                key={cmd.instanceId}
                data-card-id={cmd.instanceId}
                data-card-name={cmd.definition.name}
                data-from-zone="command"
                draggable={true}
                onDragStart={e => handleDragStart(e, cmd, 'command')}
                onDragEnd={handleDragEnd}
                onPointerDown={e => handlePointerDown(e, cmd, 'command')}
                onDoubleClick={() => setZoomedCard(cmd)}
                className={`flex items-center space-x-2 bg-slate-950 hover:bg-slate-800/80 border border-amber-500/40 hover:border-amber-400 px-3 py-1.5 rounded-xl cursor-grab active:cursor-grabbing shadow transition-all touch-none group ${
                  activeDrag?.cardInstanceId === cmd.instanceId ? 'opacity-40' : ''
                }`}
                title="Arrastra tu comandante hacia el campo de batalla para jugarlo"
              >
                <span className="text-xs font-semibold text-white group-hover:text-amber-300">
                  {cmd.definition.name}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                  <Move className="w-2.5 h-2.5" />
                  <span>Arrastrar</span>
                </span>
              </div>
            ))
          ) : (
            /* Empty Command Zone Drop Dock */
            <div
              data-drop-zone="command"
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (hoveredDropZone !== 'command') setHoveredDropZone('command');
              }}
              onDragLeave={() => {
                if (hoveredDropZone === 'command') setHoveredDropZone(null);
              }}
              onDrop={e => handleDropOnZone(e, 'command')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border-2 border-dashed text-xs transition-all ${
                hoveredDropZone === 'command'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-500/50 scale-105 shadow animate-pulse'
                  : 'bg-slate-950/50 border-slate-700/60 text-slate-400'
              }`}
              title="Zona de Comando (Arrastra a tu comandante aquí para devolverlo a la zona de comando)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Arrastra tu comandante aquí para retornarlo</span>
            </div>
          )}
        </div>

        {/* Private Hand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Tu Mano Privada
            </h4>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-semibold">
              {zones.hand.length} cartas
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Arrastra al campo de batalla para jugar, o al cementerio para descartar
          </span>
        </div>

        {/* Hand Cards Horizontal Slider - Pure Drag & Drop without buttons */}
        <div className="flex space-x-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {zones.hand.length === 0 ? (
            <div className="py-4 px-2 text-xs text-slate-500 italic">Tu mano está vacía</div>
          ) : (
            zones.hand.map(card => (
              <div
                key={card.instanceId}
                data-card-id={card.instanceId}
                data-card-name={card.definition.name}
                data-from-zone="hand"
                draggable={true}
                onDragStart={e => handleDragStart(e, card, 'hand')}
                onDragEnd={handleDragEnd}
                onPointerDown={e => handlePointerDown(e, card, 'hand')}
                onDoubleClick={() => setZoomedCard(card)}
                className={`flex-shrink-0 w-32 sm:w-36 aspect-[5/7] bg-slate-950 border border-slate-800 hover:border-amber-400/80 rounded-xl overflow-hidden shadow-lg group transition-transform hover:-translate-y-2 cursor-grab active:cursor-grabbing select-none touch-none relative ${
                  activeDrag?.cardInstanceId === card.instanceId ? 'opacity-30 scale-95' : ''
                }`}
                title="Arrastra al campo para jugar, al cementerio para descartar, o doble clic para ampliar"
              >
                {/* Artwork */}
                {card.definition.imageUrlNormal ? (
                  <img
                    src={card.definition.imageUrlNormal}
                    alt={card.definition.name}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                  />
                ) : (
                  <div className="p-2.5 h-full flex flex-col justify-between text-xs pointer-events-none">
                    <span className="font-bold text-white leading-tight">
                      {card.definition.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{card.definition.typeLine}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Graveyard / Exile Zone Viewer Modal (Pure Drag & Drop without Action Buttons) */}
      {viewingZone && (
        <div
          onClick={() => setViewingZone(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                {viewingZone === 'graveyard' ? (
                  <>
                    <Trash2 className="w-5 h-5 text-rose-400" />
                    <h3 className="font-bold text-sm text-white">
                      Cementerio ({zones.graveyard.length} cartas)
                    </h3>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">
                      Exilio ({zones.exile.length} cartas)
                    </h3>
                  </>
                )}
              </div>
              <button
                onClick={() => setViewingZone(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reactive Drop Targets Dock inside the Modal */}
            <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-3">
              <div
                data-drop-zone="battlefield"
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (hoveredDropZone !== 'battlefield') setHoveredDropZone('battlefield');
                }}
                onDragLeave={() => {
                  if (hoveredDropZone === 'battlefield') setHoveredDropZone(null);
                }}
                onDrop={e => {
                  handleDropOnZone(e, 'battlefield');
                  setViewingZone(null);
                }}
                className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                  hoveredDropZone === 'battlefield'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/50 scale-[1.02] animate-pulse'
                    : 'bg-slate-950/60 border-slate-700/80 text-emerald-400 hover:border-emerald-500/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Arrastra una carta aquí para revivir al Campo</span>
              </div>

              <div
                data-drop-zone="hand"
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (hoveredDropZone !== 'hand') setHoveredDropZone('hand');
                }}
                onDragLeave={() => {
                  if (hoveredDropZone === 'hand') setHoveredDropZone(null);
                }}
                onDrop={e => {
                  handleDropOnZone(e, 'hand');
                  setViewingZone(null);
                }}
                className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                  hoveredDropZone === 'hand'
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-500/50 scale-[1.02] animate-pulse'
                    : 'bg-slate-950/60 border-slate-700/80 text-amber-400 hover:border-amber-500/60'
                }`}
              >
                <Move className="w-4 h-4" />
                <span>Arrastra una carta aquí para regresar a la Mano</span>
              </div>
            </div>

            {/* Cards Grid (Fully Draggable - NO action buttons) */}
            <div className="p-4 overflow-y-auto flex-1">
              {(viewingZone === 'graveyard' ? zones.graveyard : zones.exile).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Esta zona está vacía actualmente
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(viewingZone === 'graveyard' ? zones.graveyard : zones.exile).map(card => (
                    <div
                      key={card.instanceId}
                      data-card-id={card.instanceId}
                      data-card-name={card.definition.name}
                      data-from-zone={viewingZone}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, card, viewingZone)}
                      onDragEnd={handleDragEnd}
                      onPointerDown={e => handlePointerDown(e, card, viewingZone)}
                      onDoubleClick={() => setZoomedCard(card)}
                      className="bg-slate-950 border border-slate-800 hover:border-amber-400/80 rounded-xl overflow-hidden shadow group aspect-[5/7] cursor-grab active:cursor-grabbing select-none relative transition-transform hover:-translate-y-1"
                      title="Arrastra al área de Campo o Mano en la parte superior, o doble clic para ampliar"
                    >
                      {card.definition.imageUrlNormal ? (
                        <img
                          src={card.definition.imageUrlNormal}
                          alt={card.definition.name}
                          className="w-full h-full object-cover pointer-events-none"
                          loading="lazy"
                        />
                      ) : (
                        <div className="p-2 text-xs text-white">{card.definition.name}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Zoom HD Modal */}
      {zoomedCard && (
        <div
          onClick={() => setZoomedCard(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">{zoomedCard.definition.name}</h3>
              <button
                onClick={() => setZoomedCard(null)}
                className="text-slate-400 hover:text-white"
                title="Cerrar ampliación"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {zoomedCard.definition.imageUrlNormal ? (
              <img
                src={zoomedCard.definition.imageUrlNormal}
                alt={zoomedCard.definition.name}
                className="w-full rounded-xl shadow-lg"
              />
            ) : (
              <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-xs">
                <p className="font-semibold text-slate-300">{zoomedCard.definition.typeLine}</p>
                <p className="text-slate-400 leading-relaxed">{zoomedCard.definition.oracleText}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
