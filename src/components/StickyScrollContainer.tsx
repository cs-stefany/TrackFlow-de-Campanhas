import { useRef, useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StickyScrollContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container que mantém uma barra de rolagem horizontal sempre visível
 * no bottom da viewport, permitindo rolar lateralmente sem precisar
 * descer até o final da tabela.
 */
export function StickyScrollContainer({ children, className }: StickyScrollContainerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const stickyScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [containerLeft, setContainerLeft] = useState(0);

  // Atualiza as dimensões quando o conteúdo muda
  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        setScrollWidth(contentRef.current.scrollWidth);
        setClientWidth(contentRef.current.clientWidth);
        const rect = contentRef.current.getBoundingClientRect();
        setContainerLeft(rect.left);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    window.addEventListener('scroll', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
    };
  }, [children]);

  // Sincroniza o scroll do conteúdo -> scrollbar sticky
  const handleContentScroll = () => {
    if (contentRef.current && stickyScrollRef.current) {
      stickyScrollRef.current.scrollLeft = contentRef.current.scrollLeft;
    }
  };

  // Sincroniza o scroll da scrollbar sticky -> conteúdo
  const handleStickyScroll = () => {
    if (contentRef.current && stickyScrollRef.current) {
      contentRef.current.scrollLeft = stickyScrollRef.current.scrollLeft;
    }
  };

  const needsScroll = scrollWidth > clientWidth;

  return (
    <div className={cn("relative", className)}>
      {/* Container principal com scroll horizontal */}
      <div
        ref={contentRef}
        className="overflow-x-auto scrollbar-hide"
        onScroll={handleContentScroll}
        style={{
          // Esconde a scrollbar nativa
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>

      {/* Scrollbar sticky no bottom da viewport - sempre visível quando necessário */}
      {needsScroll && (
        <div
          className="fixed bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg"
          style={{
            left: containerLeft,
            width: clientWidth,
          }}
        >
          <div
            ref={stickyScrollRef}
            className="overflow-x-auto py-2"
            onScroll={handleStickyScroll}
            style={{
              // Mostra a scrollbar
              scrollbarWidth: 'auto',
            }}
          >
            {/* Elemento invisível que define a largura do scroll */}
            <div style={{ width: scrollWidth, height: 1 }} />
          </div>
        </div>
      )}

      {/* CSS para esconder scrollbar do container principal */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
