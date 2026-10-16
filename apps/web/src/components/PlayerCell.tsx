import React, { useState, useRef } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { toArtCropUrl } from '@mtgc/shared';
import type { PlayerState, GameActionType, CardInstance } from '@mtgc/shared';
import {
  Heart,
  Skull,
  Shield,
  Maximize2,
  Image as ImageIcon,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { HandFan } from './HandFan';
import { CardDisplay } from './CardDisplay';
import { Portal } from './Portal';

// Componente de Comandante arrastrable hacia el campo (Punto 5a)
const DraggableCommanderCard: React.FC<{
  card: CardInstance;
  isLocalPlayer: boolean;
  commanderTax: number;
  onClick: () => void;
}> = ({ card, isLocalPlayer, commanderTax, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card, fromZone: 'command' },
    disabled: !isLocalPlayer,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-commander-card="true"
      data-card-instance-id={card.instanceId}
      onClick={onClick}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-0' : ''
      }`}
    >
      <CardDisplay card={card.definition} allowFaceToggle={false} />
      {commanderTax > 0 && (
        <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded shadow">
          +{commanderTax}
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] font-black text-amber-300 text-center py-0.5 tracking-wider uppercase backdrop-blur-xs pointer-events-none">
        COMANDANTE
      </div>
    </div>
  );
};

// Componente de Carta Superior de Biblioteca arrastrable hacia el campo o mano (Punto 5c / Punto 7)
const DraggableLibraryCard: React.FC<{
  card?: CardInstance;
  isLocalPlayer: boolean;
  count: number;
  onClick: () => void;
}> = ({ card, isLocalPlayer, count, onClick }) => {
  const topCard = card || {
    instanceId: 'library-top-card',
    definition: { name: 'Carta de la Biblioteca', typeLine: 'Card' } as any,
    isFaceDown: true,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: topCard.instanceId,
    data: { card: topCard, fromZone: 'library' },
    disabled: !isLocalPlayer || count === 0,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-library-card="true"
      data-card-instance-id={topCard.instanceId}
      onClick={onClick}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-0' : ''
      }`}
    >
      <img
        src="https://cards.scryfall.io/back.png"
        alt="Biblioteca"
        loading="lazy"
        decoding="async"
        onError={e => {
          (e.target as HTMLElement).style.display = 'none';
        }}
        className="w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-1 pointer-events-none">
        <span className="text-sm sm:text-base font-black font-mono text-white drop-shadow-md">
          {count}
        </span>
        <span className="text-[8px] font-black tracking-wider text-amber-300 uppercase drop-shadow">
          BIBLIOTECA
        </span>
      </div>
    </div>
  );
};

// Componente para carta superior de pila (Cementerio / Exilio) arrastrable (Punto 7)
const DraggablePileCard: React.FC<{
  card: CardInstance;
  fromZone: 'graveyard' | 'exile';
  count: number;
  isLocalPlayer: boolean;
  onClick: () => void;
}> = ({ card, fromZone, count, isLocalPlayer, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card, fromZone },
    disabled: !isLocalPlayer,
  });

  const isGraveyard = fromZone === 'graveyard';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-pile-card={fromZone}
      data-card-instance-id={card.instanceId}
      onClick={onClick}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-md border ${
        isGraveyard ? 'border-slate-700 bg-slate-900' : 'border-purple-800 bg-purple-950'
      } ${isDragging ? 'opacity-0' : ''}`}
    >
      <CardDisplay card={card.definition} allowFaceToggle={false} />
      {/* Overlay Badge con Nombre de Pila y Conteo (Punto 7) */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col items-center justify-end p-0.5 pointer-events-none">
        <span className={`text-[7px] font-black tracking-tight uppercase ${isGraveyard ? 'text-slate-300' : 'text-purple-300'}`}>
          {isGraveyard ? 'CEMENTERIO' : 'EXILIO'}
        </span>
        <span className={`text-[11px] font-mono font-black leading-none drop-shadow ${isGraveyard ? 'text-amber-300' : 'text-purple-200'}`}>
          {count}
        </span>
      </div>
    </div>
  );
};

// Componente para carta dentro del inspector de pila con menú contextual (Punto 7)
const ModalCardItem: React.FC<{
  card: CardInstance;
  zone: 'graveyard' | 'exile' | 'library' | 'command';
  onAction: (type: GameActionType, payload: unknown) => void;
  localPlayerId: string;
  ownerPlayerId: string;
  onCloseModal: () => void;
}> = ({ card, zone, onAction, localPlayerId, ownerPlayerId, onCloseModal }) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleSendToHand = () => {
    setContextMenuPos(null);
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: zone,
      toZone: 'hand',
      toPlayerId: localPlayerId,
    });
    onCloseModal();
  };

  const handleSendToField = () => {
    setContextMenuPos(null);
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: zone,
      toZone: 'battlefield',
      toPlayerId: localPlayerId,
      position: { x: 0.5, y: 0.5 },
    });
    onCloseModal();
  };

  const handleSendToExile = () => {
    setContextMenuPos(null);
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: 'graveyard',
      toZone: 'exile',
      toPlayerId: ownerPlayerId,
    });
    onCloseModal();
  };

  return (
    <div
      data-modal-card-item={card.instanceId}
      onContextMenu={handleContextMenu}
      className="space-y-1 relative group cursor-context-menu"
      title="Clic derecho para opciones (Enviar a la mano, Enviar al campo)"
    >
      <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group-hover:border-amber-400/80 transition-colors">
        <CardDisplay card={card.definition} />
      </div>
      <div className="text-[10px] font-bold text-slate-300 truncate">
        {card.definition.name}
      </div>

      {contextMenuPos && (
        <Portal>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setContextMenuPos(null)}
            onContextMenu={e => { e.preventDefault(); setContextMenuPos(null); }}
          >
            <div
              style={{
                top: `${contextMenuPos.y}px`,
                left: `${contextMenuPos.x}px`,
              }}
              data-modal-context-menu="true"
              onClick={e => e.stopPropagation()}
              className="fixed bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col space-y-1 min-w-[150px] z-[70] backdrop-blur-md"
            >
              <button
                onClick={handleSendToHand}
                className="w-full text-left px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Enviar a la mano
              </button>
              <button
                onClick={handleSendToField}
                className="w-full text-left px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Enviar al campo
              </button>
              {zone === 'graveyard' && (
                <button
                  onClick={handleSendToExile}
                  className="w-full text-left px-2.5 py-1 text-xs font-semibold text-purple-300 hover:text-purple-100 hover:bg-purple-950/80 rounded-lg transition-colors cursor-pointer"
                >
                  Enviar al exilio
                </button>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export function getLifeCornerClasses(row: 0 | 1, col: number, isTwoPlayer?: boolean): string {
  if (isTwoPlayer) {
    // 2 jugadores (2 columnas): colocamos la vida en el tercio interior
    const h = col === 0 ? 'right-10' : 'left-10';
    return `bottom-28 ${h}`;
  }
  // 3 o más jugadores: separación amplia del centro para que los 4 bloques no se toquen entre sí (Punto 6)
  // Row 0 (superior) -> bottom-10. Row 1 (inferior) -> top-10.
  // Col 0 (izquierda) -> right-10. Col >= 1 -> left-10.
  const v = row === 0 ? 'bottom-10' : 'top-10';
  const h = col === 0 ? 'right-10' : 'left-10';
  return `${v} ${h}`;
}

interface PlayerCellProps {
  player: PlayerState;
  zones: {
    library: CardInstance[];
    hand: CardInstance[];
    battlefield: CardInstance[];
    graveyard: CardInstance[];
    exile: CardInstance[];
    command: CardInstance[];
  };
  row: 0 | 1;
  col: number;
  isLocalPlayer: boolean;
  isActiveTurn: boolean;
  isTwoPlayer?: boolean;
  reduceBackgrounds?: boolean;
  localPlayerId?: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onExpandCell?: () => void;
}

export const PlayerCell: React.FC<PlayerCellProps> = ({
  player,
  zones,
  row,
  col,
  isLocalPlayer,
  isActiveTurn,
  isTwoPlayer = false,
  reduceBackgrounds = false,
  localPlayerId = player.id,
  onAction,
  onExpandCell,
}) => {
  const [showLifeControls, setShowLifeControls] = useState(false);
  const [showCustomLifeInput, setShowCustomLifeInput] = useState(false);
  const [customLifeValue, setCustomLifeValue] = useState(player.life.toString());
  const [activePileModal, setActivePileModal] = useState<'graveyard' | 'exile' | 'command' | 'library' | null>(null);
  const [isPlaymatModalOpen, setIsPlaymatModalOpen] = useState(false);
  const [customPlaymatInput, setCustomPlaymatInput] = useState('');
  const [zoomedCard, setZoomedCard] = useState<CardInstance | null>(null);

  // Droppable hooks para pilas individuales (Punto 6)
  const { setNodeRef: setLibDropRef, isOver: isLibOver } = useDroppable({
    id: `library-${player.id}`,
    data: { zone: 'library', playerId: player.id },
  });

  const { setNodeRef: setGydDropRef, isOver: isGydOver } = useDroppable({
    id: `graveyard-${player.id}`,
    data: { zone: 'graveyard', playerId: player.id },
  });

  const { setNodeRef: setExileDropRef, isOver: isExileOver } = useDroppable({
    id: `exile-${player.id}`,
    data: { zone: 'exile', playerId: player.id },
  });

  // Punto 6: Droppable hook para la mano (solo para jugador local)
  const { setNodeRef: setHandDropRef, isOver: isHandOver } = useDroppable({
    id: `droppable-hand-${player.id}`,
    data: { zone: 'hand', playerId: player.id },
    disabled: !isLocalPlayer,
  });

  const lifeButtonRef = useRef<HTMLButtonElement>(null);
  const [lifePopoverPos, setLifePopoverPos] = useState<{ top: number; left: number } | null>(null);

  const toggleLifeControls = () => {
    if (!showLifeControls && lifeButtonRef.current) {
      const rect = lifeButtonRef.current.getBoundingClientRect();
      const popoverWidth = 208;
      const popoverHeight = 170;

      let top = rect.top - popoverHeight - 8;
      if (top < 10) {
        top = rect.bottom + 8;
      }
      let left = rect.left + rect.width / 2 - popoverWidth / 2;
      left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));
      top = Math.max(12, Math.min(window.innerHeight - popoverHeight - 12, top));

      setLifePopoverPos({ top, left });
      setShowLifeControls(true);
    } else {
      setShowLifeControls(false);
    }
  };

  // Fallback playmat (REQ-22.3: art_crop de Scryfall, no la carta completa)
  const playmatImage = toArtCropUrl(
    player.playmatUrl ||
    player.selectedDeck?.commanderImageUrl
  );
  const [playmatError, setPlaymatError] = useState(false);

  React.useEffect(() => {
    setPlaymatError(false);
  }, [playmatImage]);

  const adjustLife = (delta: number) => {
    onAction('ADJUST_LIFE', { playerId: player.id, delta });
  };

  const handleSetLifeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customLifeValue, 10);
    if (!isNaN(val)) {
      onAction('SET_LIFE', { playerId: player.id, life: val });
      setShowCustomLifeInput(false);
    }
  };

  const adjustCounter = (type: string, delta: number) => {
    onAction('SET_PLAYER_COUNTER', { playerId: player.id, counterType: type, delta });
  };

  const handleSavePlaymat = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPlaymatInput.trim()) {
      onAction('SET_PLAYMAT', { playmatUrl: toArtCropUrl(customPlaymatInput.trim()) });
      setIsPlaymatModalOpen(false);
    }
  };

  return (
    <div
      data-player-cell={player.id}
      data-row={row}
      data-col={col}
      data-two-player={isTwoPlayer ? 'true' : 'false'}
      style={{ containerType: 'size' } as React.CSSProperties}
      className={`relative w-full h-full transition-all duration-200 select-none ${
        isActiveTurn
          ? 'ring-4 ring-inset ring-amber-400 shadow-[inset_0_0_60px_rgba(251,191,36,0.38)]'
          : 'ring-1 ring-inset ring-slate-800/40'
      }`}
    >
      {/* Indicador de acento superior para el turno activo (alto contraste) */}
      {isActiveTurn && (
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-lg shadow-amber-400/80 z-30 pointer-events-none animate-pulse" />
      )}

      {/* 1. PlaymatBackground (REQ-22.3) - Cubre el 100% de la división, incluida la zona bajo el dock */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-slate-950">
        {!reduceBackgrounds && playmatImage && !playmatError ? (
          <>
            <img
              src={playmatImage}
              alt=""
              decoding="async"
              onError={() => setPlaymatError(true)}
              className="w-full h-full object-cover opacity-40 filter brightness-90"
            />
            {/* Dark gradient overlays ensuring >= 4.5:1 text contrast (REQ-22.15) */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/30 to-slate-950/80" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
        )}
      </div>

      {/* 2. Top Header: Un solo contenedor con "Nombre [botón expandir]" centrado arriba (Punto 8) */}
      <div
        data-player-header={player.id}
        data-name-tag={player.id}
        className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1.5 px-3 py-1 rounded-xl backdrop-blur-md border text-xs font-bold transition-all shadow-md select-none pointer-events-auto ${
          isActiveTurn
            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/80'
            : 'bg-slate-900/90 text-slate-200 border-slate-700/80'
        }`}
      >
        <span
          className={`whitespace-nowrap max-w-[clamp(120px,25cqw,280px)] truncate ${
            !player.isConnected ? 'opacity-40 text-slate-400 line-through' : ''
          }`}
          title={player.isConnected ? player.name : `${player.name} (Desconectado)`}
        >
          {player.name}
        </span>

        {onExpandCell && (
          <button
            data-expand-cell-btn={player.id}
            onClick={onExpandCell}
            className={`p-0.5 rounded transition-colors cursor-pointer ${
              isActiveTurn
                ? 'text-slate-950 hover:bg-slate-950/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Ampliar esta celda a pantalla completa"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Botón de Playmat en la esquina superior derecha para el jugador local */}
      {isLocalPlayer && (
        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
          <button
            onClick={() => setIsPlaymatModalOpen(true)}
            className="p-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shadow-sm"
            title="Cambiar imagen de Playmat"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Dock Inferior Unificado Flotante sobre el Playmat (Punto 5 / Punto 8 / Punto 9) */}
      <div
        data-player-dock={player.id}
        className="absolute bottom-1 inset-x-0 z-20 flex items-end justify-between px-2 pb-1 w-full gap-1 sm:gap-1.5 pointer-events-none select-none max-w-full overflow-visible"
      >
        {/* 1. Hueco Propio para Pastilla de Vida (Izquierda, Punto 8) */}
        <div data-dock-zone="identity" className="flex flex-col items-start space-y-1 flex-shrink-0 pointer-events-none">

          {/* At Risk Pill si aplica */}
          {player.isAtRisk && !player.isEliminated && (
            <span className="bg-rose-950/90 border border-rose-500 text-rose-300 px-2 py-0.5 rounded-lg text-[9px] font-bold animate-pulse flex items-center space-x-1 shadow">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>En riesgo ({player.riskReason})</span>
            </span>
          )}

          {player.isEliminated && (
            <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-lg text-[9px] font-bold shadow">
              Eliminado
            </span>
          )}

          {/* Botón de Vida */}
          <div className="relative group pointer-events-auto">
            <button
              ref={lifeButtonRef}
              data-life-button={player.id}
              onClick={toggleLifeControls}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-2xl backdrop-blur-md border shadow-2xl transition-all cursor-pointer ${
                player.life <= 0
                  ? 'bg-rose-950/90 border-rose-600 text-rose-300 ring-2 ring-rose-500/30'
                  : player.life <= 10
                  ? 'bg-amber-950/90 border-amber-600 text-amber-200'
                  : 'bg-slate-950/90 border-slate-700/80 text-white hover:border-amber-500/50'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                  player.life <= 10 ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-rose-400'
                }`}
              />
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none">
                {player.life}
              </span>
            </button>

            {/* Quick Life Modifiers Popover via Portal (REQ-22.5) */}
            {showLifeControls && lifePopoverPos && (
              <Portal>
                {/* Invisible overlay for click-outside */}
                <div
                  data-life-backdrop="true"
                  className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[0.5px]"
                  onClick={() => setShowLifeControls(false)}
                />
                <div
                  style={{ top: `${lifePopoverPos.top}px`, left: `${lifePopoverPos.left}px` }}
                  className="fixed z-50 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-2.5 flex flex-col space-y-2 w-52 backdrop-blur-md animate-in fade-in zoom-in-95"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="grid grid-cols-4 gap-1 text-xs font-bold font-mono">
                    <button
                      onClick={() => adjustLife(-5)}
                      className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 py-1 rounded-lg"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => adjustLife(-1)}
                      className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 py-1 rounded-lg"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => adjustLife(1)}
                      className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 py-1 rounded-lg"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => adjustLife(5)}
                      className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 py-1 rounded-lg"
                    >
                      +5
                    </button>
                  </div>

                  {/* Direct SET_LIFE input */}
                  {showCustomLifeInput ? (
                    <form onSubmit={handleSetLifeSubmit} className="flex space-x-1">
                      <input
                        type="number"
                        value={customLifeValue}
                        onChange={e => setCustomLifeValue(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white font-mono"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-amber-500 text-slate-950 font-bold text-xs px-2 rounded-lg"
                      >
                        OK
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowCustomLifeInput(true)}
                      className="w-full text-center text-[10px] text-slate-400 hover:text-white py-0.5"
                    >
                      Escribir vida exacta
                    </button>
                  )}

                  {/* Counter Badges Menu */}
                  <div className="pt-1.5 border-t border-slate-800 grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg">
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <Skull className="w-2.5 h-2.5" />
                        <span>{player.counters.poison}</span>
                      </span>
                      <div className="flex space-x-1">
                        <button onClick={() => adjustCounter('poison', -1)} className="hover:text-white">-</button>
                        <button onClick={() => adjustCounter('poison', 1)} className="hover:text-white">+</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg">
                      <span className="text-amber-400 flex items-center space-x-1">
                        <Shield className="w-2.5 h-2.5" />
                        <span>{player.counters.commanderTax}</span>
                      </span>
                      <div className="flex space-x-1">
                        <button onClick={() => adjustCounter('commanderTax', -2)} className="hover:text-white">-2</button>
                        <button onClick={() => adjustCounter('commanderTax', 2)} className="hover:text-white">+2</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Portal>
            )}
          </div>
        </div>

        {/* 2. Zona de Comandante - Mismo ancho y alto que una carta (Punto 5a: Arrastrable hacia el campo) */}
        <div
          data-dock-zone="command"
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
          }}
          className="rounded-lg overflow-hidden border shadow-lg bg-slate-950 flex flex-col items-center justify-center relative flex-shrink-0 pointer-events-auto z-20"
          title={`Zona de Comando (${zones.command.length} cartas)`}
        >
          {zones.command.length > 0 ? (
            <DraggableCommanderCard
              card={zones.command[0]}
              isLocalPlayer={isLocalPlayer}
              commanderTax={player.counters.commanderTax}
              onClick={() => setActivePileModal('command')}
            />
          ) : (
            <div
              onClick={() => setActivePileModal('command')}
              className="w-full h-full border-2 border-dashed border-amber-600/40 rounded-lg flex flex-col items-center justify-center p-1 text-center bg-amber-950/10 cursor-pointer"
            >
              <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-tight leading-tight">
                ZONA COMANDO
              </span>
              <span className="text-[8px] text-slate-500 mt-0.5">(En campo)</span>
            </div>
          )}
        </div>

        {/* 3. Mano en Abanico - Droppable para devolver cartas a la mano (Punto 6) */}
        <div
          ref={isLocalPlayer ? setHandDropRef : undefined}
          data-dock-zone="hand"
          data-is-over={isHandOver ? 'true' : 'false'}
          className={`flex-1 flex justify-center items-end overflow-visible min-w-0 pointer-events-auto transition-all duration-200 rounded-xl z-10 ${
            isHandOver
              ? 'ring-2 ring-amber-400/80 bg-amber-400/15 shadow-[0_0_30px_rgba(251,191,36,0.3)] border border-amber-400/50'
              : 'border border-transparent'
          }`}
        >
          <HandFan
            cards={zones.hand}
            handCount={player.handCount}
            isLocalPlayer={isLocalPlayer}
            onAction={onAction}
            onZoomCard={card => setZoomedCard(card)}
          />
        </div>

        {/* 4. Biblioteca - Dorso del tamaño de una carta con contador encima (Punto 5c: Arrastrable y Click para robar) */}
        <div
          ref={setLibDropRef}
          data-dock-zone="library"
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
          }}
          className={`rounded-lg overflow-hidden border shadow-lg relative flex flex-col items-center justify-center flex-shrink-0 pointer-events-auto transition-all z-20 ${
            isLibOver
              ? 'ring-4 ring-amber-400 scale-110 shadow-2xl shadow-amber-500/60 z-30'
              : isLocalPlayer
              ? 'cursor-pointer hover:scale-105 active:scale-95 border-amber-500/50'
              : 'border-slate-800'
          }`}
          title={isLocalPlayer ? 'Click para robar de la Biblioteca, o arrastra al campo o a la mano' : 'Biblioteca'}
        >
          <DraggableLibraryCard
            card={zones.library[0]}
            isLocalPlayer={isLocalPlayer}
            count={zones.library.length || player.libraryCount}
            onClick={() => isLocalPlayer && onAction('DRAW_CARDS', { playerId: player.id, count: 1 })}
          />
          {isLocalPlayer && (
            <button
              data-library-inspect-btn="true"
              onClick={e => {
                e.stopPropagation();
                setActivePileModal('library');
              }}
              className="absolute top-1 right-1 p-1 bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-md border border-slate-700 shadow transition-colors cursor-pointer z-10"
              title="Ver contenido de la biblioteca (solo tú)"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 5. Cementerio y Exilio Apilados (Mismo ancho que una carta, mitad de alto cada uno, Punto 7) */}
        <div
          data-dock-zone="graveyard-exile"
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
          }}
          className="flex flex-col gap-1 flex-shrink-0 pointer-events-auto z-20"
        >
          {/* Cementerio (Mitad Superior - Droppable y Arrastrable, Punto 7) */}
          <div
            ref={setGydDropRef}
            className={`flex-1 rounded-md overflow-hidden border border-slate-700 bg-slate-900/90 shadow flex flex-col items-center justify-center cursor-pointer hover:border-slate-500 active:scale-95 transition-all relative ${
              isGydOver
                ? 'ring-4 ring-slate-200 scale-105 bg-slate-700 shadow-xl'
                : zones.graveyard.length > 0
                ? 'bg-slate-800/90'
                : 'opacity-70'
            }`}
            title={`Cementerio: ${zones.graveyard.length} cartas (clic para ver, arrastra la superior)`}
          >
            {zones.graveyard.length > 0 ? (
              <DraggablePileCard
                card={zones.graveyard[zones.graveyard.length - 1]!}
                fromZone="graveyard"
                count={zones.graveyard.length}
                isLocalPlayer={isLocalPlayer}
                onClick={() => setActivePileModal('graveyard')}
              />
            ) : (
              <div
                onClick={() => setActivePileModal('graveyard')}
                className="w-full h-full flex flex-col items-center justify-center p-0.5"
              >
                <span className="text-[7px] font-extrabold text-slate-300 uppercase tracking-tight">
                  CEMENTERIO
                </span>
                <span className="text-[11px] font-mono font-black text-amber-300 leading-tight">
                  0
                </span>
              </div>
            )}
          </div>

          {/* Exilio (Mitad Inferior - Droppable y Arrastrable, Punto 7) */}
          <div
            ref={setExileDropRef}
            className={`flex-1 rounded-md overflow-hidden border border-slate-700 bg-slate-900/90 shadow flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 active:scale-95 transition-all relative ${
              isExileOver
                ? 'ring-4 ring-purple-400 scale-105 bg-purple-900 shadow-xl'
                : zones.exile.length > 0
                ? 'bg-purple-950/40 border-purple-700/60'
                : 'opacity-70'
            }`}
            title={`Exilio: ${zones.exile.length} cartas (clic para ver, arrastra la superior)`}
          >
            {zones.exile.length > 0 ? (
              <DraggablePileCard
                card={zones.exile[zones.exile.length - 1]!}
                fromZone="exile"
                count={zones.exile.length}
                isLocalPlayer={isLocalPlayer}
                onClick={() => setActivePileModal('exile')}
              />
            ) : (
              <div
                onClick={() => setActivePileModal('exile')}
                className="w-full h-full flex flex-col items-center justify-center p-0.5"
              >
                <span className="text-[7px] font-extrabold text-purple-300 uppercase tracking-tight">
                  EXILIO
                </span>
                <span className="text-[11px] font-mono font-black text-purple-200 leading-tight">
                  0
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pile Modal Inspector (Punto 7) */}
      {activePileModal && (
        <Portal>
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActivePileModal(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white capitalize">
                  {activePileModal === 'command'
                    ? 'Zona de Comando'
                    : activePileModal === 'graveyard'
                    ? 'Cementerio'
                    : activePileModal === 'exile'
                    ? 'Exilio'
                    : 'Biblioteca'} ({zones[activePileModal]?.length || 0})
                </h3>
                <button
                  onClick={() => setActivePileModal(null)}
                  className="text-slate-400 hover:text-white font-bold text-lg"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
                {zones[activePileModal]?.map((card, i) => (
                  <ModalCardItem
                    key={card.instanceId || i}
                    card={card}
                    zone={activePileModal}
                    onAction={onAction}
                    localPlayerId={localPlayerId}
                    ownerPlayerId={player.id}
                    onCloseModal={() => setActivePileModal(null)}
                  />
                ))}
                {(!zones[activePileModal] || zones[activePileModal].length === 0) && (
                  <div className="col-span-3 text-center py-6 text-slate-500 text-xs italic">
                    Esta zona está vacía
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Playmat Selector Modal (REQ-22.3) */}
      {isPlaymatModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleSavePlaymat}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Personalizar Playmat</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPlaymatModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  &times;
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL de imagen / Art Crop (Scryfall o enlace directo)
                </label>
                <input
                  type="url"
                  value={customPlaymatInput}
                  onChange={e => setCustomPlaymatInput(e.target.value)}
                  placeholder="https://cards.scryfall.io/art_crop/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPlaymatModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-xl"
                >
                  Guardar Playmat
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {/* Zoom Card HD Modal (REQ-9.6) */}
      {zoomedCard && (
        <Portal>
          <div
            onClick={() => setZoomedCard(null)}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-4 flex flex-col space-y-3 shadow-2xl overflow-hidden cursor-default"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-sm text-white truncate">
                  {zoomedCard.definition.name}
                </span>
                <button
                  onClick={() => setZoomedCard(null)}
                  className="text-slate-400 hover:text-white font-bold text-lg"
                >
                  &times;
                </button>
              </div>
              <div className="aspect-[2.5/3.5] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                <CardDisplay card={zoomedCard.definition} allowFaceToggle={true} />
              </div>
              <div className="text-center text-xs text-slate-400">
                {zoomedCard.definition.typeLine}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};
