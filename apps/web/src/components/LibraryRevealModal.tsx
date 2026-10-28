import React from 'react';
import type { CardInstance, GameActionType } from '@mtgc/shared';
import { Portal } from './Portal';
import { CardDisplay } from './CardDisplay';
import { Eye, Hand, Trash2, Play, Sparkles, ArrowDown, ArrowUp, X } from 'lucide-react';

export interface LibraryRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  cards: CardInstance[];
  onAction: (type: GameActionType, payload: unknown) => void;
  localPlayerId?: string;
}

export const LibraryRevealModal: React.FC<LibraryRevealModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  cards,
  onAction,
  localPlayerId,
}) => {
  if (!isOpen) return null;

  const handleMoveCard = (card: CardInstance, toZone: 'hand' | 'graveyard' | 'battlefield' | 'exile' | 'library', destinationIndex?: number) => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: 'library',
      toZone,
      toPlayerId: localPlayerId,
      destinationIndex,
    });
  };

  return (
    <Portal>
      <div
        data-testid="library-reveal-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fadeIn"
      >
        <div
          data-testid="library-reveal-content"
          className="bg-[#092328] border border-[#12544F] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100 ring-1 ring-white/10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#12544F] flex items-center justify-between bg-[#040d0f]/90">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#12544F]/50 border border-[#2A835F] flex items-center justify-center text-[#8BBB92]">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-base tracking-tight text-white">{title}</h3>
                {subtitle && <p className="text-xs text-[#8BBB92]">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="library-reveal-close-btn"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#12544F] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cards Display Grid */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cards.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">
                No se encontraron cartas para revelar.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {cards.map((card, idx) => (
                  <div
                    key={card.instanceId}
                    data-revealed-card-item={card.instanceId}
                    className="flex flex-col bg-[#040d0f]/80 border border-[#12544F] rounded-xl p-2 space-y-2 hover:border-[#8BBB92] transition-all group"
                  >
                    <div className="text-[10px] font-mono text-[#8BBB92] flex items-center justify-between">
                      <span>#{idx + 1}</span>
                      <span className="truncate max-w-[80%] font-semibold text-zinc-300">
                        {card.definition.name}
                      </span>
                    </div>

                    <div className="w-full aspect-[5/7] rounded-lg overflow-hidden border border-[#12544F] bg-[#040d0f] relative">
                      <CardDisplay card={card.definition} isFaceDown={false} size="small" />
                    </div>

                    <div className="text-[9px] text-zinc-400 line-clamp-1 italic text-center">
                      {card.definition.typeLine}
                    </div>

                    {/* Quick Move Action Buttons */}
                    <div className="grid grid-cols-2 gap-1 pt-1 border-t border-[#12544F]/60">
                      <button
                        onClick={() => handleMoveCard(card, 'hand')}
                        className="px-1.5 py-1 bg-[#12544F]/60 hover:bg-[#2A835F] text-zinc-200 hover:text-white rounded text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        title="Enviar a la Mano"
                      >
                        <Hand className="w-3 h-3 text-[#8BBB92]" />
                        <span>Mano</span>
                      </button>
                      <button
                        onClick={() => handleMoveCard(card, 'graveyard')}
                        className="px-1.5 py-1 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/40 text-rose-300 hover:text-white rounded text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        title="Enviar al Cementerio"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Cementerio</span>
                      </button>
                      <button
                        onClick={() => handleMoveCard(card, 'battlefield')}
                        className="px-1.5 py-1 bg-[#2A835F]/40 hover:bg-[#2A835F] text-[#8BBB92] hover:text-white rounded text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        title="Enviar a la Mesa"
                      >
                        <Play className="w-3 h-3" />
                        <span>Mesa</span>
                      </button>
                      <button
                        onClick={() => handleMoveCard(card, 'exile')}
                        className="px-1.5 py-1 bg-[#12544F]/40 hover:bg-[#12544F] text-zinc-300 hover:text-white rounded text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        title="Enviar al Exilio"
                      >
                        <Sparkles className="w-3 h-3 text-[#8BBB92]" />
                        <span>Exilio</span>
                      </button>
                      <button
                        onClick={() => handleMoveCard(card, 'library', 0)}
                        className="px-1.5 py-1 bg-[#092328] hover:bg-[#12544F] text-zinc-300 hover:text-white rounded text-[9px] font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        title="Devolver al Tope de la Biblioteca"
                      >
                        <ArrowUp className="w-2.5 h-2.5 text-[#8BBB92]" />
                        <span>Tope</span>
                      </button>
                      <button
                        onClick={() => handleMoveCard(card, 'library', -1)}
                        className="px-1.5 py-1 bg-[#092328] hover:bg-[#12544F] text-zinc-300 hover:text-white rounded text-[9px] font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        title="Devolver al Fondo de la Biblioteca"
                      >
                        <ArrowDown className="w-2.5 h-2.5 text-[#8BBB92]" />
                        <span>Fondo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Bulk Actions */}
          <div className="px-6 py-3 border-t border-[#12544F] bg-[#040d0f]/90 flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              Total reveladas: <strong className="text-[#8BBB92]">{cards.length}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  cards.forEach(c => handleMoveCard(c, 'graveyard'));
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-200 font-semibold transition-colors cursor-pointer"
              >
                Todas al Cementerio
              </button>
              <button
                onClick={() => {
                  cards.forEach(c => handleMoveCard(c, 'hand'));
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#2A835F] hover:bg-[#349e73] text-white font-bold transition-colors cursor-pointer"
              >
                Todas a la Mano
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-[#12544F] hover:bg-[#2A835F] text-zinc-200 hover:text-white transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};
