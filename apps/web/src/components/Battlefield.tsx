import React, { useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import type {
  CardInstance,
  PlayerZones,
  GameActionType,
  ZoneType,
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
  MoreHorizontal,
  ArrowUpRight,
  Copy,
} from 'lucide-react';

interface BattlefieldProps {
  localPlayerId: string;
  zones: PlayerZones;
  onAction: (type: GameActionType, payload: unknown) => void;
}

const CARD_WIDTH = 124;
const CARD_HEIGHT = 174;

// ----------------------------------------------------
// Droppable Zone Component
// ----------------------------------------------------
interface DroppableZoneProps {
  id: string;
  zone: ZoneType;
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}

const DroppableZone: React.FC<DroppableZoneProps> = ({
  id,
  zone,
  children,
  className = '',
  title,
  onClick,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { zone },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`${className} ${
        isOver
          ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-950/40 shadow-lg scale-[1.01]'
          : ''
      }`}
      title={title}
      data-drop-zone={zone}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------
// Draggable Card Wrapper
// ----------------------------------------------------
interface DraggableCardProps {
  card: CardInstance;
  fromZone: ZoneType;
  children: React.ReactNode;
  onDoubleClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  fromZone,
  children,
  onDoubleClick,
  className = '',
  style,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card, fromZone },
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'opacity-30 scale-95 pointer-events-none' : ''}`}
      onDoubleClick={onDoubleClick}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

export const Battlefield: React.FC<BattlefieldProps> = ({ localPlayerId, zones, onAction }) => {
  const [zoomedCard, setZoomedCard] = useState<CardInstance | null>(null);
  const [viewingZone, setViewingZone] = useState<'graveyard' | 'exile' | null>(null);
  const [activeCard, setActiveCard] = useState<{ card: CardInstance; fromZone: ZoneType } | null>(
    null,
  );
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [highestZIndex, setHighestZIndex] = useState(25);

  const battlefieldRef = useRef<HTMLDivElement>(null);

  // Configure sensors: Pointer (Mouse), Touch (Mobile), and Keyboard (Accessibility)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // ----------------------------------------------------
  // Game Actions
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
          x: position?.x ?? 0.5,
          y: position?.y ?? 0.5,
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
  // dnd-kit Drag Handlers
  // ----------------------------------------------------
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { card: CardInstance; fromZone: ZoneType }
      | undefined;
    if (data) {
      setActiveCard(data);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveCard(null);

    if (!over) return;

    const data = active.data.current as { card: CardInstance; fromZone: ZoneType } | undefined;
    if (!data) return;

    const { card, fromZone } = data;
    const targetZone = (over.data.current?.zone ||
      over.id.toString().replace('zone-', '')) as ZoneType;

    if (targetZone === 'battlefield') {
      const rect = battlefieldRef.current?.getBoundingClientRect();
      let normX = 0.5;
      let normY = 0.5;

      if (rect && rect.width > 0 && rect.height > 0) {
        if (fromZone === 'battlefield') {
          // If already on battlefield, add relative delta
          const currentX = card.position?.x !== undefined ? card.position.x : 0.5;
          const currentY = card.position?.y !== undefined ? card.position.y : 0.5;
          // Normalize if was legacy pixel coordinate
          const actualCurrentX = currentX > 1 ? currentX / rect.width : currentX;
          const actualCurrentY = currentY > 1 ? currentY / rect.height : currentY;

          const dxNorm = delta.x / rect.width;
          const dyNorm = delta.y / rect.height;
          normX = Math.max(0.02, Math.min(0.92, actualCurrentX + dxNorm));
          normY = Math.max(0.02, Math.min(0.92, actualCurrentY + dyNorm));
        } else {
          // Dropped from hand or command zone
          const pointerEvent = event.activatorEvent as MouseEvent | TouchEvent;
          const clientX =
            'clientX' in pointerEvent
              ? pointerEvent.clientX
              : pointerEvent.touches?.[0]?.clientX ?? rect.left + rect.width / 2;
          const clientY =
            'clientY' in pointerEvent
              ? pointerEvent.clientY
              : pointerEvent.touches?.[0]?.clientY ?? rect.top + rect.height / 2;

          normX = Math.max(0.02, Math.min(0.92, (clientX + delta.x - rect.left) / rect.width));
          normY = Math.max(0.02, Math.min(0.92, (clientY + delta.y - rect.top) / rect.height));
        }
      }

      const nextZ = (card.position?.zIndex ?? highestZIndex) + 1;
      setHighestZIndex(nextZ);
      executeMoveCard(card.instanceId, fromZone, 'battlefield', {
        x: normX,
        y: normY,
        zIndex: nextZ,
      });
    } else {
      executeMoveCard(card.instanceId, fromZone, targetZone);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full space-y-4">
        {/* Top Control Bar: Global Actions and Zone Docks */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-lg">
          {/* Left: Global Battlefield Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUntapAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700/60"
              title="Enderezar todas las cartas giradas en tu campo de batalla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Enderezar Todo</span>
            </button>
            <button
              onClick={handleDraw}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors border border-amber-500/40"
              title="Robar 1 carta de tu biblioteca a tu mano"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Robar Carta</span>
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700/60"
              title="Barajar tu biblioteca usando CSPRNG autoritativo"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Barajar</span>
            </button>
            <button
              onClick={handleMulligan}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition-colors border border-slate-700/60"
              title="Regresar tu mano a la biblioteca, barajar y robar 7 cartas"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mulligan</span>
            </button>
          </div>

          {/* Right: Drop Target Docks for Library, Graveyard & Exile */}
          <div className="flex items-center space-x-3">
            <DroppableZone
              id="zone-library"
              zone="library"
              onClick={handleDraw}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border bg-slate-950/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              title="Biblioteca (Clic para robar. Arrastra cartas aquí para poner en el tope)"
            >
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Biblioteca</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[11px] font-bold text-white">
                {zones.library.length}
              </span>
            </DroppableZone>

            <DroppableZone
              id="zone-graveyard"
              zone="graveyard"
              onClick={() => setViewingZone('graveyard')}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border bg-slate-950/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              title="Cementerio (Arrastra cartas aquí para destruir o descartar. Clic para ver)"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Cementerio</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[11px] font-bold text-white">
                {zones.graveyard.length}
              </span>
            </DroppableZone>

            <DroppableZone
              id="zone-exile"
              zone="exile"
              onClick={() => setViewingZone('exile')}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border bg-slate-950/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              title="Exilio (Arrastra cartas aquí para exiliarlas. Clic para ver)"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Exilio</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[11px] font-bold text-white">
                {zones.exile.length}
              </span>
            </DroppableZone>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              <span>Campo:</span>
              <strong className="text-amber-400 font-bold">{zones.battlefield.length}</strong>
            </div>
          </div>
        </div>

        {/* Main Freeform Battlefield Canvas */}
        <DroppableZone
          id="zone-battlefield"
          zone="battlefield"
          className="relative min-h-[440px] flex-1 bg-slate-950/90 border-2 rounded-2xl p-4 overflow-auto select-none transition-all duration-200 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] border-slate-800/80"
        >
          <div ref={battlefieldRef} className="relative w-full h-full min-h-[400px]">
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
                    Arrastra cartas o usa los botones alternativos para desplegarlas aquí
                  </p>
                </div>
              </div>
            ) : (
              zones.battlefield.map((card, idx) => {
                const posX =
                  card.position?.x !== undefined
                    ? card.position.x <= 1
                      ? `${card.position.x * 100}%`
                      : `${card.position.x}px`
                    : `${20 + (idx % 5) * 140}px`;

                const posY =
                  card.position?.y !== undefined
                    ? card.position.y <= 1
                      ? `${card.position.y * 100}%`
                      : `${card.position.y}px`
                    : `${20 + Math.floor(idx / 5) * 190}px`;

                const cardZ = card.position?.zIndex ?? idx + 1;
                const plusCounters = card.counters['+1/+1'] || 0;
                const isMenuOpen = openCardMenuId === card.instanceId;

                return (
                  <DraggableCard
                    key={card.instanceId}
                    card={card}
                    fromZone="battlefield"
                    onDoubleClick={() => setZoomedCard(card)}
                    style={{
                      position: 'absolute',
                      left: posX,
                      top: posY,
                      zIndex: cardZ,
                      width: `${CARD_WIDTH}px`,
                      height: `${CARD_HEIGHT}px`,
                    }}
                    className={`select-none cursor-grab active:cursor-grabbing rounded-xl overflow-visible shadow-2xl bg-slate-900 border transition-all duration-150 touch-none group ${
                      card.isTapped
                        ? 'border-amber-400/80 ring-2 ring-amber-400/20'
                        : 'border-slate-800 hover:border-amber-400/70 hover:shadow-amber-500/10'
                    }`}
                  >
                    <div
                      onClick={() => handleTap(card)}
                      className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden cursor-pointer"
                      title="Clic: Girar/Enderezar. Doble clic: Ampliar. Arrastra para mover o usa el menú alternativo."
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
                          <span className="text-[10px] text-slate-400">
                            {card.definition.typeLine}
                          </span>
                        </div>
                      )}

                      {/* Tapped Indicator */}
                      {card.isTapped && (
                        <div className="absolute inset-0 bg-amber-950/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950/90 px-2 py-0.5 rounded text-amber-300 border border-amber-400/50 shadow">
                            GIRADA
                          </span>
                        </div>
                      )}

                      {/* +1/+1 Counters Controls on Hover */}
                      <div className="absolute top-1.5 left-1.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 backdrop-blur rounded-lg p-0.5 border border-slate-700/80 shadow z-20">
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
                            onAction('CLONE_TOKEN', { cardInstanceId: card.instanceId });
                          }}
                          title="Clonar Token / Permanente (REQ-9.4)"
                          className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors"
                        >
                          <Copy className="w-3 h-3" />
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

                      {/* Alternative Actions Menu Trigger Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setOpenCardMenuId(isMenuOpen ? null : card.instanceId);
                        }}
                        className="absolute bottom-1.5 right-1.5 p-1 bg-slate-950/85 hover:bg-amber-950 border border-slate-700 text-slate-300 hover:text-amber-300 rounded-lg shadow opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        title="Botones alternativos de acción rápida"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {/* Badge for +1/+1 counters */}
                      {plusCounters > 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg pointer-events-none z-10">
                          +{plusCounters}/+{plusCounters}
                        </div>
                      )}
                    </div>

                    {/* Alternative Action Popover Menu (Accessible alternative to dragging) */}
                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute -bottom-32 left-0 right-0 bg-slate-900 border border-amber-500/50 rounded-xl p-1.5 shadow-2xl flex flex-col space-y-1 z-50 text-[11px]"
                      >
                        <button
                          onClick={() => {
                            onAction('CLONE_TOKEN', { cardInstanceId: card.instanceId });
                            setOpenCardMenuId(null);
                          }}
                          className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold"
                        >
                          Clonar Token
                        </button>
                        <button
                          onClick={() => {
                            executeMoveCard(card.instanceId, 'battlefield', 'hand');
                            setOpenCardMenuId(null);
                          }}
                          className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          A la Mano
                        </button>
                        <button
                          onClick={() => {
                            executeMoveCard(card.instanceId, 'battlefield', 'graveyard');
                            setOpenCardMenuId(null);
                          }}
                          className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300"
                        >
                          Al Cementerio
                        </button>
                        <button
                          onClick={() => {
                            executeMoveCard(card.instanceId, 'battlefield', 'exile');
                            setOpenCardMenuId(null);
                          }}
                          className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300"
                        >
                          Al Exilio
                        </button>
                      </div>
                    )}
                  </DraggableCard>
                );
              })
            )}
          </div>
        </DroppableZone>

        {/* Command Zone & Private Hand Tray */}
        <DroppableZone
          id="zone-hand"
          zone="hand"
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3"
        >
          {/* Command Zone */}
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800 flex-wrap gap-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Zona de Comando:</span>
            </span>

            {zones.command.length > 0 ? (
              zones.command.map(cmd => (
                <div key={cmd.instanceId} className="flex items-center space-x-2">
                  <DraggableCard
                    card={cmd}
                    fromZone="command"
                    onDoubleClick={() => setZoomedCard(cmd)}
                    className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-800/80 border border-amber-500/40 hover:border-amber-400 px-3 py-1.5 rounded-xl cursor-grab active:cursor-grabbing shadow transition-all touch-none group"
                  >
                    <span className="text-xs font-semibold text-white group-hover:text-amber-300">
                      {cmd.definition.name}
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                      <Move className="w-2.5 h-2.5" />
                      <span>Arrastrar</span>
                    </span>
                  </DraggableCard>

                  {/* Alternative button to play commander */}
                  <button
                    onClick={() =>
                      executeMoveCard(cmd.instanceId, 'command', 'battlefield', {
                        x: 0.5,
                        y: 0.5,
                      })
                    }
                    className="p-1 bg-slate-800 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                    title="Botón alternativo: Lanzar Comandante al campo"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <DroppableZone
                id="zone-command"
                zone="command"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-700/60 bg-slate-950/50 text-slate-400 text-xs transition-all"
                title="Zona de Comando (Arrastra a tu comandante aquí para retornarlo)"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Arrastra tu comandante aquí para retornarlo</span>
              </DroppableZone>
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
              Arrastra cartas con ratón/táctil o usa los botones alternativos
            </span>
          </div>

          {/* Hand Cards Horizontal Slider */}
          <div className="flex space-x-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {zones.hand.length === 0 ? (
              <div className="py-4 px-2 text-xs text-slate-500 italic">Tu mano está vacía</div>
            ) : (
              zones.hand.map(card => (
                <div key={card.instanceId} className="flex-shrink-0 flex flex-col space-y-1">
                  <DraggableCard
                    card={card}
                    fromZone="hand"
                    onDoubleClick={() => setZoomedCard(card)}
                    className="w-32 sm:w-36 aspect-[5/7] bg-slate-950 border border-slate-800 hover:border-amber-400/80 rounded-xl overflow-hidden shadow-lg group transition-transform hover:-translate-y-2 cursor-grab active:cursor-grabbing select-none touch-none relative"
                  >
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
                        <span className="text-[10px] text-slate-400">
                          {card.definition.typeLine}
                        </span>
                      </div>
                    )}
                  </DraggableCard>

                  {/* Alternative Action Buttons for each hand card */}
                  <div className="flex items-center justify-between gap-1 px-1">
                    <button
                      onClick={() =>
                        executeMoveCard(card.instanceId, 'hand', 'battlefield', {
                          x: 0.5,
                          y: 0.5,
                        })
                      }
                      className="flex-1 py-0.5 px-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[10px] font-semibold rounded border border-amber-500/30 text-center transition-colors"
                      title="Botón alternativo: Lanzar al Campo"
                    >
                      Campo
                    </button>
                    <button
                      onClick={() => executeMoveCard(card.instanceId, 'hand', 'graveyard')}
                      className="py-0.5 px-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-semibold rounded border border-rose-500/30 transition-colors"
                      title="Botón alternativo: Descartar al Cementerio"
                    >
                      Desc.
                    </button>
                    <button
                      onClick={() => executeMoveCard(card.instanceId, 'hand', 'exile')}
                      className="py-0.5 px-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 text-[10px] font-semibold rounded border border-purple-500/30 transition-colors"
                      title="Botón alternativo: Al Exilio"
                    >
                      Exilio
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DroppableZone>

        {/* Graveyard / Exile Zone Viewer Modal */}
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

              {/* Cards Grid inside Modal */}
              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {(viewingZone === 'graveyard' ? zones.graveyard : zones.exile).length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500 text-xs italic">
                    Esta zona está vacía
                  </div>
                ) : (
                  (viewingZone === 'graveyard' ? zones.graveyard : zones.exile).map(card => (
                    <div key={card.instanceId} className="flex flex-col space-y-1">
                      <DraggableCard
                        card={card}
                        fromZone={viewingZone!}
                        onDoubleClick={() => setZoomedCard(card)}
                        className="w-full aspect-[5/7] bg-slate-950 border border-slate-800 hover:border-amber-400 rounded-xl overflow-hidden shadow cursor-grab active:cursor-grabbing relative"
                      >
                        {card.definition.imageUrlNormal ? (
                          <img
                            src={card.definition.imageUrlNormal}
                            alt={card.definition.name}
                            className="w-full h-full object-cover pointer-events-none"
                            loading="lazy"
                          />
                        ) : (
                          <div className="p-2 h-full flex flex-col justify-between text-xs pointer-events-none">
                            <span className="font-bold text-white leading-tight">
                              {card.definition.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {card.definition.typeLine}
                            </span>
                          </div>
                        )}
                      </DraggableCard>

                      {/* Alternative action buttons in modal */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            executeMoveCard(card.instanceId, viewingZone!, 'hand');
                            setViewingZone(null);
                          }}
                          className="flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded text-center"
                          title="A la mano"
                        >
                          Mano
                        </button>
                        <button
                          onClick={() => {
                            executeMoveCard(card.instanceId, viewingZone!, 'battlefield', {
                              x: 0.5,
                              y: 0.5,
                            });
                            setViewingZone(null);
                          }}
                          className="flex-1 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[10px] rounded text-center"
                          title="Reanimar / Al campo"
                        >
                          Campo
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Zoomed Card Fullscreen Preview Modal */}
        {zoomedCard && (
          <div
            onClick={() => setZoomedCard(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="relative max-w-sm sm:max-w-md w-full flex flex-col items-center space-y-4"
            >
              <button
                onClick={() => setZoomedCard(null)}
                className="absolute -top-10 right-0 text-slate-400 hover:text-white p-1 rounded-full bg-slate-900 border border-slate-700 transition-colors"
                title="Cerrar vista previa"
              >
                <X className="w-5 h-5" />
              </button>
              {zoomedCard.definition.imageUrlNormal ? (
                <img
                  src={zoomedCard.definition.imageUrlNormal}
                  alt={zoomedCard.definition.name}
                  className="w-full rounded-2xl shadow-2xl border border-slate-700/80"
                />
              ) : (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full text-center text-white">
                  <h3 className="font-bold text-lg">{zoomedCard.definition.name}</h3>
                  <p className="text-sm text-slate-400 mt-2">{zoomedCard.definition.typeLine}</p>
                  <p className="text-xs text-slate-300 mt-4 whitespace-pre-wrap">
                    {zoomedCard.definition.oracleText}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Active Drag Overlay */}
        <DragOverlay>
          {activeCard ? (
            <div
              style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}
              className="rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400 bg-slate-950 ring-4 ring-amber-400/20 opacity-90 cursor-grabbing pointer-events-none"
            >
              {activeCard.card.definition.imageUrlNormal ? (
                <img
                  src={activeCard.card.definition.imageUrlNormal}
                  alt={activeCard.card.definition.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-2.5 h-full flex flex-col justify-between text-xs bg-slate-900">
                  <span className="font-bold text-white leading-tight">
                    {activeCard.card.definition.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {activeCard.card.definition.typeLine}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};
