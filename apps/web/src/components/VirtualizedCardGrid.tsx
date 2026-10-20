import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CardInstance } from '@mtgc/shared';

interface VirtualizedCardGridProps {
  items: CardInstance[];
  renderItem: (card: CardInstance, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
  disableVirtualization?: boolean;
}

export const VirtualizedCardGrid: React.FC<VirtualizedCardGridProps> = ({
  items,
  renderItem,
  className = '',
  emptyMessage = 'No hay cartas para mostrar',
  disableVirtualization = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(600);

  // Measure container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      setContainerHeight(el.clientHeight || 600);
      setContainerWidth(el.clientWidth || 600);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Determine number of columns based on container width: 3 below 540px, 4 above
  const columns = useMemo(() => {
    if (containerWidth < 540) return 3;
    return 4;
  }, [containerWidth]);

  // Card dimensions: small cards are 146x204 aspect ratio (~1:1.4) + label (~25px) + gap
  const estimatedRowHeight = 220;
  const totalRows = Math.ceil(items.length / columns);

  // Overscan of 2 rows above and below
  const overscan = 2;
  const startRow = Math.max(0, Math.floor(scrollTop / estimatedRowHeight) - overscan);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / estimatedRowHeight) + overscan,
  );

  const isVirtualized =
    !disableVirtualization &&
    typeof window !== 'undefined' &&
    !(window as any).__disableVirtualization &&
    items.length > 20;

  const visibleItems = useMemo(() => {
    if (!isVirtualized) {
      return items.map((card, idx) => ({ card, index: idx }));
    }
    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length, endRow * columns);
    return items.slice(startIndex, endIndex).map((card, offset) => ({
      card,
      index: startIndex + offset,
    }));
  }, [items, isVirtualized, startRow, endRow, columns]);

  const topSpacerHeight = isVirtualized ? startRow * estimatedRowHeight : 0;
  const bottomSpacerHeight = isVirtualized
    ? Math.max(0, (totalRows - endRow) * estimatedRowHeight)
    : 0;

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs italic ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-virtualized-grid="true"
      data-total-items={items.length}
      data-virtualized={isVirtualized ? 'true' : 'false'}
      className={`flex-1 overflow-y-auto p-4 ${className}`}
      style={{ position: 'relative' }}
    >
      {topSpacerHeight > 0 && (
        <div style={{ height: `${topSpacerHeight}px`, width: '100%' }} aria-hidden="true" />
      )}

      <div className={`grid ${columns === 3 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'} gap-3`}>
        {visibleItems.map(({ card, index }) => (
          <React.Fragment key={card.instanceId || index}>{renderItem(card, index)}</React.Fragment>
        ))}
      </div>

      {bottomSpacerHeight > 0 && (
        <div style={{ height: `${bottomSpacerHeight}px`, width: '100%' }} aria-hidden="true" />
      )}
    </div>
  );
};
