import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { toArtCropUrl, inferCardTypeLine } from '@mtgc/shared';
import type {
  PlayerState,
  GameActionType,
  CardInstance,
  CardDefinition,
  RoomState,
} from '@mtgc/shared';
import {
  Heart,
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
import { LibraryContextMenu } from './LibraryContextMenu';
import { LibraryRevealModal } from './LibraryRevealModal';
import { CreateTokenModal } from './CreateTokenModal';
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
  const { showPreview, hidePreview, openCardDetails } = useCardPreview();
  const [enrichedDefinition, setEnrichedDefinition] = useState<CardDefinition>(card.definition);

  useEffect(() => {
    setEnrichedDefinition(card.definition);
  }, [card.definition]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card: { ...card, definition: enrichedDefinition }, fromZone: 'command' },
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
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        openCardDetails(enrichedDefinition);
      }}
      onMouseEnter={e => !card.isFaceDown && !isDragging && showPreview(enrichedDefinition, e)}
      onMouseLeave={hidePreview}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-0' : ''
      }`}
    >
      <CardDisplay card={enrichedDefinition} allowFaceToggle={false} />
      <div className="absolute bottom-0 inset-x-0 bg-[#040d0f]/90 text-[8px] font-black text-[#8BBB92] text-center py-0.5 tracking-wider uppercase backdrop-blur-xs pointer-events-none">
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
  isTopRevealed?: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}> = ({ card, isLocalPlayer, count, isTopRevealed = false, onClick, onContextMenu }) => {
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
      onContextMenu={e => {
        if (onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e);
        }
      }}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-0' : ''
      }`}
    >
      {isTopRevealed && card?.definition ? (
        <div className="w-full h-full relative overflow-hidden rounded-[6px]">
          <CardDisplay card={card.definition} isFaceDown={false} size="small" />
          <div className="absolute top-1 left-1 bg-[#092328]/90 border border-[#12544F] text-[#8BBB92] px-1 py-0.2 rounded text-[8px] font-black uppercase flex items-center space-x-0.5 shadow pointer-events-none">
            <Eye className="w-2.5 h-2.5 text-[#8BBB92]" />
            <span>Revelada</span>
          </div>
          <div className="absolute bottom-1 right-1 bg-[#040d0f]/90 border border-[#12544F] text-white px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow pointer-events-none">
            {count}
          </div>
        </div>
      ) : (
        <>
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
            <span className="text-[8px] font-black tracking-wider text-[#8BBB92] uppercase drop-shadow">
              BIBLIOTECA
            </span>
          </div>
        </>
      )}
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
      onMouseEnter={e =>
        card?.definition && !card.isFaceDown && !isDragging && showPreview(card.definition, e)
      }
      onMouseLeave={hidePreview}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-md border border-[#12544F] bg-[#092328] ${isDragging ? 'opacity-0' : ''}`}
    >
      <CardDisplay card={card.definition} allowFaceToggle={false} />
      {/* Overlay Badge con Nombre de Pila y Conteo (Punto 7) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#040d0f]/90 via-[#040d0f]/40 to-transparent flex flex-col items-center justify-end p-0.5 pointer-events-none">
        <span
          className={`text-[7px] font-black tracking-tight uppercase ${isGraveyard ? 'text-zinc-300' : 'text-[#8BBB92]'}`}
        >
          {isGraveyard ? 'CEMENTERIO' : 'EXILIO'}
        </span>
        <span className="text-[11px] font-mono font-black leading-none drop-shadow text-[#8BBB92]">
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
      onMouseEnter={e => showPreview(card.definition, e)}
      onMouseLeave={hidePreview}
      className="space-y-1 relative group cursor-context-menu"
      title="Clic derecho para opciones (Enviar a la mano, Enviar al campo)"
    >
      <div className="aspect-[146/204] rounded-lg overflow-hidden border border-[#12544F] bg-[#040d0f] group-hover:border-[#8BBB92] transition-colors shadow">
        <CardDisplay card={card.definition} size={zone === 'library' ? 'small' : 'normal'} />
      </div>
      <div
        className="text-[10px] font-bold text-zinc-300 group-hover:text-white truncate transition-colors"
        title={card.definition.name}
      >
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
  activeTargetingSourceId?: string | null;
  onTargetPlayer?: (playerId: string) => void;
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
  activeTargetingSourceId,
  onTargetPlayer,
}) => {
  const { openCardDetails } = useCardPreview();
  const [showLifeControls, setShowLifeControls] = useState(false);
  const [damageInput, setDamageInput] = useState('');
  const [healInput, setHealInput] = useState('');
  const [libraryContextMenuPos, setLibraryContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isTopRevealedToMe, setIsTopRevealedToMe] = useState(false);
  const [revealModalState, setRevealModalState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    cards: CardInstance[];
  }>({ isOpen: false, title: '', subtitle: '', cards: [] });
  const [activePileModal, setActivePileModal] = useState<
    'graveyard' | 'exile' | 'command' | 'library' | null
  >(null);
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
      // 1. Filtrar por nombre en inglés canónico
      if (librarySearchQuery.trim()) {
        const q = librarySearchQuery.trim().toLowerCase();
        const enName = (card.definition?.name || '').toLowerCase();
        if (!enName.includes(q)) return false;
      }
      // 2. Filtrar por type_line canónico en inglés (Punto 9 - REQ-B.9)
      //    Una carta con varios tipos aparece en todos los que le correspondan.
      //    Siempre comparar contra el typeLine inglés de la DB (campo canónico) con fallback de inferencia.
      if (libraryTypeFilter) {
        const rawTypeLine = card.definition?.typeLine || '';
        const effectiveTypeLine = (
          rawTypeLine && rawTypeLine !== 'Card' && rawTypeLine !== 'Carta'
            ? rawTypeLine
            : inferCardTypeLine(card.definition?.name, rawTypeLine)
        ).toLowerCase();

        // Normalizar filtro quitando acentos y mayúsculas
        const normFilter = libraryTypeFilter
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        if (normFilter === 'criaturas' || normFilter === 'creatures') {
          if (!effectiveTypeLine.includes('creature')) return false;
        } else if (normFilter === 'instantaneos' || normFilter === 'instants') {
          if (!effectiveTypeLine.includes('instant')) return false;
        } else if (normFilter === 'conjuros' || normFilter === 'sorceries') {
          if (!effectiveTypeLine.includes('sorcery')) return false;
        } else if (normFilter === 'artefactos' || normFilter === 'artifacts') {
          if (!effectiveTypeLine.includes('artifact')) return false;
        } else if (normFilter === 'encantamientos' || normFilter === 'enchantments') {
          if (!effectiveTypeLine.includes('enchantment')) return false;
        } else if (normFilter === 'tierras' || normFilter === 'lands') {
          if (!effectiveTypeLine.includes('land')) return false;
        } else if (normFilter === 'planeswalkers') {
          if (!effectiveTypeLine.includes('planeswalker')) return false;
        }
      }
      return true;
    });
  }, [zones, activePileModal, librarySearchQuery, libraryTypeFilter]);
  const [isPlaymatModalOpen, setIsPlaymatModalOpen] = useState(false);
  const [customPlaymatInput, setCustomPlaymatInput] = useState('');
  const [isCreateTokenModalOpen, setIsCreateTokenModalOpen] = useState(false);
  const [zoomedCard, setZoomedCard] = useState<CardInstance | null>(null);

  // Cerrar modal de inspección de pila con tecla Escape
  useEffect(() => {
    if (!activePileModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePileModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePileModal]);

  const handleCellContextMenu = (e: React.MouseEvent) => {
    if (!isLocalPlayer) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[data-modal-card-item]') ||
      target.closest('[data-player-dock]') ||
      target.closest('[data-dock-zone]') ||
      target.closest('[data-portal-root]') ||
      target.closest('[data-player-header]')
    ) {
      return;
    }
    e.preventDefault();
    setIsCreateTokenModalOpen(true);
  };

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
  const playmatImage = toArtCropUrl(player.playmatUrl || player.selectedDeck?.commanderImageUrl);
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
      Boolean(activePlaymatCard)),
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
      onContextMenu={handleCellContextMenu}
      onPointerDown={e => {
        if (activeTargetingSourceId && onTargetPlayer && !isLocalPlayer) {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-battlefield-card], button, input, [data-dock-zone]')) {
            e.stopPropagation();
            onTargetPlayer(player.id);
          }
        }
      }}
      style={{ containerType: 'size' } as React.CSSProperties}
      className={`relative w-full h-full transition-all duration-200 select-none ${
        isActiveTurn
          ? 'ring-2 ring-inset ring-[#8BBB92]/90 shadow-[inset_0_0_60px_rgba(42,131,95,0.25)]'
          : 'ring-1 ring-inset ring-[#12544F]/60'
      }`}
    >
      {/* Indicador de acento superior para el turno activo (alto contraste) */}
      {isActiveTurn && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#2A835F] via-[#8BBB92] to-[#2A835F] shadow-lg shadow-[#8BBB92]/60 z-30 pointer-events-none animate-pulse" />
      )}

      {/* 1. PlaymatBackground (REQ-22.3) - Cubre el 100% de la división, incluida la zona bajo el dock */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#040d0f]">
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
            <div className="absolute inset-0 bg-gradient-to-b from-[#040d0f]/85 via-[#040d0f]/40 to-[#040d0f]/90" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#092328] via-[#040d0f] to-[#092328]" />
        )}
      </div>

      {/* 2. Top Header: Un solo contenedor con "Nombre [botón expandir]" centrado arriba (Punto 8) */}
      <div
        data-player-header={player.id}
        data-name-tag={player.id}
        onPointerDown={e => {
          if (activeTargetingSourceId && onTargetPlayer) {
            e.stopPropagation();
            onTargetPlayer(player.id);
          }
        }}
        onClick={e => {
          if (activeTargetingSourceId && onTargetPlayer) {
            e.stopPropagation();
            onTargetPlayer(player.id);
          }
        }}
        className={`absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 px-3.5 py-1 rounded-xl backdrop-blur-xl border text-xs font-sans font-bold transition-all shadow-xl select-none pointer-events-auto ring-1 ring-white/5 ${
          activeTargetingSourceId
            ? 'ring-2 ring-[#8BBB92] bg-[#2A835F] text-white animate-pulse cursor-crosshair shadow-[0_0_15px_rgba(139,187,146,0.6)]'
            : isActiveTurn
              ? 'bg-[#2A835F] text-white border-[#8BBB92] shadow-lg shadow-[#2A835F]/40 ring-2 ring-[#8BBB92]/50 tracking-wide'
              : isLocalPlayer
                ? 'bg-[#092328]/95 text-[#8BBB92] border-[#12544F] ring-1 ring-[#2A835F]/30'
                : 'bg-[#092328]/95 text-zinc-200 border-[#12544F]/80 hover:border-[#12544F]'
        }`}
      >
        <span
          className={`whitespace-nowrap max-w-[clamp(120px,25cqw,280px)] truncate ${
            !player.isConnected ? 'opacity-40 text-zinc-500 line-through' : ''
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
                ? 'text-white hover:bg-white/20'
                : 'text-zinc-400 hover:text-white hover:bg-[#12544F]'
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
            className="p-1 bg-[#092328]/90 hover:bg-[#0c2d32] border border-[#12544F] rounded-lg text-[#8BBB92] hover:text-white transition-colors cursor-pointer shadow-sm"
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
        <div
          data-dock-zone="identity"
          className="flex flex-col items-start space-y-1 flex-shrink-0 pointer-events-none"
        >
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
              className={`flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-[border-color,background-color,box-shadow,transform] duration-200 cursor-pointer active:scale-95 ring-1 ring-white/5 ${
                player.life <= 0
                  ? 'bg-rose-950/90 border-rose-600 text-rose-300 ring-2 ring-rose-500/30 shadow-rose-900/40'
                  : player.life <= 10
                    ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-amber-900/30'
                    : 'bg-[#092328]/95 border-[#12544F] text-zinc-100 hover:border-[#8BBB92] shadow-black/80'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  player.life <= 10
                    ? 'text-rose-500 fill-rose-500 animate-pulse'
                    : 'text-rose-400 fill-rose-400/20'
                }`}
              />
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none tabular-nums">
                {player.life}
              </span>
            </button>

            {/* Quick Life Modifiers Popover via Portal (REQ-22.5) */}
            {showLifeControls && lifePopoverPos && (
              <Portal>
                {/* Invisible overlay for click-outside */}
                <div
                  data-life-backdrop="true"
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
                  onClick={() => setShowLifeControls(false)}
                />
                <div
                  style={{ top: `${lifePopoverPos.top}px`, left: `${lifePopoverPos.left}px` }}
                  className="fixed z-50 bg-[#092328] border border-[#12544F] rounded-2xl shadow-2xl p-3 flex flex-col space-y-2.5 w-52 backdrop-blur-xl animate-in fade-in zoom-in-95 ring-1 ring-[#2A835F]/30"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Botones -1 y +1 (Punto 7: se eliminan los botones +-5) */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-bold font-mono">
                    <button
                      data-testid="life-minus-1"
                      onClick={() => adjustLife(-1)}
                      className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      data-testid="life-plus-1"
                      onClick={() => adjustLife(1)}
                      className="bg-[#12544F] hover:bg-[#2A835F] border border-[#2A835F] text-[#8BBB92] hover:text-white py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      +1
                    </button>
                  </div>

                  {/* Punto 7: Dos inputs numéricos: 'Daño recibido' y 'Vida ganada' */}
                  <div className="flex flex-col space-y-2 pt-2 border-t border-[#12544F]">
                    <form onSubmit={handleDamageSubmit} className="flex flex-col space-y-1">
                      <label className="text-[10px] font-semibold text-rose-300">
                        Daño recibido
                      </label>
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
                          className="w-full bg-[#040d0f] border border-[#12544F] focus:border-rose-500 rounded-lg px-2 py-0.5 text-xs text-rose-200 font-mono focus:outline-none"
                        />
                        <button
                          type="submit"
                          data-testid="apply-damage-btn"
                          className="px-2.5 py-0.5 bg-rose-900 hover:bg-rose-800 text-rose-100 font-bold text-xs rounded-lg cursor-pointer transition-colors"
                        >
                          -
                        </button>
                      </div>
                    </form>

                    <form onSubmit={handleHealSubmit} className="flex flex-col space-y-1">
                      <label className="text-[10px] font-semibold text-[#8BBB92]">
                        Vida ganada
                      </label>
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
                          className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-lg px-2 py-0.5 text-xs text-[#8BBB92] font-mono focus:outline-none"
                        />
                        <button
                          type="submit"
                          data-testid="apply-heal-btn"
                          className="px-2.5 py-0.5 bg-[#2A835F] hover:bg-[#349e73] text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Counter Badges Menu */}
                  <div className="pt-2 border-t border-[#12544F] flex items-center justify-between bg-[#040d0f] px-2 py-1.5 rounded-lg text-[10px]">
                    <span className="text-[#8BBB92] flex items-center space-x-1 font-medium">
                      <i className="ms ms-counter-skull text-xs flex-shrink-0" aria-hidden="true" />
                      <span>Veneno: {player.counters.poison}</span>
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => adjustCounter('poison', -1)}
                        className="hover:text-white px-1.5 py-0.5 font-bold cursor-pointer text-zinc-400 hover:bg-[#12544F] rounded transition-colors"
                      >
                        -
                      </button>
                      <button
                        onClick={() => adjustCounter('poison', 1)}
                        className="hover:text-white px-1.5 py-0.5 font-bold cursor-pointer text-zinc-400 hover:bg-[#12544F] rounded transition-colors"
                      >
                        +
                      </button>
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
          className={`rounded-lg overflow-hidden border shadow-lg bg-[#092328] flex flex-col items-center justify-center relative flex-shrink-0 pointer-events-auto z-20 transition-all ${
            isCommandOver
              ? 'ring-2 ring-[#8BBB92] bg-[#12544F]/50 border-[#8BBB92] scale-[1.03]'
              : 'border-[#12544F] hover:border-[#8BBB92]'
          }`}
          title={`Zona de Comando (${zones.command.length} cartas)`}
        >
          {/* Badge interactivo con impuesto de comandante +/-2 (Punto 6) */}
          <div
            data-testid="commander-tax-badge"
            className="absolute top-1 inset-x-1 z-30 flex items-center justify-between bg-[#092328]/95 border border-[#12544F] rounded px-1.5 py-0.5 shadow backdrop-blur-md select-none pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-[9px] font-black text-[#8BBB92] tracking-tight font-mono">
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
                  className="w-3.5 h-3.5 flex items-center justify-center bg-[#0c2d32] hover:bg-[#12544F] disabled:opacity-30 disabled:hover:bg-[#0c2d32] text-[#8BBB92] font-bold text-[9px] rounded transition-colors cursor-pointer"
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
                  className="w-3.5 h-3.5 flex items-center justify-center bg-[#0c2d32] hover:bg-[#12544F] text-[#8BBB92] font-bold text-[9px] rounded transition-colors cursor-pointer"
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
            <div className="w-full h-full border-2 border-dashed border-[#12544F] rounded-lg flex flex-col items-center justify-center p-1 text-center bg-[#092328]/30 relative">
              <div className="mt-5 flex flex-col items-center">
                <span className="text-[8px] text-zinc-500 mb-0.5">(En campo)</span>
                {isLocalPlayer && (
                  <button
                    data-testid="return-to-command-btn"
                    onClick={handleReturnCommanderToCommand}
                    className="px-1.5 py-1 bg-[#2A835F] hover:bg-[#349e73] text-white font-bold text-[9px] uppercase tracking-tight rounded shadow hover:shadow-md transition-all active:scale-95 cursor-pointer leading-tight text-center z-20"
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
              ? 'ring-2 ring-[#8BBB92] bg-[#2A835F]/20 shadow-[0_0_30px_rgba(42,131,95,0.35)] border border-[#8BBB92]'
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

        {/* 4. Biblioteca - Dorso del tamaño de una carta con contador encima (Punto 5c: Arrastrable, Click para robar, Clic derecho menú contextual) */}
        <div
          ref={setLibDropRef}
          data-dock-zone="library"
          data-pile-zone="library"
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
          }}
          onContextMenu={e => {
            e.preventDefault();
            e.stopPropagation();
            if (isLocalPlayer) {
              setLibraryContextMenuPos({ x: e.clientX, y: e.clientY });
            }
          }}
          className={`rounded-lg overflow-hidden border shadow-lg relative flex flex-col items-center justify-center flex-shrink-0 pointer-events-auto transition-all z-20 ${
            isLibOver
              ? 'ring-4 ring-[#8BBB92] scale-110 shadow-2xl shadow-[#2A835F]/60 z-30'
              : isLocalPlayer
                ? 'cursor-pointer hover:scale-105 active:scale-95 border-[#12544F] hover:border-[#8BBB92]'
                : 'border-[#12544F]'
          }`}
          title={
            isLocalPlayer
              ? 'Click para robar de la Biblioteca, clic derecho para menú contextual, o arrastra al campo o mano'
              : 'Biblioteca'
          }
        >
          <DraggableLibraryCard
            card={zones.library[0]}
            isLocalPlayer={isLocalPlayer}
            count={zones.library.length || player.libraryCount}
            isTopRevealed={isTopRevealedToMe || zones.library[0]?.revealedTo === 'all'}
            onClick={() =>
              isLocalPlayer && onAction('DRAW_CARDS', { playerId: player.id, count: 1 })
            }
            onContextMenu={e => {
              if (isLocalPlayer) {
                setLibraryContextMenuPos({ x: e.clientX, y: e.clientY });
              }
            }}
          />
          {isLocalPlayer && (
            <button
              data-library-inspect-btn="true"
              onClick={e => {
                e.stopPropagation();
                setActivePileModal('library');
              }}
              className="absolute top-1 right-1 p-1 bg-[#092328]/90 hover:bg-[#2A835F] hover:text-white text-zinc-300 rounded-md border border-[#12544F] shadow transition-colors cursor-pointer z-10"
              title="Ver contenido de la biblioteca (solo tú)"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Library Context Menu for Local Player */}
        {libraryContextMenuPos && isLocalPlayer && (
          <LibraryContextMenu
            position={libraryContextMenuPos}
            onClose={() => setLibraryContextMenuPos(null)}
            libraryCards={zones.library}
            localPlayerId={localPlayerId}
            roomState={roomState}
            onAction={onAction}
            onOpenInspectModal={() => setActivePileModal('library')}
            onOpenRevealModal={(title, subtitle, cards) =>
              setRevealModalState({ isOpen: true, title, subtitle, cards })
            }
            isTopRevealedToMe={isTopRevealedToMe}
            onToggleTopRevealedToMe={val => setIsTopRevealedToMe(val)}
          />
        )}

        {/* Library Reveal Modal */}
        <LibraryRevealModal
          isOpen={revealModalState.isOpen}
          onClose={() => setRevealModalState({ isOpen: false, title: '', subtitle: '', cards: [] })}
          title={revealModalState.title}
          subtitle={revealModalState.subtitle}
          cards={revealModalState.cards}
          onAction={onAction}
          localPlayerId={localPlayerId}
        />

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
            data-pile-zone="graveyard"
            className={`flex-1 rounded-md overflow-hidden border border-[#12544F] bg-[#092328]/90 shadow flex flex-col items-center justify-center cursor-pointer hover:border-[#8BBB92] active:scale-95 transition-all relative ${
              isGydOver
                ? 'ring-4 ring-[#8BBB92] scale-105 bg-[#12544F] shadow-xl'
                : zones.graveyard.length > 0
                  ? 'bg-[#092328]/95'
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
                <span className="text-[7px] font-sans font-bold text-zinc-400 uppercase tracking-wider">
                  CEMENTERIO
                </span>
                <span className="text-[11px] font-mono font-black text-[#8BBB92] leading-tight">
                  0
                </span>
              </div>
            )}
          </div>

          {/* Exilio (Mitad Inferior - Droppable y Arrastrable, Punto 7) */}
          <div
            ref={setExileDropRef}
            data-pile-zone="exile"
            className={`flex-1 rounded-md overflow-hidden border border-[#12544F] bg-[#092328]/90 shadow flex flex-col items-center justify-center cursor-pointer hover:border-[#8BBB92] active:scale-95 transition-all relative ${
              isExileOver
                ? 'ring-4 ring-[#8BBB92] scale-105 bg-[#12544F] shadow-xl'
                : zones.exile.length > 0
                  ? 'bg-[#092328]/95 border-[#12544F]'
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
                <span className="text-[7px] font-sans font-bold text-zinc-400 uppercase tracking-wider">
                  EXILIO
                </span>
                <span className="text-[11px] font-mono font-black text-[#8BBB92] leading-tight">
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
            data-testid="pile-viewer-modal"
            data-active-pile={activePileModal}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setActivePileModal(null)}
            onDoubleClick={e => {
              e.stopPropagation();
              setActivePileModal(null);
            }}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onContextMenu={e => e.stopPropagation()}
          >
            <div
              onClick={e => e.stopPropagation()}
              onDoubleClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onContextMenu={e => e.stopPropagation()}
              className={`bg-[#092328] border border-[#12544F] rounded-2xl w-full ${
                activePileModal === 'library' ? 'max-w-2xl' : 'max-w-lg'
              } max-h-[80vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-[#2A835F]/30 animate-in fade-in zoom-in-95`}
            >
              <div className="px-5 py-3 border-b border-[#12544F] flex items-center justify-between bg-[#040d0f]/90">
                <div className="flex items-center space-x-3">
                  <h3 className="font-sans font-bold text-sm text-[#8BBB92] capitalize tracking-wide">
                    {activePileModal === 'command'
                      ? 'Zona de Comando'
                      : activePileModal === 'graveyard'
                        ? 'Cementerio'
                        : activePileModal === 'exile'
                          ? 'Exilio'
                          : 'Biblioteca'}{' '}
                    <span className="font-mono text-zinc-400 font-normal text-xs">
                      (
                      {activePileModal === 'library' && (librarySearchQuery || libraryTypeFilter)
                        ? `${filteredModalCards.length} / ${zones[activePileModal]?.length || 0}`
                        : zones[activePileModal]?.length || 0}
                      )
                    </span>
                  </h3>
                  {/* Indicador de sincronización con Scryfall (Punto 8) */}
                  {activePileModal === 'library' && syncQueueCount > 0 && (
                    <div
                      data-testid="scryfall-sync-indicator"
                      className="flex items-center space-x-1.5 text-xs text-[#8BBB92] bg-[#12544F]/40 border border-[#2A835F]/40 px-2 py-0.5 rounded-full animate-pulse shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8BBB92] animate-ping" />
                      <span>Sincronizando cartas... ({syncQueueCount} en cola)</span>
                    </div>
                  )}
                  {/* Indicador de cola y progreso de carga de imágenes (Punto 4) */}
                  {activePileModal === 'library' && (
                    <div className="flex items-center space-x-2">
                      {imageStats.inFlight + imageStats.pending > 0 ? (
                        <div
                          data-testid="image-queue-progress"
                          className="flex items-center space-x-1.5 text-[11px] text-[#8BBB92] bg-[#12544F]/40 border border-[#2A835F]/40 px-2.5 py-0.5 rounded-full animate-pulse shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8BBB92] animate-ping" />
                          <span className="font-mono font-medium">
                            Cargando {imageStats.loaded} de{' '}
                            {imageStats.total || zones.library.length}
                          </span>
                        </div>
                      ) : imageStats.loaded > 0 ? (
                        <div
                          data-testid="image-queue-complete"
                          className="text-[10px] text-[#8BBB92] bg-[#12544F]/60 border border-[#2A835F]/60 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8BBB92]" />
                          <span>
                            Imágenes listas ({imageStats.loaded}/
                            {imageStats.total || zones.library.length})
                          </span>
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
                          <span>
                            Reintentar {imageStats.failed} fallida{imageStats.failed > 1 ? 's' : ''}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  data-testid="close-pile-modal-btn"
                  onClick={() => setActivePileModal(null)}
                  className="text-zinc-400 hover:text-white font-bold text-lg cursor-pointer transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Barra de búsqueda y filtros rápidos por tipo (solo en Biblioteca, Punto 8) */}
              {activePileModal === 'library' && (
                <div className="px-5 py-2.5 bg-[#040d0f]/80 border-b border-[#12544F] flex flex-col space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      aria-label="Buscar por nombre"
                      value={librarySearchQuery}
                      onChange={e => setLibrarySearchQuery(e.target.value)}
                      data-testid="library-search-input"
                      className="w-full bg-[#040d0f] border border-[#12544F] rounded-xl pl-9 pr-8 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#2A835F] font-sans transition-colors"
                    />
                    {librarySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLibrarySearchQuery('')}
                        className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-white text-xs cursor-pointer px-1 py-0.5"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLibraryTypeFilter(null)}
                      className={`px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                        libraryTypeFilter === null
                          ? 'bg-[#2A835F] text-white border-[#8BBB92] shadow-sm font-bold'
                          : 'bg-[#0c2d32] text-zinc-300 border-[#12544F] hover:text-white hover:border-[#2A835F]'
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
                          className={`px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#2A835F] text-white font-bold border-[#8BBB92] shadow-md shadow-[#2A835F]/30'
                              : 'bg-[#0c2d32] text-zinc-300 border-[#12544F] hover:border-[#2A835F] hover:text-white'
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
                  renderItem={card => (
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
                    <div className="col-span-full text-center py-16 text-zinc-400 text-xs italic">
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsPlaymatModalOpen(false)}
            onDoubleClick={e => {
              e.stopPropagation();
              setIsPlaymatModalOpen(false);
            }}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onContextMenu={e => e.stopPropagation()}
          >
            <form
              onSubmit={handleSavePlaymat}
              onClick={e => e.stopPropagation()}
              onDoubleClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onContextMenu={e => e.stopPropagation()}
              className="bg-[#092328] border border-[#12544F] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#12544F] pb-2">
                <h3 className="font-bold text-sm text-[#8BBB92] flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-[#8BBB92]" />
                  <span>Personalizar Playmat</span>
                </h3>
                <button
                  type="button"
                  data-testid="close-playmat-modal-btn"
                  onClick={() => setIsPlaymatModalOpen(false)}
                  className="text-zinc-400 hover:text-white font-bold p-1 rounded-lg hover:bg-[#12544F] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Vista previa del playmat y Atribución (Punto 7) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Fondo del Playmat
                </span>
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#12544F] bg-[#040d0f] shadow-inner group">
                  {previewPlaymatUrl ? (
                    <>
                      <img
                        src={previewPlaymatUrl}
                        alt="Playmat actual"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#040d0f]/90 via-[#040d0f]/30 to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                      Sin imagen
                    </div>
                  )}

                  {/* Atribución mientras se use art_crop como fondo (Punto 7) */}
                  {isUsingArtCrop && (
                    <div
                      data-testid="playmat-attribution-box"
                      className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto bg-[#040d0f]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-[#12544F] text-[11px] shadow-lg"
                    >
                      <div className="min-w-0 pr-2">
                        <div
                          data-testid="playmat-artist"
                          className="font-bold text-[#8BBB92] truncate flex items-center space-x-1"
                          title={playmatArtist}
                        >
                          <User className="w-3 h-3 text-[#8BBB92] flex-shrink-0 inline mr-1" />
                          <span>Ilustrado por {playmatArtist}</span>
                        </div>
                        <div
                          data-testid="playmat-copyright"
                          className="text-[9px] text-zinc-400 truncate mt-0.5"
                        >
                          {playmatCopyright}
                        </div>
                      </div>

                      {activePlaymatCard && (
                        <button
                          type="button"
                          data-testid="playmat-view-card-btn"
                          onClick={() => openCardDetails(activePlaymatCard)}
                          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#2A835F]/20 hover:bg-[#2A835F]/30 text-[#8BBB92] hover:text-white border border-[#2A835F]/40 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex-shrink-0 shadow"
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
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  URL de imagen / Art Crop (Scryfall o enlace directo)
                </label>
                <input
                  type="url"
                  data-testid="playmat-url-input"
                  value={customPlaymatInput}
                  onChange={e => setCustomPlaymatInput(e.target.value)}
                  placeholder="https://cards.scryfall.io/art_crop/..."
                  className="w-full bg-[#040d0f] border border-[#12544F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2A835F]"
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
                  className="text-[11px] text-[#8BBB92] hover:text-white font-bold underline cursor-pointer inline-block"
                >
                  Restablecer a arte del Comandante ({player.selectedDeck.commanderName})
                </button>
              )}

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  data-testid="playmat-cancel-btn"
                  onClick={() => setIsPlaymatModalOpen(false)}
                  className="flex-1 bg-[#0c2d32] hover:bg-[#12544F] text-white font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer border border-[#12544F]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="playmat-save-btn"
                  className="flex-1 bg-[#2A835F] hover:bg-[#349e73] text-white font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-[#2A835F]/20"
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-[#092328] border border-[#12544F] rounded-3xl max-w-sm w-full p-4 flex flex-col space-y-3 shadow-2xl overflow-hidden cursor-default ring-1 ring-[#2A835F]/30"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#12544F]">
                <span className="font-bold text-sm text-white truncate">
                  {zoomedCard.definition.name}
                </span>
                <button
                  onClick={() => setZoomedCard(null)}
                  className="text-zinc-400 hover:text-white font-bold text-lg"
                >
                  &times;
                </button>
              </div>
              <div className="aspect-[2.5/3.5] rounded-2xl overflow-hidden border border-[#12544F] shadow-xl">
                <CardDisplay card={zoomedCard.definition} allowFaceToggle={true} />
              </div>
              <div className="text-center text-xs text-zinc-400">
                {zoomedCard.definition.typeLine}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Modal Crear Fichas en espacio vacío de la división (Punto 4, B.4) */}
      <CreateTokenModal
        isOpen={isCreateTokenModalOpen}
        onClose={() => setIsCreateTokenModalOpen(false)}
        localPlayerId={player.id}
        roomState={roomState}
        onAction={onAction}
      />
    </div>
  );
};
