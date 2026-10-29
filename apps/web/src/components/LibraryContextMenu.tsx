import React, { useState, useEffect, useRef } from 'react';
import type { CardInstance, GameActionType, RoomState } from '@mtgc/shared';
import { Portal } from './Portal';
import {
  Eye,
  EyeOff,
  Shuffle,
  BookOpen,
  ArrowDown,
  ArrowUp,
  Play,
  Trash2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  Search,
  Hand,
} from 'lucide-react';

export interface LibraryContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  libraryCards: CardInstance[];
  localPlayerId: string;
  roomState?: RoomState;
  onAction: (type: GameActionType, payload: unknown) => void;
  onOpenInspectModal: () => void;
  onOpenRevealModal: (title: string, subtitle: string, cards: CardInstance[]) => void;
  isTopRevealedToMe: boolean;
  onToggleTopRevealedToMe: (val: boolean) => void;
}

export const LibraryContextMenu: React.FC<LibraryContextMenuProps> = ({
  position,
  onClose,
  libraryCards,
  localPlayerId,
  roomState: _roomState,
  onAction,
  onOpenInspectModal,
  onOpenRevealModal,
  isTopRevealedToMe,
  onToggleTopRevealedToMe,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Submenu states: primary & nested
  const [activeSubmenu, setActiveSubmenu] = useState<'reveal' | 'bottom' | 'moveTo' | null>(null);
  const [nestedSubmenu, setNestedSubmenu] = useState<string | null>(null);

  const [customTopX, setCustomTopX] = useState<number>(3);
  const [customBottomX, setCustomBottomX] = useState<number>(3);

  const topCard = libraryCards[0];
  const bottomCard = libraryCards[libraryCards.length - 1];
  const isTopRevealedToAll = topCard?.revealedTo === 'all';

  // Keyboard navigation & close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Viewport clamping
  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      let x = position.x;
      let y = position.y;
      if (x + rect.width > winW - 10) x = winW - rect.width - 10;
      if (y + rect.height > winH - 10) y = winH - rect.height - 10;
      if (x < 10) x = 10;
      if (y < 10) y = 10;
      setAdjustedPos({ x, y });
    }
  }, [position, activeSubmenu, nestedSubmenu]);

  const togglePrimarySubmenu = (menu: 'reveal' | 'bottom' | 'moveTo') => {
    if (activeSubmenu === menu) {
      setActiveSubmenu(null);
      setNestedSubmenu(null);
    } else {
      setActiveSubmenu(menu);
      setNestedSubmenu(null);
    }
  };

  const toggleNestedSubmenu = (menu: string) => {
    setNestedSubmenu(prev => (prev === menu ? null : menu));
  };

  // Actions
  const handleShuffle = () => {
    onAction('SHUFFLE_LIBRARY', {});
    onClose();
  };

  const handleDrawFromBottom = (count: number = 1) => {
    if (libraryCards.length === 0) return;
    const actualCount = Math.min(count, libraryCards.length);
    for (let i = 0; i < actualCount; i++) {
      const card = libraryCards[libraryCards.length - 1 - i];
      if (card) {
        onAction('MOVE_CARD', {
          cardInstanceId: card.instanceId,
          fromZone: 'library',
          toZone: 'hand',
          toPlayerId: localPlayerId,
        });
      }
    }
    onClose();
  };

  const handleSendBottomCardTo = (
    toZone: 'battlefield' | 'graveyard' | 'exile',
    options?: { isTapped?: boolean; isFaceDown?: boolean },
  ) => {
    if (!bottomCard) return;
    onAction('MOVE_CARD', {
      cardInstanceId: bottomCard.instanceId,
      fromZone: 'library',
      toZone,
      toPlayerId: localPlayerId,
      isTapped: options?.isTapped,
      isFaceDown: options?.isFaceDown,
    });
    onClose();
  };

  const handleSendTopCardTo = (
    toZone: 'hand' | 'graveyard' | 'battlefield' | 'exile' | 'library',
    options?: {
      destinationIndex?: number;
      isRandom?: boolean;
      isTapped?: boolean;
      isFaceDown?: boolean;
    },
  ) => {
    if (!topCard) return;
    onAction('MOVE_CARD', {
      cardInstanceId: topCard.instanceId,
      fromZone: 'library',
      toZone,
      toPlayerId: localPlayerId,
      destinationIndex: options?.destinationIndex,
      isRandom: options?.isRandom,
      isTapped: options?.isTapped,
      isFaceDown: options?.isFaceDown,
    });
    onClose();
  };

  const handleToggleRevealToAll = () => {
    if (!topCard) return;
    if (isTopRevealedToAll) {
      onAction('UNREVEAL_CARD', {
        cardInstanceId: topCard.instanceId,
        fromZone: 'library',
      });
    } else {
      onAction('REVEAL_CARD', {
        cardInstanceId: topCard.instanceId,
        fromZone: 'library',
      });
    }
    onClose();
  };

  const handleRevealTopX = (count: number) => {
    if (libraryCards.length === 0) return;
    const slice = libraryCards.slice(0, Math.min(count, libraryCards.length));
    onOpenRevealModal(
      `Revelando las primeras ${slice.length} cartas`,
      'Visible solo para ti desde la biblioteca',
      slice,
    );
    onClose();
  };

  const handleRevealUntilType = (typeKeyword: string, typeLabel: string) => {
    if (libraryCards.length === 0) return;
    const foundCards: CardInstance[] = [];
    let matched = false;

    for (const c of libraryCards) {
      foundCards.push(c);
      const typeLine = (c.definition?.typeLine || '').toLowerCase();
      if (typeLine.includes(typeKeyword.toLowerCase())) {
        matched = true;
        break;
      }
    }

    onOpenRevealModal(
      `Revelar hasta encontrar: ${typeLabel}`,
      matched
        ? `Se encontró "${foundCards[foundCards.length - 1]?.definition?.name}" tras ${foundCards.length} carta(s).`
        : `No se encontró ninguna carta de tipo "${typeLabel}" en la biblioteca.`,
      foundCards,
    );
    onClose();
  };

  return (
    <Portal>
      {/* Click-outside backdrop */}
      <div
        data-testid="library-context-menu-backdrop"
        className="fixed inset-0 z-50 bg-transparent"
        onClick={onClose}
        onContextMenu={e => {
          e.preventDefault();
          onClose();
        }}
      />

      <div
        ref={menuRef}
        data-testid="library-context-menu"
        className="fixed z-50 min-w-[240px] max-w-[280px] bg-[#092328] border border-[#12544F] rounded-xl shadow-2xl py-1.5 text-zinc-200 select-none text-xs backdrop-blur-xl ring-1 ring-white/10 flex flex-col space-y-0.5 animate-fadeIn"
        style={{
          left: `${adjustedPos.x}px`,
          top: `${adjustedPos.y}px`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header: Library Title and Card Count */}
        <div className="px-3 py-1.5 border-b border-[#12544F] flex items-center justify-between text-[#8BBB92] font-semibold text-[11px] bg-[#040d0f]/50">
          <div className="flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Biblioteca</span>
          </div>
          <span className="font-mono bg-[#12544F]/50 px-1.5 py-0.2 rounded text-[10px]">
            {libraryCards.length} cartas
          </span>
        </div>

        {/* 1. Submenú: Reveal... */}
        <div className="flex flex-col">
          <button
            type="button"
            data-testid="lib-menu-reveal"
            onClick={() => togglePrimarySubmenu('reveal')}
            className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#12544F] transition-colors rounded-lg cursor-pointer ${
              activeSubmenu === 'reveal' ? 'bg-[#12544F] text-[#8BBB92]' : 'text-zinc-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Eye className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span className="font-medium text-[13px]">Reveal...</span>
            </div>
            {activeSubmenu === 'reveal' ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#8BBB92]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {activeSubmenu === 'reveal' && (
            <div
              data-testid="lib-submenu-reveal"
              className="mt-0.5 ml-3 pl-2 border-l-2 border-[#2A835F] flex flex-col space-y-1 py-1 bg-[#040d0f]/40 rounded-r-lg"
            >
              {/* Top X -> To you */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  data-testid="lib-menu-reveal-top-x"
                  onClick={() => toggleNestedSubmenu('revealTopX')}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <ArrowUp className="w-3 h-3 text-[#8BBB92]" />
                    <span>Top X → To you</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>

                {nestedSubmenu === 'revealTopX' && (
                  <div className="ml-3 pl-2 border-l border-[#12544F] flex flex-col space-y-1 py-1">
                    <div className="grid grid-cols-4 gap-1 px-1">
                      {[1, 2, 3, 5].map(n => (
                        <button
                          key={n}
                          data-testid={`reveal-top-${n}`}
                          onClick={() => handleRevealTopX(n)}
                          className="py-0.5 bg-[#12544F]/50 hover:bg-[#2A835F] text-[#8BBB92] hover:text-white rounded text-[11px] font-mono text-center cursor-pointer transition-colors"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-1 px-1 pt-1">
                      <input
                        type="number"
                        min="1"
                        max={libraryCards.length || 100}
                        value={customTopX}
                        onChange={e => setCustomTopX(parseInt(e.target.value, 10) || 1)}
                        className="w-12 bg-[#092328] border border-[#12544F] px-1 py-0.5 rounded text-[11px] font-mono text-center text-zinc-100 focus:outline-none focus:border-[#2A835F]"
                      />
                      <button
                        onClick={() => handleRevealTopX(customTopX)}
                        className="flex-1 py-0.5 bg-[#2A835F] hover:bg-[#349e73] text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Revelar X
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Until card of type */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  data-testid="lib-menu-reveal-until-type"
                  onClick={() => toggleNestedSubmenu('revealUntilType')}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <Search className="w-3 h-3 text-[#8BBB92]" />
                    <span>Until card of type</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>

                {nestedSubmenu === 'revealUntilType' && (
                  <div className="ml-3 pl-2 border-l border-[#12544F] flex flex-col space-y-0.5 py-1">
                    {[
                      { type: 'Creature', label: 'Criatura' },
                      { type: 'Land', label: 'Tierra' },
                      { type: 'Instant', label: 'Instantáneo' },
                      { type: 'Sorcery', label: 'Conjuro' },
                      { type: 'Artifact', label: 'Artefacto' },
                      { type: 'Enchantment', label: 'Encantamiento' },
                      { type: 'Planeswalker', label: 'Planeswalker' },
                    ].map(item => (
                      <button
                        key={item.type}
                        data-testid={`reveal-until-${item.type.toLowerCase()}`}
                        onClick={() => handleRevealUntilType(item.type, item.label)}
                        className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Sección: Reveal Top Card (Toggles To Me / To Everyone) */}
        <div className="py-1 border-t border-[#12544F]/70 flex flex-col space-y-1 px-1">
          <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8BBB92]/80">
            Reveal Top Card
          </div>

          {/* Toggle: To Me [ ] */}
          <button
            type="button"
            data-testid="toggle-reveal-top-me"
            onClick={() => onToggleTopRevealedToMe(!isTopRevealedToMe)}
            className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded-lg text-[13px] text-zinc-200 hover:text-white cursor-pointer transition-colors"
          >
            <span className="flex items-center space-x-2">
              <Eye className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span>To Me</span>
            </span>
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isTopRevealedToMe
                  ? 'bg-[#2A835F] border-[#8BBB92] text-white'
                  : 'border-[#12544F] bg-[#040d0f]'
              }`}
            >
              {isTopRevealedToMe && <Check className="w-3 h-3" />}
            </div>
          </button>

          {/* Toggle: To Everyone [ ] */}
          <button
            type="button"
            data-testid="toggle-reveal-top-everyone"
            onClick={handleToggleRevealToAll}
            className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded-lg text-[13px] text-zinc-200 hover:text-white cursor-pointer transition-colors"
          >
            <span className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span>To Everyone</span>
            </span>
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isTopRevealedToAll
                  ? 'bg-[#2A835F] border-[#8BBB92] text-white'
                  : 'border-[#12544F] bg-[#040d0f]'
              }`}
            >
              {isTopRevealedToAll && <Check className="w-3 h-3" />}
            </div>
          </button>
        </div>

        {/* 3. Submenú: Bottom of Library */}
        <div className="py-1 border-t border-[#12544F]/70 flex flex-col">
          <button
            type="button"
            data-testid="lib-menu-bottom"
            onClick={() => togglePrimarySubmenu('bottom')}
            className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#12544F] transition-colors rounded-lg cursor-pointer ${
              activeSubmenu === 'bottom' ? 'bg-[#12544F] text-[#8BBB92]' : 'text-zinc-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ArrowDown className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span className="font-medium text-[13px]">Bottom of Library</span>
            </div>
            {activeSubmenu === 'bottom' ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#8BBB92]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {activeSubmenu === 'bottom' && (
            <div
              data-testid="lib-submenu-bottom"
              className="mt-0.5 ml-3 pl-2 border-l-2 border-[#2A835F] flex flex-col space-y-1 py-1 bg-[#040d0f]/40 rounded-r-lg"
            >
              {/* Draw from bottom */}
              <button
                type="button"
                data-testid="bottom-draw-one"
                onClick={() => handleDrawFromBottom(1)}
                className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
              >
                <Hand className="w-3 h-3 text-[#8BBB92]" />
                <span>Draw from bottom</span>
              </button>

              {/* Draw X cards from bottom */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  data-testid="bottom-draw-x-menu"
                  onClick={() => toggleNestedSubmenu('bottomDrawX')}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <Hand className="w-3 h-3 text-[#8BBB92]" />
                    <span>Draw X from bottom</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>

                {nestedSubmenu === 'bottomDrawX' && (
                  <div className="ml-3 pl-2 border-l border-[#12544F] flex flex-col space-y-1 py-1">
                    <div className="grid grid-cols-4 gap-1 px-1">
                      {[1, 2, 3, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => handleDrawFromBottom(n)}
                          className="py-0.5 bg-[#12544F]/50 hover:bg-[#2A835F] text-[#8BBB92] hover:text-white rounded text-[11px] font-mono text-center cursor-pointer transition-colors"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-1 px-1 pt-1">
                      <input
                        type="number"
                        min="1"
                        max={libraryCards.length || 100}
                        value={customBottomX}
                        onChange={e => setCustomBottomX(parseInt(e.target.value, 10) || 1)}
                        className="w-12 bg-[#092328] border border-[#12544F] px-1 py-0.5 rounded text-[11px] font-mono text-center text-zinc-100 focus:outline-none focus:border-[#2A835F]"
                      />
                      <button
                        onClick={() => handleDrawFromBottom(customBottomX)}
                        className="flex-1 py-0.5 bg-[#2A835F] hover:bg-[#349e73] text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Robar X
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Send bottom card to... */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  data-testid="bottom-send-to-menu"
                  onClick={() => toggleNestedSubmenu('bottomSendTo')}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <Play className="w-3 h-3 text-[#8BBB92]" />
                    <span>Send bottom card to...</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>

                {nestedSubmenu === 'bottomSendTo' && (
                  <div className="ml-3 pl-2 border-l border-[#12544F] flex flex-col space-y-0.5 py-1">
                    <button
                      type="button"
                      data-testid="bottom-to-battlefield"
                      onClick={() => handleSendBottomCardTo('battlefield')}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[11px]"
                    >
                      <Play className="w-3 h-3 text-[#8BBB92]" />
                      <span>Battlefield</span>
                    </button>
                    <button
                      type="button"
                      data-testid="bottom-to-graveyard"
                      onClick={() => handleSendBottomCardTo('graveyard')}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-rose-950/60 rounded text-rose-300 hover:text-white cursor-pointer text-[11px]"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                      <span>Graveyard</span>
                    </button>
                    <button
                      type="button"
                      data-testid="bottom-to-exile-visible"
                      onClick={() => handleSendBottomCardTo('exile', { isFaceDown: true })}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[11px]"
                    >
                      <Sparkles className="w-3 h-3 text-[#8BBB92]" />
                      <span>Exile (Face-down, visible to you)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="bottom-to-exile-hidden"
                      onClick={() => handleSendBottomCardTo('exile', { isFaceDown: true })}
                      className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[11px]"
                    >
                      <EyeOff className="w-3 h-3 text-zinc-400" />
                      <span>Exile (Face-down, hidden)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Submenú: Move to... */}
        <div className="py-1 border-t border-[#12544F]/70 flex flex-col">
          <button
            type="button"
            data-testid="lib-menu-move-to"
            onClick={() => togglePrimarySubmenu('moveTo')}
            className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#12544F] transition-colors rounded-lg cursor-pointer ${
              activeSubmenu === 'moveTo' ? 'bg-[#12544F] text-[#8BBB92]' : 'text-zinc-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Play className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span className="font-medium text-[13px]">Move to...</span>
            </div>
            {activeSubmenu === 'moveTo' ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#8BBB92]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {activeSubmenu === 'moveTo' && (
            <div
              data-testid="lib-submenu-move-to"
              className="mt-0.5 ml-3 pl-2 border-l-2 border-[#2A835F] flex flex-col space-y-1 py-1 bg-[#040d0f]/40 rounded-r-lg"
            >
              {/* Graveyard */}
              <button
                type="button"
                data-testid="move-to-graveyard"
                onClick={() => handleSendTopCardTo('graveyard')}
                className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-rose-950/60 rounded text-rose-300 hover:text-white cursor-pointer text-[12px]"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Graveyard</span>
              </button>

              {/* Hand */}
              <button
                type="button"
                data-testid="move-to-hand"
                onClick={() => handleSendTopCardTo('hand')}
                className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
              >
                <Hand className="w-3 h-3 text-[#8BBB92]" />
                <span>Hand</span>
              </button>

              {/* Battlefield > */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  data-testid="move-to-battlefield-menu"
                  onClick={() => toggleNestedSubmenu('moveBattlefield')}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <Play className="w-3 h-3 text-[#8BBB92]" />
                    <span>Battlefield &gt;</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>

                {nestedSubmenu === 'moveBattlefield' && (
                  <div className="ml-3 pl-2 border-l border-[#12544F] flex flex-col space-y-0.5 py-1">
                    <button
                      type="button"
                      data-testid="bf-untapped"
                      onClick={() => handleSendTopCardTo('battlefield', { isTapped: false })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Enderezada (Untapped)
                    </button>
                    <button
                      type="button"
                      data-testid="bf-tapped"
                      onClick={() => handleSendTopCardTo('battlefield', { isTapped: true })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Girada (Tapped)
                    </button>
                    <button
                      type="button"
                      data-testid="bf-facedown"
                      onClick={() => handleSendTopCardTo('battlefield', { isFaceDown: true })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Boca abajo (Face-down 2/2)
                    </button>
                  </div>
                )}
              </div>

              {/* Exile > */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  data-testid="move-to-exile-menu"
                  onClick={() => toggleNestedSubmenu('moveExile')}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3 h-3 text-[#8BBB92]" />
                    <span>Exile &gt;</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>

                {nestedSubmenu === 'moveExile' && (
                  <div className="ml-3 pl-2 border-l border-[#12544F] flex flex-col space-y-0.5 py-1">
                    <button
                      type="button"
                      data-testid="exile-faceup"
                      onClick={() => handleSendTopCardTo('exile', { isFaceDown: false })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Boca arriba (Face-up)
                    </button>
                    <button
                      type="button"
                      data-testid="exile-facedown-visible"
                      onClick={() => handleSendTopCardTo('exile', { isFaceDown: true })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Boca abajo (visible a ti)
                    </button>
                    <button
                      type="button"
                      data-testid="exile-facedown-hidden"
                      onClick={() => handleSendTopCardTo('exile', { isFaceDown: true })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Boca abajo (oculta)
                    </button>
                  </div>
                )}
              </div>

              {/* Library > */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  data-testid="move-to-library-menu"
                  onClick={() => toggleNestedSubmenu('moveLibrary')}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#12544F] rounded text-zinc-200 hover:text-white cursor-pointer text-[12px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <BookOpen className="w-3 h-3 text-[#8BBB92]" />
                    <span>Library &gt;</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>

                {nestedSubmenu === 'moveLibrary' && (
                  <div className="ml-3 pl-2 border-l border-[#12544F] flex flex-col space-y-0.5 py-1">
                    <button
                      type="button"
                      data-testid="lib-to-top"
                      onClick={() => handleSendTopCardTo('library', { destinationIndex: 0 })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Arriba (Tope)
                    </button>
                    <button
                      type="button"
                      data-testid="lib-to-bottom"
                      onClick={() =>
                        handleSendTopCardTo('library', { destinationIndex: libraryCards.length })
                      }
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Abajo (Fondo)
                    </button>
                    <button
                      type="button"
                      data-testid="lib-to-random"
                      onClick={() => handleSendTopCardTo('library', { isRandom: true })}
                      className="w-full text-left px-2 py-0.5 hover:bg-[#12544F] rounded text-[11px] text-zinc-300 hover:text-[#8BBB92] cursor-pointer"
                    >
                      Aleatoria (Random)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. Utility Actions: Barajar & Inspeccionar */}
        <div className="py-1 border-t border-[#12544F] flex flex-col space-y-0.5">
          <button
            type="button"
            data-testid="lib-menu-shuffle"
            onClick={handleShuffle}
            className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#12544F] rounded-lg text-zinc-200 hover:text-white cursor-pointer transition-colors text-[13px]"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#8BBB92]" />
            <span>Barajar biblioteca</span>
          </button>
          <button
            type="button"
            data-testid="lib-menu-inspect"
            onClick={() => {
              onClose();
              onOpenInspectModal();
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#12544F] rounded-lg text-[#8BBB92] hover:text-white cursor-pointer transition-colors text-[13px]"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Ver biblioteca (solo tú)</span>
          </button>
        </div>
      </div>
    </Portal>
  );
};
