import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { toArtCropUrl } from '@mtgc/shared';
import type { PlayerState, GameActionType, CardInstance, CardDefinition, RoomState } from '@mtgc/shared';
import {
  Heart,
  Skull,
  Maximize2,
  Image as ImageIcon,
  AlertTriangle,
  Eye,
  Search,
  RefreshCw,
  User,
  BookOpen,
  X,
} from 'lucide-react';
import { HandFan } from './HandFan';
import { CardDisplay } from './CardDisplay';
import { CardContextMenu } from './CardContextMenu';
import { Portal } from './Portal';
import { VirtualizedCardGrid } from './VirtualizedCardGrid';
import { useCardPreview } from '../context/CardPreviewContext';
import { scryfallQueue } from '../services/scryfallQueue';
import { imageLoaderQueue, type ImageQueueStats } from '../services/imageLoaderQueue';

const CARD_TYPE_FILTERS = [
  'Criaturas',
  'Instantáneos',
  'Conjuros',
  'Artefactos',
  'Encantamientos',
  'Tierras',
  'Planeswalkers',
] as const;

// Componente de Comandante arrastrable hacia el campo (Punto 5a / Punto 6)
const DraggableCommanderCard: React.FC<{
  card: CardInstance;
  isLocalPlayer: boolean;
  onClick: () => void;
}> = ({ card, isLocalPlayer, onClick }) => {
  const { showPreview, hidePreview } = useCardPreview();
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
      onMouseEnter={(e) => !card.isFaceDown && !isDragging && showPreview(card.definition, e)}
      onMouseLeave={hidePreview}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-0' : ''
      }`}
    >
      <CardDisplay card={card.definition} allowFaceToggle={false} />
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
  const { showPreview, hidePreview } = useCardPreview();
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
      onMouseEnter={(e) => card?.definition && !card.isFaceDown && !isDragging && showPreview(card.definition, e)}
      onMouseLeave={hidePreview}
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

// Componente para carta dentro del inspector de pila con menú contextual (Punto 7 / Punto 2)
const ModalCardItem: React.FC<{
  card: CardInstance;
  zone: 'graveyard' | 'exile' | 'library' | 'command';
  onAction: (type: GameActionType, payload: unknown) => void;
  localPlayerId: string;
  roomState?: RoomState;
  allBattlefieldCards?: CardInstance[];
  onCloseModal: () => void;
}> = ({ card, zone, onAction, localPlayerId, roomState, allBattlefieldCards, onCloseModal }) => {
  const { showPreview, hidePreview } = useCardPreview();
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      data-modal-card-item={card.instanceId}
      data-card-name={card.definition.name}
      data-card-type={card.definition.typeLine}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => showPreview(card.definition, e)}
      onMouseLeave={hidePreview}
      className="space-y-1 relative group cursor-context-menu"
      title="Clic derecho para opciones (Enviar a la mano, Enviar al campo)"
    >
      <div className="aspect-[146/204] rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group-hover:border-amber-400/80 transition-colors">
        <CardDisplay card={card.definition} size={zone === 'library' ? 'small' : 'normal'} />
      </div>
      <div className="text-[10px] font-bold text-slate-300 truncate" title={card.definition.name}>
        {card.definition.name}
      </div>

      {contextMenuPos && (
        <CardContextMenu
          card={card}
          fromZone={zone}
          position={contextMenuPos}
          onClose={() => {
            setContextMenuPos(null);
            onCloseModal();
          }}
          roomState={roomState}
          localPlayerId={localPlayerId}
          allBattlefieldCards={allBattlefieldCards}
          onAction={onAction}
        />
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
  roomState?: RoomState;
  allBattlefieldCards?: CardInstance[];
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
  roomState,
  allBattlefieldCards,
  onAction,
  onExpandCell,
}) => {
  const { openCardDetails } = useCardPreview();
  const [showLifeControls, setShowLifeControls] = useState(false);
  const [damageInput, setDamageInput] = useState('');
  const [healInput, setHealInput] = useState('');
  const [activePileModal, setActivePileModal] = useState<'graveyard' | 'exile' | 'command' | 'library' | null>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string | null>(null);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [imageStats, setImageStats] = useState<ImageQueueStats>(() => imageLoaderQueue.getStats());

  useEffect(() => {
    return imageLoaderQueue.subscribe(setImageStats);
  }, []);

  useEffect(() => {
    if (activePileModal === 'library' && zones.library.length > 0) {
      for (const card of zones.library) {
        const url = card.definition?.imageUrlSmall || card.definition?.imageUrlNormal;
        if (url) {
          imageLoaderQueue.enqueue(url, 1);
        }
      }
    }
  }, [activePileModal, zones.library]);

  useEffect(() => {
    if (activePileModal === 'library') {
      const unsubscribe = scryfallQueue.subscribe(size => {
        setSyncQueueCount(size);
      });
      return () => unsubscribe();
    } else {
      setLibrarySearchQuery('');
      setLibraryTypeFilter(null);
    }
  }, [activePileModal]);

  const filteredModalCards = useMemo(() => {
    if (!activePileModal) return [];
    const list = zones[activePileModal] || [];
    if (activePileModal !== 'library') return list;

    return list.filter(card => {
      // 1. Filtrar por nombre
      if (librarySearchQuery.trim()) {
        const q = librarySearchQuery.trim().toLowerCase();
        const name = (card.definition?.name || '').toLowerCase();
        if (!name.includes(q)) return false;
      }
      // 2. Filtrar por tipo (Punto 8)
      if (libraryTypeFilter) {
        const typeLine = (card.definition?.typeLine || '').toLowerCase();
        const filter = libraryTypeFilter.toLowerCase();
        if (filter === 'criaturas') {
          if (!typeLine.includes('creature') && !typeLine.includes('criatura')) return false;
        } else if (filter === 'instantáneos' || filter === 'instantaneos') {
          if (!typeLine.includes('instant') && !typeLine.includes('instantáneo')) return false;
        } else if (filter === 'conjuros') {
          if (!typeLine.includes('sorcery') && !typeLine.includes('conjuro')) return false;
        } else if (filter === 'artefactos') {
          if (!typeLine.includes('artifact') && !typeLine.includes('artefacto')) return false;
        } else if (filter === 'encantamientos') {
          if (!typeLine.includes('enchantment') && !typeLine.includes('encantamiento')) return false;
        } else if (filter === 'tierras') {
          if (!typeLine.includes('land') && !typeLine.includes('tierra')) return false;
        } else if (filter === 'planeswalkers') {
          if (!typeLine.includes('planeswalker')) return false;
        }
      }
      return true;
    });
  }, [zones, activePileModal, librarySearchQuery, libraryTypeFilter]);
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

  // Punto 6: Droppable hook para la zona de comando
  const { setNodeRef: setCommandDropRef, isOver: isCommandOver } = useDroppable({
    id: `droppable-command-${player.id}`,
    data: { zone: 'command', playerId: player.id },
    disabled: !isLocalPlayer,
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
      const popoverHeight = 220;

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

  // URL del playmat para previsualización (reactivo a lo que el usuario escribe en el input)
  const previewPlaymatUrl = customPlaymatInput.trim()
    ? toArtCropUrl(customPlaymatInput.trim())
    : playmatImage;

  // Resolver carta y atribución del playmat (REQ-18, REQ-22.3, Punto 7)
  const activePlaymatCard = useMemo<CardDefinition | null>(() => {
    const currentUrl = previewPlaymatUrl;
    const allPlayerCards: CardInstance[] = [
      ...(zones.command || []),
      ...(zones.battlefield || []),
      ...(zones.graveyard || []),
      ...(zones.exile || []),
      ...(zones.hand || []),
      ...(zones.library || []),
      ...(allBattlefieldCards || []),
    ];

    if (currentUrl) {
      const match = allPlayerCards.find(c => {
        const d = c.definition;
        if (!d) return false;
        if (d.imageUrlArtCrop && toArtCropUrl(d.imageUrlArtCrop) === currentUrl) return true;
        if (d.imageUrlNormal && toArtCropUrl(d.imageUrlNormal) === currentUrl) return true;
        if (d.imageUrlLarge && toArtCropUrl(d.imageUrlLarge) === currentUrl) return true;
        return false;
      });
      if (match?.definition) return match.definition;
    }

    // Comandante del jugador
    const cmd =
      zones.command?.[0] ||
      allBattlefieldCards?.find(c => c.isCommander && c.ownerId === player.id) ||
      zones.battlefield?.find(c => c.isCommander && c.ownerId === player.id) ||
      zones.graveyard?.find(c => c.isCommander && c.ownerId === player.id) ||
      zones.exile?.find(c => c.isCommander && c.ownerId === player.id) ||
      zones.hand?.find(c => c.isCommander && c.ownerId === player.id);

    if (cmd?.definition) return cmd.definition;

    // Deck comandante o fallback sintetizado
    if (player.selectedDeck?.commanderName) {
      return {
        scryfallId: 'playmat-commander-' + player.id,
        name: player.selectedDeck.commanderName,
        cmc: 0,
        typeLine: 'Comandante',
        colors: [],
        colorIdentity: [],
        artist: 'Artista Oficial',
        copyright: '™ & © Wizards of the Coast',
        imageUrlArtCrop: currentUrl,
        imageUrlLarge: currentUrl,
        imageUrlNormal: currentUrl,
      };
    }

    if (currentUrl) {
      return {
        scryfallId: 'playmat-art-' + player.id,
        name: 'Arte de Playmat',
        cmc: 0,
        typeLine: 'Fondo de Terreno de Juego',
        colors: [],
        colorIdentity: [],
        artist: 'Artista Oficial',
        copyright: '™ & © Wizards of the Coast',
        imageUrlArtCrop: currentUrl,
        imageUrlLarge: currentUrl,
        imageUrlNormal: currentUrl,
      };
    }

    return null;
  }, [previewPlaymatUrl, zones, allBattlefieldCards, player.id, player.selectedDeck]);

  const isUsingArtCrop = Boolean(
    previewPlaymatUrl &&
    (previewPlaymatUrl.includes('art_crop') ||
     previewPlaymatUrl.includes('cards.scryfall.io') ||
     Boolean(activePlaymatCard))
  );

  const playmatArtist = activePlaymatCard?.artist || 'Wizards of the Coast';
  const playmatCopyright = activePlaymatCard?.copyright || '™ & © Wizards of the Coast';

  const adjustLife = (delta: number) => {
    onAction('ADJUST_LIFE', { playerId: player.id, delta });
  };

  // Punto 7: Daño recibido resta a la vida actual y limpia el input
  const handleDamageSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const val = parseInt(damageInput, 10);
    if (!isNaN(val) && val > 0) {
      adjustLife(-val);
      setDamageInput('');
    }
  };

  // Punto 7: Vida ganada suma a la vida actual y limpia el input
  const handleHealSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const val = parseInt(healInput, 10);
    if (!isNaN(val) && val > 0) {
      adjustLife(val);
      setHealInput('');
    }
  };

  const adjustCounter = (type: string, delta: number) => {
    onAction('SET_PLAYER_COUNTER', { playerId: player.id, counterType: type, delta });
  };

  // Punto 6: Devolver comandante a la zona de comando
  const handleReturnCommanderToCommand = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const commanderCard =
      allBattlefieldCards?.find(c => c.isCommander && c.ownerId === player.id) ||
      zones.battlefield.find(c => c.isCommander) ||
      zones.graveyard.find(c => c.isCommander) ||
      zones.exile.find(c => c.isCommander) ||
      zones.hand.find(c => c.isCommander);

    if (commanderCard) {
      const fromZone = allBattlefieldCards?.some(c => c.instanceId === commanderCard.instanceId)
        ? 'battlefield'
        : zones.graveyard.some(c => c.instanceId === commanderCard.instanceId)
        ? 'graveyard'
        : zones.exile.some(c => c.instanceId === commanderCard.instanceId)
        ? 'exile'
        : zones.hand.some(c => c.instanceId === commanderCard.instanceId)
        ? 'hand'
        : 'battlefield';

      onAction('MOVE_CARD', {
        cardInstanceId: commanderCard.instanceId,
        fromZone,
        toZone: 'command',
        toPlayerId: player.id,
      });
    }
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
            data-testid="playmat-custom-btn"
            data-player-playmat-btn={player.id}
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
                  {/* Botones -1 y +1 (Punto 7: se eliminan los botones +-5) */}
                  <div className="grid grid-cols-2 gap-1 text-xs font-bold font-mono">
                    <button
                      data-testid="life-minus-1"
                      onClick={() => adjustLife(-1)}
                      className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      data-testid="life-plus-1"
                      onClick={() => adjustLife(1)}
                      className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      +1
                    </button>
                  </div>

                  {/* Punto 7: Dos inputs numéricos: 'Daño recibido' y 'Vida ganada' */}
                  <div className="flex flex-col space-y-1.5 pt-1.5 border-t border-slate-800">
                    <form onSubmit={handleDamageSubmit} className="flex flex-col space-y-0.5">
                      <label className="text-[10px] font-semibold text-rose-300">Daño recibido</label>
                      <div className="flex space-x-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Ej: 7"
                          value={damageInput}
                          aria-label="Daño recibido"
                          data-testid="damage-received-input"
                          onChange={e => setDamageInput(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleDamageSubmit(e);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg px-2 py-0.5 text-xs text-rose-200 font-mono focus:outline-none"
                        />
                        <button
                          type="submit"
                          data-testid="apply-damage-btn"
                          className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-rose-200 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          -
                        </button>
                      </div>
                    </form>

                    <form onSubmit={handleHealSubmit} className="flex flex-col space-y-0.5">
                      <label className="text-[10px] font-semibold text-emerald-300">Vida ganada</label>
                      <div className="flex space-x-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Ej: 3"
                          value={healInput}
                          aria-label="Vida ganada"
                          data-testid="life-gained-input"
                          onChange={e => setHealInput(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleHealSubmit(e);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-0.5 text-xs text-emerald-200 font-mono focus:outline-none"
                        />
                        <button
                          type="submit"
                          data-testid="apply-heal-btn"
                          className="px-2 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Counter Badges Menu (Punto 6: se eliminan controles de tax de la pastilla de vida para evitar duplicidad) */}
                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg text-[10px]">
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <Skull className="w-2.5 h-2.5" />
                      <span>Veneno: {player.counters.poison}</span>
                    </span>
                    <div className="flex space-x-1">
                      <button onClick={() => adjustCounter('poison', -1)} className="hover:text-white px-1 font-bold">-</button>
                      <button onClick={() => adjustCounter('poison', 1)} className="hover:text-white px-1 font-bold">+</button>
                    </div>
                  </div>
                </div>
              </Portal>
            )}
          </div>
        </div>

        {/* 2. Zona de Comandante - Droppable para devolver al comandante (Punto 6) */}
        <div
          ref={isLocalPlayer ? setCommandDropRef : undefined}
          data-dock-zone="command"
          data-is-over={isCommandOver ? 'true' : 'false'}
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
          }}
          className={`rounded-lg overflow-hidden border shadow-lg bg-slate-950 flex flex-col items-center justify-center relative flex-shrink-0 pointer-events-auto z-20 transition-all ${
            isCommandOver ? 'ring-2 ring-amber-400 bg-amber-950/40 border-amber-400 scale-[1.03]' : 'border-slate-800'
          }`}
          title={`Zona de Comando (${zones.command.length} cartas)`}
        >
          {/* Badge interactivo con impuesto de comandante +/-2 (Punto 6) */}
          <div
            data-testid="commander-tax-badge"
            className="absolute top-1 inset-x-1 z-30 flex items-center justify-between bg-slate-950/90 border border-amber-500/60 rounded px-1 py-0.5 shadow backdrop-blur-xs select-none pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-[9px] font-black text-amber-400 tracking-tight font-mono">
              Tax: +{player.counters.commanderTax ?? 0}
            </span>
            {isLocalPlayer && (
              <div className="flex items-center space-x-0.5 ml-1">
                <button
                  data-testid="commander-tax-minus"
                  onClick={e => {
                    e.stopPropagation();
                    adjustCounter('commanderTax', -2);
                  }}
                  disabled={(player.counters.commanderTax ?? 0) <= 0}
                  className="w-3.5 h-3.5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-amber-300 font-bold text-[9px] rounded transition-colors cursor-pointer"
                  title="Restar 2 al impuesto de comandante"
                >
                  -
                </button>
                <button
                  data-testid="commander-tax-plus"
                  onClick={e => {
                    e.stopPropagation();
                    adjustCounter('commanderTax', 2);
                  }}
                  className="w-3.5 h-3.5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[9px] rounded transition-colors cursor-pointer"
                  title="Sumar 2 al impuesto de comandante"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {zones.command.length > 0 ? (
            <DraggableCommanderCard
              card={zones.command[0]}
              isLocalPlayer={isLocalPlayer}
              onClick={() => setActivePileModal('command')}
            />
          ) : (
            <div
              className="w-full h-full border-2 border-dashed border-amber-600/40 rounded-lg flex flex-col items-center justify-center p-1 text-center bg-amber-950/10 relative"
            >
              <div className="mt-5 flex flex-col items-center">
                <span className="text-[8px] text-slate-500 mb-0.5">(En campo)</span>
                {isLocalPlayer && (
                  <button
                    data-testid="return-to-command-btn"
                    onClick={handleReturnCommanderToCommand}
                    className="px-1.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-tight rounded shadow hover:shadow-md transition-all active:scale-95 cursor-pointer leading-tight text-center z-20"
                    title="Devolver al comandante a la zona de comando (+2 Tax)"
                  >
                    Devolver al comando
                  </button>
                )}
              </div>
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
            cards={roomState?.status === 'mulligan' ? [] : zones.hand}
            handCount={roomState?.status === 'mulligan' ? 0 : player.handCount}
            isLocalPlayer={isLocalPlayer}
            localPlayerId={localPlayerId}
            roomState={roomState}
            allBattlefieldCards={allBattlefieldCards}
            onAction={onAction}
            onZoomCard={card => setZoomedCard(card)}
          />
        </div>

        {/* 4. Biblioteca - Dorso del tamaño de una carta con contador encima (Punto 5c: Arrastrable y Click para robar) */}
        <div
          ref={setLibDropRef}
          data-dock-zone="library"
          data-pile-zone="library"
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

      {/* Pile Modal Inspector (Punto 8) */}
      {activePileModal && (
        <Portal>
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActivePileModal(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${
                activePileModal === 'library' ? 'max-w-2xl' : 'max-w-lg'
              } max-h-[80vh] flex flex-col shadow-2xl overflow-hidden`}
            >
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="font-bold text-sm text-white capitalize">
                    {activePileModal === 'command'
                      ? 'Zona de Comando'
                      : activePileModal === 'graveyard'
                      ? 'Cementerio'
                      : activePileModal === 'exile'
                      ? 'Exilio'
                      : 'Biblioteca'}{' '}
                    (
                    {activePileModal === 'library' && (librarySearchQuery || libraryTypeFilter)
                      ? `${filteredModalCards.length} / ${zones[activePileModal]?.length || 0}`
                      : zones[activePileModal]?.length || 0}
                    )
                  </h3>
                  {/* Indicador de sincronización con Scryfall (Punto 8) */}
                  {activePileModal === 'library' && syncQueueCount > 0 && (
                    <div
                      data-testid="scryfall-sync-indicator"
                      className="flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded-full animate-pulse shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      <span>Sincronizando cartas... ({syncQueueCount} en cola)</span>
                    </div>
                  )}
                  {/* Indicador de cola y progreso de carga de imágenes (Punto 4) */}
                  {activePileModal === 'library' && (
                    <div className="flex items-center space-x-2">
                      {imageStats.inFlight + imageStats.pending > 0 ? (
                        <div
                          data-testid="image-queue-progress"
                          className="flex items-center space-x-1.5 text-[11px] text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2.5 py-0.5 rounded-full animate-pulse shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span className="font-mono font-medium">
                            Cargando {imageStats.loaded} de {imageStats.total || zones.library.length}
                          </span>
                        </div>
                      ) : imageStats.loaded > 0 ? (
                        <div
                          data-testid="image-queue-complete"
                          className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Imágenes listas ({imageStats.loaded}/{imageStats.total || zones.library.length})</span>
                        </div>
                      ) : null}

                      {imageStats.failed > 0 && (
                        <button
                          type="button"
                          data-testid="image-queue-retry-btn"
                          onClick={() => imageLoaderQueue.retryFailed()}
                          className="flex items-center space-x-1 text-[11px] text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-colors shadow-sm"
                          title="Reintentar carga de imágenes fallidas"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Reintentar {imageStats.failed} fallida{imageStats.failed > 1 ? 's' : ''}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  data-testid="close-pile-modal-btn"
                  onClick={() => setActivePileModal(null)}
                  className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Barra de búsqueda y filtros rápidos por tipo (solo en Biblioteca, Punto 8) */}
              {activePileModal === 'library' && (
                <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-col space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      aria-label="Buscar por nombre"
                      value={librarySearchQuery}
                      onChange={e => setLibrarySearchQuery(e.target.value)}
                      data-testid="library-search-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
                    />
                    {librarySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLibrarySearchQuery('')}
                        className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs cursor-pointer px-1 py-0.5"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLibraryTypeFilter(null)}
                      className={`px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                        libraryTypeFilter === null
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                    {CARD_TYPE_FILTERS.map(type => {
                      const isSelected = libraryTypeFilter === type;
                      const testId = `filter-${type
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')}`;
                      return (
                        <button
                          key={type}
                          type="button"
                          data-testid={testId}
                          onClick={() => setLibraryTypeFilter(isSelected ? null : type)}
                          className={`px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activePileModal === 'library' ? (
                <VirtualizedCardGrid
                  items={filteredModalCards}
                  emptyMessage={
                    librarySearchQuery || libraryTypeFilter
                      ? 'No se encontraron cartas con los filtros seleccionados'
                      : 'Esta zona está vacía'
                  }
                  renderItem={(card) => (
                    <ModalCardItem
                      key={card.instanceId}
                      card={card}
                      zone={activePileModal}
                      onAction={onAction}
                      localPlayerId={localPlayerId}
                      roomState={roomState}
                      allBattlefieldCards={allBattlefieldCards}
                      onCloseModal={() => setActivePileModal(null)}
                    />
                  )}
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filteredModalCards.map((card, i) => (
                    <ModalCardItem
                      key={card.instanceId || i}
                      card={card}
                      zone={activePileModal}
                      onAction={onAction}
                      localPlayerId={localPlayerId}
                      roomState={roomState}
                      allBattlefieldCards={allBattlefieldCards}
                      onCloseModal={() => setActivePileModal(null)}
                    />
                  ))}
                  {filteredModalCards.length === 0 && (
                    <div className="col-span-full text-center py-8 text-slate-500 text-xs italic">
                      Esta zona está vacía
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Playmat Selector Modal (REQ-22.3, REQ-18, Punto 7) */}
      {isPlaymatModalOpen && (
        <Portal>
          <div
            data-testid="playmat-modal-overlay"
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
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
                  data-testid="close-playmat-modal-btn"
                  onClick={() => setIsPlaymatModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Vista previa del playmat y Atribución (Punto 7) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Fondo del Playmat
                </span>
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group">
                  {previewPlaymatUrl ? (
                    <>
                      <img
                        src={previewPlaymatUrl}
                        alt="Playmat actual"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                      Sin imagen
                    </div>
                  )}

                  {/* Atribución mientras se use art_crop como fondo (Punto 7) */}
                  {isUsingArtCrop && (
                    <div
                      data-testid="playmat-attribution-box"
                      className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800/80 text-[11px] shadow-lg"
                    >
                      <div className="min-w-0 pr-2">
                        <div
                          data-testid="playmat-artist"
                          className="font-bold text-amber-300 truncate flex items-center space-x-1"
                          title={playmatArtist}
                        >
                          <User className="w-3 h-3 text-amber-400 flex-shrink-0 inline mr-1" />
                          <span>Ilustrado por {playmatArtist}</span>
                        </div>
                        <div
                          data-testid="playmat-copyright"
                          className="text-[9px] text-slate-400 truncate mt-0.5"
                        >
                          {playmatCopyright}
                        </div>
                      </div>

                      {activePlaymatCard && (
                        <button
                          type="button"
                          data-testid="playmat-view-card-btn"
                          onClick={() => openCardDetails(activePlaymatCard)}
                          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex-shrink-0 shadow"
                          title="Ver detalles de la carta (Oracle, Dictámenes, etc.)"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ver carta</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL de imagen / Art Crop (Scryfall o enlace directo)
                </label>
                <input
                  type="url"
                  data-testid="playmat-url-input"
                  value={customPlaymatInput}
                  onChange={e => setCustomPlaymatInput(e.target.value)}
                  placeholder="https://cards.scryfall.io/art_crop/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              {/* Botón para restablecer al Comandante si hay uno */}
              {player.selectedDeck?.commanderImageUrl && (
                <button
                  type="button"
                  data-testid="playmat-reset-commander-btn"
                  onClick={() => {
                    const cmdUrl = toArtCropUrl(player.selectedDeck?.commanderImageUrl);
                    onAction('SET_PLAYMAT', { playmatUrl: cmdUrl });
                    setCustomPlaymatInput('');
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer inline-block"
                >
                  Restablecer a arte del Comandante ({player.selectedDeck.commanderName})
                </button>
              )}

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  data-testid="playmat-cancel-btn"
                  onClick={() => setIsPlaymatModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="playmat-save-btn"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer"
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
