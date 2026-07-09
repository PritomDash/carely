import React from 'react';

// The entire visual treatment for a boosted profile: one small gold star
// inline after the name. Deliberately no ribbon, no "BOOSTED" text, no
// colored border, no background tint - restraint reads as quality, and a
// loud badge would look like a used-car-lot gimmick next to a real name.
export default function BoostStar({ title = 'Boosted profile' }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: 'inline-block',
        color: '#F59E0B',
        fontSize: 14,
        marginLeft: 4,
        verticalAlign: 'baseline',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))',
        cursor: 'default',
      }}
    >
      ★
    </span>
  );
}
