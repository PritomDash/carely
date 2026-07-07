import React, { useEffect, useState } from 'react';
import useReveal from '../hooks/useReveal';

// Parses "500+" / "64" / "100%" into a numeric target plus its prefix/suffix,
// then counts up from 0 once scrolled into view. Falls back to the plain
// text immediately for anything it can't parse, or when the visitor has
// prefers-reduced-motion set.
export default function CountUpStat({ value, className, style }) {
  const [ref, visible] = useReveal();
  const match = String(value).match(/^(\D*)(\d+)(\D*)$/);
  const target = match ? parseInt(match[2], 10) : null;
  const prefix = match ? match[1] : '';
  const suffix = match ? match[3] : '';

  const [display, setDisplay] = useState(target === null ? value : 0);

  useEffect(() => {
    if (!visible || target === null) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplay(target);
      return;
    }

    const duration = 1200;
    const start = performance.now();

    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, target]);

  return (
    <div ref={ref} className={className} style={style}>
      {target === null ? value : `${prefix}${display}${suffix}`}
    </div>
  );
}
