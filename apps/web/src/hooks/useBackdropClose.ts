import { useRef, useCallback } from 'react';

/**
 * Hook to safely handle modal backdrop clicks without closing when a drag/selection
 * started inside the modal content and ended outside on the backdrop. (Tarea 3)
 */
export function useBackdropClose(onClose?: () => void) {
  const isMouseDownOnBackdropRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) {
      isMouseDownOnBackdropRef.current = true;
    } else {
      isMouseDownOnBackdropRef.current = false;
    }
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (isMouseDownOnBackdropRef.current && e.target === e.currentTarget) {
        onClose?.();
      }
      isMouseDownOnBackdropRef.current = false;
    },
    [onClose],
  );

  return {
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
  };
}
