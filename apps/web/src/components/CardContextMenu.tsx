import React, { useState, useEffect, useRef } from 'react';
import type {
  CardInstance,
  CardDefinition,
  GameActionType,
  RoomState,
  ZoneType,
} from '@mtgc/shared';
import { Portal } from './Portal';
import {
  Play,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Share2,
  Users,
  User,
  ChevronRight,
  ChevronDown,
  Swords,
  Tag,
  Plus,
  X,
} from 'lucide-react';
import { MTG_KEYWORDS, MTG_COUNTERS } from '@mtgc/shared';
import {
  MtgKeywordIcon,
  MtgCounterIcon,
} from '../utils/mana-icons';
import { getPlayerBattlefieldCascadePosition } from '../utils/table-framing';
import { useCardPreview } from '../context/CardPreviewContext';

export interface CardContextMenuProps {
  card: CardInstance;
  fromZone: ZoneType;
  position: { x: number; y: number };
  onClose: () => void;
  roomState?: RoomState;
  localPlayerId?: string;
  allBattlefieldCards?: CardInstance[];
  onAction: (type: GameActionType, payload: unknown) => void;
  // Opciones exclusivas de permanentes en el campo de batalla
  onTap?: () => void;
  onAddCounter?: (type: string) => void;
  onClone?: () => void;
  onFlip?: () => void;
  onSendToCommand?: () => void;
}

const cardTokensClientCache = new Map<string, CardDefinition[]>();

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  card,
  fromZone,
  position,
  onClose,
  roomState,
  localPlayerId,
  allBattlefieldCards,
  onAction,
  onTap,
  onAddCounter: _onAddCounter,
  onClone,
  onFlip,
  onSendToCommand,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'library' | 'reveal' | null>(null);
  const { openCardDetails } = useCardPreview();

  const printedPower =
    card.definition?.power && !isNaN(parseInt(card.definition.power, 10))
      ? parseInt(card.definition.power, 10)
      : undefined;
  const printedToughness =
    card.definition?.toughness && !isNaN(parseInt(card.definition.toughness, 10))
      ? parseInt(card.definition.toughness, 10)
      : undefined;

  const [isCountersExpanded, setIsCountersExpanded] = useState(false);
  const [isKeywordsExpanded, setIsKeywordsExpanded] = useState(false);
  const [customCounterName, setCustomCounterName] = useState('');
  const [customCounterCount, setCustomCounterCount] = useState<number>(1);
  const [inputPlus, setInputPlus] = useState<number>(card.counters?.['+1/+1'] || 0);
  const [inputMinus, setInputMinus] = useState<number>(
    (card.counters?.['-1/-1'] || 0) + (card.counters?.['−1/−1'] || 0),
  );
  const [inputBaseP, setInputBaseP] = useState<number | ''>(
    card.basePower !== undefined ? card.basePower : printedPower !== undefined ? printedPower : '',
  );
  const [inputBaseT, setInputBaseT] = useState<number | ''>(
    card.baseToughness !== undefined
      ? card.baseToughness
      : printedToughness !== undefined
        ? printedToughness
        : '',
  );
  const inputBasePRef = useRef<number | ''>(inputBaseP);
  const inputBaseTRef = useRef<number | ''>(inputBaseT);

  useEffect(() => {
    const pVal =
      card.basePower !== undefined
        ? card.basePower
        : printedPower !== undefined
          ? printedPower
          : '';
    const tVal =
      card.baseToughness !== undefined
        ? card.baseToughness
        : printedToughness !== undefined
          ? printedToughness
          : '';
    inputBasePRef.current = pVal;
    inputBaseTRef.current = tVal;
    setInputPlus(card.counters?.['+1/+1'] || 0);
    setInputMinus((card.counters?.['-1/-1'] || 0) + (card.counters?.['−1/−1'] || 0));
    setInputBaseP(pVal);
    setInputBaseT(tVal);
  }, [
    card.instanceId,
    card.counters,
    card.basePower,
    card.baseToughness,
    printedPower,
    printedToughness,
  ]);

  // Fichas que puede crear esta carta (Punto 4, B.4)
  const [cardTokens, setCardTokens] = useState<CardDefinition[]>(() => {
    const name = card?.definition?.name?.trim().toLowerCase();
    return name && cardTokensClientCache.has(name) ? cardTokensClientCache.get(name)! : [];
  });

  useEffect(() => {
    let isMounted = true;
    const name = card?.definition?.name?.trim();
    if (!name) return;

    const key = name.toLowerCase();
    if (cardTokensClientCache.has(key)) {
      setCardTokens(cardTokensClientCache.get(key)!);
      return;
    }

    fetch(`/api/cards/${encodeURIComponent(name)}/tokens`)
      .then(r => r.json())
      .then(data => {
        if (!isMounted) return;
        const tokens = Array.isArray(data.tokens) ? data.tokens : [];
        cardTokensClientCache.set(key, tokens);
        setCardTokens(tokens);
      })
      .catch(() => {
        if (isMounted) setCardTokens([]);
      });

    return () => {
      isMounted = false;
    };
  }, [card?.definition?.name]);

  const emitPT = (p: number | '', t: number | '', plus: number, minus: number) => {
    onAction('SET_CARD_PT', {
      cardInstanceId: card.instanceId,
      basePower: typeof p === 'number' ? p : null,
      baseToughness: typeof t === 'number' ? t : null,
      plusCounters: plus,
      minusCounters: minus,
    });
  };

  const handleSetCounter = (type: string, count: number) => {
    onAction('SET_CARD_COUNTER', {
      cardInstanceId: card.instanceId,
      counterType: type,
      count: Math.max(0, count),
    });
  };

  const handleToggleKeyword = (kwId: string) => {
    onAction('TOGGLE_CARD_KEYWORD', {
      cardInstanceId: card.instanceId,
      keyword: kwId,
    });
  };

  const standardCounterIds = new Set(MTG_COUNTERS.map(c => c.id).concat(['-1/-1']));
  const customCounters = Object.entries(card.counters || {}).filter(
    ([k, v]) => !standardCounterIds.has(k) && v > 0,
  );

  const handleAddCustom = () => {
    const name = customCounterName.trim();
    if (!name) return;
    handleSetCounter(name, customCounterCount);
    setCustomCounterName('');
    setCustomCounterCount(1);
  };

  const handleDeleteCustom = (name: string) => {
    handleSetCounter(name, 0);
  };

  const liveBaseP = typeof inputBaseP === 'number' ? inputBaseP : printedPower;
  const liveBaseT = typeof inputBaseT === 'number' ? inputBaseT : printedToughness;
  const liveDelta = (inputPlus || 0) - (inputMinus || 0);
  const liveEffectiveP = liveBaseP !== undefined ? liveBaseP + liveDelta : '*';
  const liveEffectiveT = liveBaseT !== undefined ? liveBaseT + liveDelta : '*';

  const targetPlayerId = localPlayerId || card.ownerId;
  const canMutate = card.ownerId === targetPlayerId || card.holderId === targetPlayerId;
  const isPrivateHand = fromZone === 'hand' && card.ownerId !== targetPlayerId && !card.revealedTo;

  const cardDisplayName = card.isFaceDown
    ? 'Carta boca abajo'
    : isPrivateHand
      ? 'Carta oculta'
      : card.definition.name;

  const isVisible =
    !card.isFaceDown &&
    !isPrivateHand &&
    (fromZone === 'command' ||
      card.isCommander ||
      (fromZone === 'hand' && card.ownerId === targetPlayerId) ||
      (fromZone === 'library' && card.ownerId === targetPlayerId) ||
      fromZone === 'battlefield' ||
      fromZone === 'graveyard' ||
      fromZone === 'exile');

  const currentLibraryLength =
    (roomState && targetPlayerId && roomState.playerZones?.[targetPlayerId]?.library?.length) ||
    (roomState && targetPlayerId && roomState.players?.[targetPlayerId]?.libraryCount) ||
    0;

  // Navegación con teclado: Flechas (arriba/abajo), Enter (activar) y Esc (cerrar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const activeElem = document.activeElement as HTMLElement | null;
        if (activeElem && activeElem.tagName === 'INPUT') {
          // Permite que las flechas arriba/abajo modifiquen el valor numérico del input de forma nativa
          return;
        }
        e.preventDefault();
        if (!menuRef.current) return;
        const focusable = Array.from(
          menuRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled])',
          ),
        );
        if (focusable.length === 0) return;
        const currentIndex = activeElem ? focusable.indexOf(activeElem) : -1;
        let nextIndex = 0;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex >= 0 ? (currentIndex + 1) % focusable.length : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
        }
        focusable[nextIndex]?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Enfoque inicial al abrir el menú para permitir navegación inmediata con teclado
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstBtn = menuRef.current?.querySelector('button') as HTMLButtonElement | null;
      firstBtn?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Posicionamiento reactivo con márgenes de 8px y ResizeObserver (Punto 3 - SIEMPRE VISIBLE)
  const posX = typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 100;
  const posY = typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 100;

  const [coords, setCoords] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: posX, y: posY };
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const MARGIN = 8;
    const initialW = 240;
    const initialH = 360;

    let nextLeft = posX;
    if (nextLeft + initialW > winW - MARGIN) {
      nextLeft = Math.max(MARGIN, winW - initialW - MARGIN);
    }
    if (nextLeft < MARGIN) nextLeft = MARGIN;

    let nextTop = posY;
    if (nextTop + initialH > winH - MARGIN) {
      if (posY - initialH >= MARGIN) {
        nextTop = posY - initialH;
      } else {
        nextTop = Math.max(MARGIN, winH - initialH - MARGIN);
      }
    }
    if (nextTop < MARGIN) nextTop = MARGIN;

    return { x: nextLeft, y: nextTop };
  });

  useEffect(() => {
    if (!menuRef.current) return;

    const updatePosition = () => {
      if (!menuRef.current) return;
      const rect = menuRef.current.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const MARGIN = 8;
      const menuWidth = Math.min(240, rect.width > 0 ? rect.width : 240);
      const menuHeight = rect.height;

      // Horizontal: dentro del viewport con margen de 8 px
      let nextLeft = posX;
      if (nextLeft + menuWidth > winW - MARGIN) {
        nextLeft = Math.max(MARGIN, winW - menuWidth - MARGIN);
      }
      if (nextLeft < MARGIN) {
        nextLeft = MARGIN;
      }

      // Vertical: abrir hacia arriba o desplazarse si no cabe abajo
      let nextTop = posY;
      if (nextTop + menuHeight > winH - MARGIN) {
        if (posY - menuHeight >= MARGIN) {
          nextTop = posY - menuHeight;
        } else {
          nextTop = Math.max(MARGIN, winH - menuHeight - MARGIN);
        }
      }
      if (nextTop < MARGIN) {
        nextTop = MARGIN;
      }

      setCoords({ x: Math.round(nextLeft), y: Math.round(nextTop) });
    };

    updatePosition();

    // Recalcular posición al expandir o plegar secciones mediante ResizeObserver
    const observer = new ResizeObserver(() => {
      updatePosition();
    });
    observer.observe(menuRef.current);
    window.addEventListener('resize', updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [posX, posY]);

  // Destino: Mesa (con posición en cascada en sección propia, Punto 2)
  const handleSendToBattlefield = () => {
    let targetPos = { x: 0.5, y: 0.5 };
    if (roomState && targetPlayerId) {
      targetPos = getPlayerBattlefieldCascadePosition(
        targetPlayerId,
        roomState,
        allBattlefieldCards,
      );
    }
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'battlefield',
      toPlayerId: targetPlayerId,
      holderId: targetPlayerId,
      position: {
        ...targetPos,
        zIndex: 10,
      },
    });
    onClose();
  };

  // Destino: Mano
  const handleSendToHand = () => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'hand',
      toPlayerId: targetPlayerId,
    });
    onClose();
  };

  // Destino: Cementerio (arriba de la pila)
  const handleSendToGraveyard = () => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'graveyard',
      toPlayerId: targetPlayerId,
    });
    onClose();
  };

  // Destino: Exilio (arriba de la pila)
  const handleSendToExile = () => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'exile',
      toPlayerId: targetPlayerId,
    });
    onClose();
  };

  // Destino: Biblioteca (Arriba, Abajo o Aleatoria, Punto 2)
  const handleSendToLibrary = (destIndex?: number, isRandom?: boolean) => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'library',
      toPlayerId: targetPlayerId,
      destinationIndex: destIndex,
      randomPosition: isRandom,
      isRandom,
    });
    onClose();
  };

  // Revelar: a todos o a un jugador específico (Punto 7)
  const handleReveal = (targetPId?: string) => {
    onAction('REVEAL_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      targetPlayerId: targetPId,
    });
    onClose();
  };

  // Lista de oponentes para el submenú de revelar
  const opponents = roomState
    ? Object.values(roomState.players).filter(p => !p.isSpectator && p.id !== localPlayerId)
    : [];

  const mountTimeRef = useRef<number>(Date.now());

  const handleBackdropClose = (e: React.MouseEvent) => {
    // Evitar que el clic/evento que abrió el menú lo cierre inmediatamente si el backdrop nació bajo el cursor
    if (Date.now() - mountTimeRef.current < 150) return;
    if (e.target !== e.currentTarget) return;
    onClose();
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100]"
        data-testid="context-menu-backdrop"
        onClick={handleBackdropClose}
        onDoubleClick={e => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={handleBackdropClose}
      >
        <div
          ref={menuRef}
          style={{
            top: `${coords.y}px`,
            left: `${coords.x}px`,
            maxHeight: 'calc(100vh - 16px)',
            maxWidth: '240px',
          }}
          data-card-context-menu="true"
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onContextMenu={e => e.stopPropagation()}
          className="fixed bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col space-y-0.5 w-max max-w-[240px] overflow-y-auto z-[110] backdrop-blur-md text-[14px] text-slate-200 select-none"
        >
          {/* Header con nombre de carta (o Carta oculta / Carta boca abajo) */}
          <div className="px-2 py-1 text-[14px] font-bold text-amber-400 border-b border-slate-800 truncate max-w-[220px]">
            {cardDisplayName}
          </div>

          {/* Opción 'Ver carta' (Punto 4, REQ-7.27): disponible para cartas visibles para el jugador */}
          {isVisible && (
            <button
              type="button"
              data-testid="context-view-card"
              onClick={() => {
                onClose();
                openCardDetails(card.definition);
              }}
              className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-sky-300 hover:text-white cursor-pointer text-[14px]"
            >
              <Eye className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Ver carta</span>
            </button>
          )}

          {/* Sección Crear ficha (Punto 4, B.4) - SOLO visible si la carta crea alguna ficha */}
          {isVisible && cardTokens.length > 0 && (
            <div
              className="py-1 border-t border-slate-800"
              data-testid="context-create-token-section"
            >
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                Crear ficha
              </div>
              {cardTokens.map(token => (
                <button
                  key={token.scryfallId || token.name}
                  type="button"
                  data-testid={`create-token-${token.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    onAction('CREATE_TOKEN', {
                      tokenDefinition: token,
                      targetPlayerId: localPlayerId,
                    });
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer transition-colors text-[14px]"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <i className="ms ms-token text-amber-400 text-xs flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium text-[14px] truncate">{token.name}</span>
                    {(token.power !== undefined || token.toughness !== undefined) && (
                      <span className="text-[10px] font-mono text-slate-400">
                        ({token.power}/{token.toughness})
                      </span>
                    )}
                  </div>
                  <Plus className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Sección siempre visible: Poder y resistencia (Punto 3) - Visible en mesa para cualquier jugador */}
          {fromZone === 'battlefield' && !card.isFaceDown && (
            <>
              <div
                data-testid="context-pt-section"
                className="flex flex-col border-t border-slate-800 pt-1.5 pb-1 px-2 bg-slate-950/40 rounded-lg my-0.5 space-y-1 text-[14px]"
              >
                <div className="flex items-center justify-between text-[14px] font-bold text-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                    <span>Poder y resistencia</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400">Efectivo:</span>
                    <span
                      data-testid="pt-effective-preview"
                      className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                    >
                      {liveEffectiveP}/{liveEffectiveT}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[12px] pt-0.5">
                  {/* Poder base */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-medium">Poder</label>
                    <input
                      type="number"
                      step="1"
                      data-testid="pt-input-base-power"
                      value={inputBaseP}
                      placeholder={card.definition?.power ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                        inputBasePRef.current = val;
                        setInputBaseP(val);
                        emitPT(val, inputBaseTRef.current, inputPlus, inputMinus);
                      }}
                      onWheel={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const step = e.deltaY < 0 ? 1 : -1;
                        const current =
                          typeof inputBasePRef.current === 'number'
                            ? inputBasePRef.current
                            : (printedPower ?? 0);
                        const next = current + step;
                        inputBasePRef.current = next;
                        setInputBaseP(next);
                        emitPT(next, inputBaseTRef.current, inputPlus, inputMinus);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-[14px] font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Resistencia base */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-medium">Resistencia</label>
                    <input
                      type="number"
                      step="1"
                      data-testid="pt-input-base-toughness"
                      value={inputBaseT}
                      placeholder={card.definition?.toughness ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                        inputBaseTRef.current = val;
                        setInputBaseT(val);
                        emitPT(inputBasePRef.current, val, inputPlus, inputMinus);
                      }}
                      onWheel={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const step = e.deltaY < 0 ? 1 : -1;
                        const current =
                          typeof inputBaseTRef.current === 'number'
                            ? inputBaseTRef.current
                            : (printedToughness ?? 0);
                        const next = current + step;
                        inputBaseTRef.current = next;
                        setInputBaseT(next);
                        emitPT(inputBasePRef.current, next, inputPlus, inputMinus);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-[14px] font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Contadores (Punto 4): accesible para cualquier jugador sobre cartas visibles de la mesa */}
              <div className="flex flex-col">
                <button
                  type="button"
                  data-testid="context-counters-toggle"
                  onClick={() => setIsCountersExpanded(!isCountersExpanded)}
                  className={`w-full flex items-center justify-between px-2 py-1 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-lg cursor-pointer transition-colors text-[14px] ${
                    isCountersExpanded ? 'bg-slate-800 text-amber-300' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MtgCounterIcon counterType="+1/+1" className="text-amber-400 text-sm" />
                    <span>Contadores</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {Object.values(card.counters || {}).reduce((a, b) => a + b, 0) > 0 && (
                      <span className="text-[10px] font-mono font-bold text-amber-300 mr-1">
                        {Object.values(card.counters || {}).reduce((a, b) => a + b, 0)}
                      </span>
                    )}
                    {isCountersExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {isCountersExpanded && (
                  <div
                    data-testid="context-counters-section"
                    className="pl-2 pr-1.5 py-1.5 space-y-1 border-l-2 border-amber-500/50 bg-slate-950/40 rounded-r-lg my-0.5 max-h-56 overflow-y-auto text-[14px]"
                  >
                    {/* Lista de Contadores oficiales */}
                    {MTG_COUNTERS.map(c => {
                      const count = card.counters?.[c.id] || 0;

                      if (c.isSingle) {
                        // Finalidad: solo 1 o 0 con interruptor
                        const isActive = count > 0;
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between py-0.5 border-b border-slate-800/80 text-[14px]"
                          >
                            <div className="flex items-center space-x-1.5 text-[11px] flex-1 min-w-0 pr-2">
                              <MtgCounterIcon
                                counterType={c.id}
                                className="w-3.5 h-3.5 flex-shrink-0 text-purple-400 text-sm"
                              />
                              <span className="text-slate-200 truncate">{c.label}</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isActive}
                              data-testid="counter-toggle-finality"
                              onClick={() => handleSetCounter(c.id, isActive ? 0 : 1)}
                              className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-purple-600 justify-end'
                                  : 'bg-slate-700 justify-start'
                              }`}
                            >
                              <div className="w-3 h-3 rounded-full bg-white shadow-md" />
                            </button>
                          </div>
                        );
                      }

                      if (c.id === 'custom') {
                        return null; // Renderizado abajo
                      }

                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between py-0.5 border-b border-slate-800/60 text-[14px]"
                        >
                          <div className="flex items-center space-x-1.5 flex-1 min-w-0 pr-2">
                            <MtgCounterIcon
                              counterType={c.id}
                              className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 text-sm"
                            />
                            <label className="text-slate-300 truncate font-medium">{c.label}</label>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            data-testid={`counter-input-${c.id}`}
                            value={count}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleSetCounter(c.id, val);
                            }}
                            onWheel={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              const step = e.deltaY < 0 ? 1 : -1;
                              handleSetCounter(c.id, Math.max(0, count + step));
                            }}
                            className="w-11 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-[14px] font-mono text-slate-100 focus:outline-none focus:border-amber-400 flex-shrink-0"
                          />
                        </div>
                      );
                    })}

                    {/* Sección de Contadores Personalizados */}
                    <div className="pt-1.5 border-t border-slate-800">
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-amber-300 mb-1">
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span>Personalizado (Custom)</span>
                      </div>

                      {/* Contadores personalizados existentes */}
                      {customCounters.map(([name, count]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between py-0.5 text-[10px]"
                        >
                          <span className="text-slate-300 truncate font-medium pr-1">{name}</span>
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              data-testid={`custom-counter-input-${name}`}
                              value={count}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                handleSetCounter(name, val);
                              }}
                              className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-[14px] font-mono text-slate-100 flex-shrink-0"
                            />
                            <button
                              type="button"
                              title="Eliminar contador"
                              data-testid={`delete-custom-counter-${name}`}
                              onClick={() => handleDeleteCustom(name)}
                              className="p-1 hover:bg-rose-900/50 text-rose-400 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Agregar nuevo contador personalizado */}
                      <div className="flex items-center space-x-1 mt-1">
                        <input
                          type="text"
                          placeholder="Nombre..."
                          data-testid="custom-counter-name-input"
                          value={customCounterName}
                          onChange={e => setCustomCounterName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustom();
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-100 focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          data-testid="custom-counter-count-input"
                          value={customCounterCount}
                          onChange={e =>
                            setCustomCounterCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-[10px] font-mono text-slate-100"
                        />
                        <button
                          type="button"
                          data-testid="add-custom-counter-btn"
                          onClick={handleAddCustom}
                          className="p-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded border border-amber-500/40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Palabras clave (Punto 4): accesible para cualquier jugador sobre cartas visibles de la mesa */}
              <div className="flex flex-col">
                <button
                  type="button"
                  data-testid="context-keywords-toggle"
                  onClick={() => setIsKeywordsExpanded(!isKeywordsExpanded)}
                  className={`w-full flex items-center justify-between px-2 py-1 hover:bg-slate-800 text-[14px] focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-lg cursor-pointer transition-colors ${
                    isKeywordsExpanded ? 'bg-slate-800 text-amber-300' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Palabras clave</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {(card.keywords?.length || 0) > 0 && (
                      <span className="text-[10px] font-mono font-bold text-amber-300 mr-1">
                        {card.keywords?.length}
                      </span>
                    )}
                    {isKeywordsExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {isKeywordsExpanded && (
                  <div
                    data-testid="context-keywords-section"
                    className="pl-2 pr-1.5 py-1.5 space-y-1 border-l-2 border-amber-500/50 bg-slate-950/40 rounded-r-lg my-0.5 max-h-56 overflow-y-auto text-[14px]"
                  >
                    {MTG_KEYWORDS.map(kw => {
                      const isActive = (card.keywords || []).includes(kw.id);

                      return (
                        <div
                          key={kw.id}
                          className="flex items-center justify-between py-1 border-b border-slate-800/80"
                        >
                          <div className="flex items-center space-x-1.5 text-[11px] flex-1 min-w-0 pr-2">
                            <MtgKeywordIcon
                              keyword={kw.id}
                              className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 text-sm"
                            />
                            <span className="text-slate-200 truncate">{kw.label}</span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            data-testid={`keyword-toggle-${kw.id}`}
                            onClick={() => handleToggleKeyword(kw.id)}
                            className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                              isActive ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                            }`}
                          >
                            <div className="w-3 h-3 rounded-full bg-white shadow-md" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Opciones exclusivas de campo de batalla para cualquier jugador (Punto 7) */}
          {fromZone === 'battlefield' && (
            <>
              {onTap && (
                <button
                  type="button"
                  data-testid="context-tap-btn"
                  onClick={() => {
                    onTap();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 text-[14px] hover:text-white cursor-pointer"
                >
                  <i
                    className={`${card.isTapped ? 'ms ms-untap' : 'ms ms-tap'} text-amber-400 text-sm w-4 inline-block text-center flex-shrink-0`}
                    aria-hidden="true"
                  />
                  <span>{card.isTapped ? 'Enderezar' : 'Girar'}</span>
                </button>
              )}

              {onClone && (
                <button
                  type="button"
                  data-testid="context-clone-btn"
                  onClick={() => {
                    onClone();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 text-[14px] hover:text-white cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Clonar permanente</span>
                </button>
              )}

              {onFlip && (
                <button
                  type="button"
                  data-testid="context-flip-btn"
                  onClick={() => {
                    onFlip();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 text-[14px] hover:text-white cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{card.isFaceDown ? 'Boca arriba' : 'Boca abajo'}</span>
                </button>
              )}

              <div className="border-t border-slate-800 my-0.5" />
            </>
          )}

          {/* Opciones de traslado entre zonas (gobernadas estrictamente por propietario y titular, Punto 7) */}
          {canMutate && (
            <>
              {fromZone === 'battlefield' && card.isCommander && onSendToCommand && (
                <button
                  type="button"
                  data-testid="context-to-command"
                  onClick={() => {
                    onSendToCommand();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-amber-300 text-[14px] hover:text-amber-200 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>A Zona de Comando</span>
                </button>
              )}

              {/* Destino: Mesa (si no está ya en la mesa) */}
              {fromZone !== 'battlefield' && (
                <button
                  type="button"
                  data-testid="context-to-battlefield"
                  onClick={handleSendToBattlefield}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 text-[14px] hover:text-white cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enviar a Mesa (cascada)</span>
                </button>
              )}

              {/* Destino: Mano (si no está ya en la mano) */}
              {fromZone !== 'hand' && (
                <button
                  type="button"
                  data-testid="context-to-hand"
                  onClick={handleSendToHand}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 text-[14px] hover:text-white cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Enviar a Mano</span>
                </button>
              )}

              {/* Destino: Cementerio (si no está ya en cementerio) */}
              {fromZone !== 'graveyard' && (
                <button
                  type="button"
                  data-testid="context-to-graveyard"
                  onClick={handleSendToGraveyard}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-rose-300 text-[14px] hover:text-rose-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Enviar a Cementerio</span>
                </button>
              )}

              {/* Destino: Exilio (si no está ya en exilio) */}
              {fromZone !== 'exile' && (
                <button
                  type="button"
                  data-testid="context-to-exile"
                  onClick={handleSendToExile}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-purple-300 text-[14px] hover:text-purple-200 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Enviar a Exilio</span>
                </button>
              )}

              {/* Destino: Biblioteca con Expansión en Línea (Arriba, Abajo, Posición) */}
              <div className="flex flex-col">
                <button
                  type="button"
                  data-testid="context-to-library-menu"
                  onClick={() => setActiveSubmenu(activeSubmenu === 'library' ? null : 'library')}
                  className={`w-full flex items-center justify-between px-2 py-1 hover:bg-slate-800 text-[14px] focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-lg cursor-pointer transition-colors ${
                    activeSubmenu === 'library' ? 'bg-slate-800 text-amber-300' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Biblioteca</span>
                  </div>
                  {activeSubmenu === 'library' ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Expansión en Línea de Biblioteca */}
                {activeSubmenu === 'library' && (
                  <div
                    data-testid="context-library-submenu"
                    className="mt-1 ml-3 pl-2 border-l-2 border-amber-500/30 flex flex-col space-y-1 py-1"
                  >
                    <button
                      type="button"
                      data-testid="context-to-library-top"
                      onClick={() => handleSendToLibrary(0, false)}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 rounded-lg text-slate-200 hover:text-white cursor-pointer transition-colors text-[14px]"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Arriba (tope)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="context-to-library-bottom"
                      onClick={() => handleSendToLibrary(currentLibraryLength, false)}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400/50 rounded-lg text-slate-200 hover:text-white cursor-pointer transition-colors text-[14px]"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      <span>Abajo (fondo)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="context-to-library-random"
                      onClick={() => handleSendToLibrary(undefined, true)}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-lg text-slate-200 hover:text-white cursor-pointer transition-colors text-[14px]"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Aleatoria</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Opción 'Dejar de revelar' (Punto 1): visible solo si hay revelación activa */}
              {fromZone === 'hand' && canMutate && !!card.revealedTo && (
                <button
                  type="button"
                  data-testid="context-unreveal-btn"
                  onClick={() => {
                    onAction('UNREVEAL_CARD', {
                      cardInstanceId: card.instanceId,
                      fromZone: 'hand',
                    });
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-rose-300 text-[14px] hover:text-white cursor-pointer transition-colors"
                >
                  <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Dejar de revelar</span>
                </button>
              )}

              {/* Opción: Revelar con Expansión en Línea (A todos o a jugador específico, Punto 7) */}
              <div className="flex flex-col border-t border-slate-800 pt-0.5">
                <button
                  type="button"
                  data-testid="context-reveal-menu"
                  onClick={() => setActiveSubmenu(activeSubmenu === 'reveal' ? null : 'reveal')}
                  className={`w-full flex items-center justify-between px-2 py-1 hover:bg-slate-800 text-[14px] focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 rounded-lg cursor-pointer transition-colors ${
                    activeSubmenu === 'reveal' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Revelar</span>
                  </div>
                  {activeSubmenu === 'reveal' ? (
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Expansión en Línea de Revelar */}
                {activeSubmenu === 'reveal' && (
                  <div
                    data-testid="context-reveal-submenu"
                    className="mt-1 ml-3 pl-2 border-l-2 border-cyan-500/30 flex flex-col space-y-1 py-1"
                  >
                    <button
                      type="button"
                      data-testid="context-reveal-all"
                      onClick={() => handleReveal(undefined)}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 rounded-lg text-slate-200 hover:text-white cursor-pointer font-medium transition-colors text-[14px]"
                    >
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>A toda la mesa</span>
                    </button>

                    {opponents.length > 0 && (
                      <>
                        <div className="border-t border-slate-800 my-0.5 px-1 text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                          Jugador específico
                        </div>
                        {opponents.map(opp => (
                          <button
                            key={opp.id}
                            type="button"
                            data-testid={`context-reveal-player-${opp.id}`}
                            onClick={() => handleReveal(opp.id)}
                            className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 rounded-lg text-slate-300 hover:text-white cursor-pointer truncate transition-colors text-[14px]"
                          >
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{opp.name}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
};
