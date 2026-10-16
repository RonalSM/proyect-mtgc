import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { CardDefinition } from '@mtgc/shared';
import { CardDisplay } from '../components/CardDisplay';
import { Portal } from '../components/Portal';

interface CardPreviewContextType {
  showPreview: (
    card: CardDefinition,
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent
  ) => void;
  hidePreview: () => void;
  setIsDragging: (isDragging: boolean) => void;
}

const CardPreviewContext = createContext<CardPreviewContextType | null>(null);

export const CardPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCard, setActiveCard] = useState<CardDefinition | null>(null);
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
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent
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
    }, 100);
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
      {/* Vista previa de carta centrada en la mitad opuesta sin contenedor ni marcos (Punto 9) */}
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
            className="select-none animate-in fade-in duration-100"
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
              className="rounded-[4.5%] overflow-hidden"
            >
              <CardDisplay
                card={activeCard}
                allowFaceToggle={false}
                className="bg-transparent border-0 shadow-none"
              />
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
