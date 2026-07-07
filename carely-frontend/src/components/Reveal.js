import React from 'react';
import useReveal from '../hooks/useReveal';

// Generic scroll-reveal wrapper. `direction` picks which CSS class animates
// in ("up" | "left"); `delay` (ms) staggers a group of siblings.
export default function Reveal({ children, direction = 'up', delay = 0, style, className = '' }) {
  const [ref, visible] = useReveal();
  const directionClass = direction === 'left' ? 'reveal-left' : 'reveal-up';

  return (
    <div
      ref={ref}
      className={`${directionClass} ${visible ? 'reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms', ...style }}
    >
      {children}
    </div>
  );
}
