import React, { useEffect } from 'react';
import type { CardInstance } from '@mtgc/shared';
import { CardDisplay } from './CardDisplay';
import { Eye, X } from 'lucide-react';

export interface RevealedCardData {
  card: CardInstance;
  fromPlayerId: string;
  fromPlayerName: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
}

export interface RevealedCardModalProps {
  revealed: RevealedCardData;
  localPlayerId?: string;
  onClose: () => void;
}

export const RevealedCardModal: React.FC<RevealedCardModalProps> = ({
  revealed,
  localPlayerId,
  onClose,
}) => {
  const { card, fromPlayerName, targetPlayerId } = revealed;
  const isForMeOnly = !!targetPlayerId && targetPlayerId === localPlayerId;

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="revealed-card-modal"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
      onDoubleClick={e => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
    >
      <div
        className="relative bg-[#092328] border border-[#12544F] rounded-2xl shadow-[0_0_60px_rgba(42,131,95,0.25)] p-5 max-w-sm w-full flex flex-col items-center space-y-4 text-center ring-1 ring-[#2A835F]/30"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => e.stopPropagation()}
      >
        {/* Botón de cierre superior derecho */}
        <button
          type="button"
          data-testid="close-revealed-card-btn"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-white hover:bg-[#12544F] rounded-lg transition-colors cursor-pointer"
          title="Cerrar vista de carta revelada"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex flex-col items-center space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#12544F]/50 border border-[#2A835F] rounded-full text-[#8BBB92] text-xs font-bold tracking-wide">
            <Eye className="w-3.5 h-3.5 text-[#8BBB92]" />
            <span>
              {isForMeOnly
                ? `${fromPlayerName} te reveló esta carta`
                : `${fromPlayerName} reveló una carta a todos`}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-white">{card.definition.name}</h3>
          <p className="text-xs text-zinc-400 font-medium">{card.definition.typeLine}</p>
        </div>

        {/* Imagen de la carta en alta resolución */}
        <div className="w-56 aspect-[5/7] rounded-xl overflow-hidden border border-[#12544F] shadow-2xl relative bg-[#040d0f] flex-shrink-0">
          <CardDisplay card={card.definition} isFaceDown={false} allowFaceToggle={false} />
        </div>

        {/* Botón de confirmación / cierre */}
        <button
          type="button"
          onClick={onClose}
          data-testid="dismiss-revealed-btn"
          className="w-full py-2.5 bg-[#2A835F] hover:bg-[#349e73] text-white font-bold rounded-xl text-sm shadow-lg transition-all cursor-pointer border border-[#8BBB92]/40"
        >
          Entendido / Cerrar
        </button>
      </div>
    </div>
  );
};
