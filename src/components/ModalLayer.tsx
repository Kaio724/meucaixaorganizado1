import { useEffect, useState, type ComponentProps, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

let openLayers = 0;
let previousOverflow = '';

/** Keep dialogs outside transformed page containers and inside the visible keyboard viewport. */
export default function ModalLayer({ children, className = '', style, ...props }: ComponentProps<'div'>) {
  const [viewport, setViewport] = useState(() => ({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 }));
  useEffect(() => {
    const update = () => setViewport({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 });
    const visibleViewport = window.visualViewport;
    visibleViewport?.addEventListener('resize', update);
    visibleViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    if (openLayers++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    update();
    return () => {
      visibleViewport?.removeEventListener('resize', update);
      visibleViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      if (--openLayers === 0) document.body.style.overflow = previousOverflow;
    };
  }, []);
  return createPortal(<div {...props} className={`modal-layer ${className}`} style={{ ...style, top: viewport.top, bottom: 'auto', height: viewport.height, '--modal-height': `${viewport.height}px` } as CSSProperties}>{children}</div>, document.body);
}
