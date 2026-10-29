import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { CardDefinition, CardInstance } from '@mtgc/shared';
import { getKeywordDefinition, getCounterDefinition } from '@mtgc/shared';
import { CardDisplay } from '../components/CardDisplay';
import { CardDetailsModal } from '../components/CardDetailsModal';
import { Portal } from '../components/Portal';
import { MtgKeywordIcon, MtgCounterIcon } from '../utils/mana-icons';

interface CardPreviewContextType {
  showPreview: (
    card: CardDefinition,
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent,
    instance?: CardInstance,
  ) => void;
  hidePreview: () => void;
  setIsDragging: (isDragging: boolean) => void;
  openCardDetails: (card: CardDefinition) => void;
  closeCardDetails: () => void;
}

const CardPreviewContext = createContext<CardPreviewContextType | null>(null);

export const CardPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCard, setActiveCard] = useState<CardDefinition | null>(null);
  const [activeInstance, setActiveInstance] = useState<CardInstance | null>(null);
  const [detailsCard, setDetailsCard] = useState<CardDefinition | null>(null);
  const [previewSide, setPreviewSide] = useState<'left' | 'right'>('right');
  const [isDragging, setIsDraggingState] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Escuchar posición global del ratón para determinar mitad opuesta de pantalla
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Desaparecer inmediatamente al pulsar Escape (Punto 9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hidePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showPreview = (
    card: CardDefinition,
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent,
    instance?: CardInstance,
  ) => {
    if (isDragging) return;

    const cursorX =
      posOrEvent && 'clientX' in posOrEvent && typeof posOrEvent.clientX === 'number'
        ? posOrEvent.clientX
        : posOrEvent && 'x' in posOrEvent && typeof posOrEvent.x === 'number'
          ? posOrEvent.x
          : mousePosRef.current.x;

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    // Si el cursor está a la izquierda (< screenWidth / 2), la vista previa sale a la derecha; si no, a la izquierda
    const side = cursorX < screenWidth / 2 ? 'right' : 'left';
    setPreviewSide(side);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveCard(card);
      setActiveInstance(instance || null);
    }, 100);
  };

  const hidePreview = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveCard(null);
    setActiveInstance(null);
  };

  const setIsDragging = (dragging: boolean) => {
    setIsDraggingState(dragging);
    if (dragging) {
      hidePreview();
    }
  };

  const openCardDetails = (card: CardDefinition) => {
    hidePreview();
    setDetailsCard(card);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mtgc_open_details = openCardDetails;
      (window as any).__mtgc_preview_context = {
        showPreview,
        hidePreview,
        openCardDetails,
        closeCardDetails,
      };
    }
  }, []);

  const closeCardDetails = () => {
    setDetailsCard(null);
  };

  const activeKeywords = activeInstance?.keywords || [];
  const activeCounters = Object.entries(activeInstance?.counters || {}).filter(
    ([_, count]) => count > 0,
  );
  const hasExplanations = activeKeywords.length > 0 || activeCounters.length > 0;

  return (
    <CardPreviewContext.Provider
      value={{ showPreview, hidePreview, setIsDragging, openCardDetails, closeCardDetails }}
    >
      {children}
      {/* Vista previa de carta centrada en la mitad opuesta con panel explicativo (Punto 5) */}
      {activeCard && !isDragging && (
        <Portal>
          <div
            data-testid="card-preview-overlay"
            style={{
              position: 'fixed',
              top: '50%',
              left: previewSide === 'right' ? '75%' : '25%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              pointerEvents: 'none',
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
            }}
            className="select-none animate-in fade-in duration-100 flex items-center justify-center"
          >
            <div
              data-testid="card-preview-image-wrapper"
              style={{
                width: 'min(360px, 32vw)',
                aspectRatio: '5/7',
                filter: 'drop-shadow(0 20px 35px rgba(0, 0, 0, 0.75))',
                background: 'transparent',
                border: 'none',
              }}
              className="rounded-[4.5%] overflow-hidden flex-shrink-0 relative"
            >
              <CardDisplay
                card={activeCard}
                allowFaceToggle={false}
                className="bg-transparent border-0 shadow-none"
              />

              {/* Insignias de Palabras Clave y Contadores directamente sobre la carta en lista vertical hacia abajo */}
              {hasExplanations && (
                <div
                  data-testid="preview-keywords-counters-panel"
                  className="absolute top-12 left-3 z-30 pointer-events-none flex flex-col space-y-1.5 animate-in fade-in duration-100 max-w-[85%]"
                >
                  {/* Palabras Clave */}
                  {activeKeywords.length > 0 &&
                    activeKeywords.map(kwId => {
                      const def = getKeywordDefinition(kwId);
                      const label = def?.label || kwId;

                      return (
                        <div
                          key={kwId}
                          data-preview-item="true"
                          data-testid={`preview-keyword-${kwId}`}
                          className="flex items-center space-x-1.5 bg-[#092328]/90 border border-[#12544F] px-2.5 py-1 rounded-lg shadow-lg shadow-black/70 backdrop-blur-md"
                        >
                          <MtgKeywordIcon
                            keyword={kwId}
                            className="w-4 h-4 flex-shrink-0 text-[#8BBB92]"
                          />
                          <span className="text-xs font-bold text-white tracking-wide drop-shadow-xs">
                            {label}
                          </span>
                        </div>
                      );
                    })}

                  {/* Contadores */}
                  {activeCounters.length > 0 &&
                    activeCounters.map(([type, count]) => {
                      const def = getCounterDefinition(type);
                      const label = def?.label || type;
                      const isPlus = type === '+1/+1';
                      const isMinus = type === '−1/−1' || type === '-1/-1';
                      const countDisplay = isPlus
                        ? `+${count}`
                        : isMinus
                          ? `-${count}`
                          : `×${count}`;

                      return (
                        <div
                          key={type}
                          data-preview-item="true"
                          data-testid={`preview-counter-${type}`}
                          className="flex items-center space-x-2 bg-[#092328]/90 border border-[#12544F] px-2.5 py-1 rounded-lg shadow-lg shadow-black/70 backdrop-blur-md"
                        >
                          <MtgCounterIcon
                            counterType={type}
                            className="w-4 h-4 flex-shrink-0 text-[#8BBB92]"
                          />
                          <span className="text-xs font-bold text-white tracking-wide drop-shadow-xs">
                            {label}
                          </span>
                          <span
                            className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                              isPlus
                                ? 'text-[#8BBB92] bg-[#12544F] border border-[#2A835F]'
                                : isMinus
                                  ? 'text-rose-300 bg-rose-950/80 border border-rose-800'
                                  : 'text-[#8BBB92] bg-[#040d0f] border border-[#12544F]'
                            }`}
                          >
                            {countDisplay}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Modal / Panel 'Ver carta' detallado con dictámenes oficiales, artista y copyright (Punto 4) */}
      {detailsCard && (
        <Portal>
          <CardDetailsModal card={detailsCard} onClose={closeCardDetails} />
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
      openCardDetails: () => {},
      closeCardDetails: () => {},
    };
  }
  return ctx;
};
