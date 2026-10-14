import React, { createContext, useContext, useState, useRef } from 'react';
import type { CardDefinition } from '@mtgc/shared';
import { inferCardTypeLine } from '@mtgc/shared';
import { CardDisplay } from '../components/CardDisplay';
import { Portal } from '../components/Portal';

interface CardPreviewContextType {
  showPreview: (card: CardDefinition) => void;
  hidePreview: () => void;
  setIsDragging: (isDragging: boolean) => void;
}

const CardPreviewContext = createContext<CardPreviewContextType | null>(null);

export const CardPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCard, setActiveCard] = useState<CardDefinition | null>(null);
  const [isDragging, setIsDraggingState] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showPreview = (card: CardDefinition) => {
    if (isDragging) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    // Retardo corto (250ms) para evitar parpadeos al mover rápido el ratón
    timerRef.current = setTimeout(() => {
      setActiveCard(card);
    }, 250);
  };

  const hidePreview = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveCard(null);
  };

  const setIsDragging = (dragging: boolean) => {
    setIsDraggingState(dragging);
    if (dragging) {
      hidePreview();
    }
  };

  return (
    <CardPreviewContext.Provider value={{ showPreview, hidePreview, setIsDragging }}>
      {children}
      {/* Vista previa en el centro de la pantalla completa (REQ-9.6, REQ-22) */}
      {activeCard && !isDragging && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none select-none transition-all duration-150 animate-in fade-in zoom-in-95">
            <div className="w-64 sm:w-72 bg-slate-950/95 border-2 border-amber-500/70 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] p-3 space-y-2 backdrop-blur-md ring-1 ring-white/10">
              <div className="aspect-[2.5/3.5] rounded-xl overflow-hidden border border-slate-700 shadow-xl bg-slate-900">
                <CardDisplay card={activeCard} allowFaceToggle={false} />
              </div>
              <div className="px-1 text-center">
                <div className="font-black text-sm text-white truncate">
                  {activeCard.name}
                </div>
                <div className="text-[11px] font-semibold text-slate-300 truncate">
                  {inferCardTypeLine(activeCard.name, activeCard.typeLine)}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </CardPreviewContext.Provider>
  );
};

export const useCardPreview = () => {
  const ctx = useContext(CardPreviewContext);
  if (!ctx) {
    return {
      showPreview: () => {},
      hidePreview: () => {},
      setIsDragging: () => {},
    };
  }
  return ctx;
};
