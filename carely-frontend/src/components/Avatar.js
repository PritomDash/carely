import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { API_BASE } from '../services/api';

const SIZE_PRESETS = { sm: 32, md: 48, lg: 96 };

// Soft, pleasant, distinguishable at small sizes, all dark/saturated enough
// for white text to sit on top with good contrast.
const PALETTE = [
  '#3B82F6', // blue
  '#16A34A', // green
  '#8B5CF6', // purple
  '#0D9488', // teal
  '#D97706', // amber
  '#E11D48', // coral
  '#6366F1', // indigo
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash);
};

// First letter of first word + first letter of last word - "Pritom Dash"
// -> "PD", "Hridi" -> "H". Never more than 2 letters.
const getInitials = (name) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/);
  const first = words[0][0] || '';
  const last = words.length > 1 ? (words[words.length - 1][0] || '') : '';
  return (first + last).toUpperCase().slice(0, 2);
};

// Deterministic - the same name always lands on the same color,
// regardless of incidental case/whitespace differences.
const colorForName = (name) => {
  const trimmed = (name || '').trim().toLowerCase();
  if (!trimmed) return '#94A3B8';
  return PALETTE[hashString(trimmed) % PALETTE.length];
};

// Resolves a raw backend file path into a working <img> src - the same
// transform every page used to duplicate locally as its own `fileUrl()`
// helper. Anything already a usable URL (an absolute http(s) link, a local
// blob: preview from a just-picked file, or a data: URI) passes through
// unchanged instead of being mangled by the path-rewrite below.
const resolvePhotoUrl = (raw) => {
  if (!raw) return null;
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  const filename = String(raw).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${filename}`;
};

// Fallback avatar used everywhere a user's photo circle shows: real photo
// when there is one, initials-on-a-color when there isn't, a neutral user
// icon when there isn't even a name. A broken image URL (onError) falls
// back to the same initials automatically instead of showing nothing.
export default function Avatar({ user, name, photo, size = 'md', className, style }) {
  const resolvedName = name ?? user?.name ?? '';
  const rawPhoto = photo ?? user?.profilePhoto ?? user?.photo ?? user?.profilePic ?? user?.avatar ?? null;
  const photoUrl = resolvePhotoUrl(rawPhoto);

  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [photoUrl]);

  const px = typeof size === 'number' ? size : (SIZE_PRESETS[size] || SIZE_PRESETS.md);
  const initials = getInitials(resolvedName);
  const bg = colorForName(resolvedName);
  const showPhoto = photoUrl && !imgFailed;

  return (
    <div
      className={className}
      style={{
        width: px, height: px, borderRadius: '50%', overflow: 'hidden',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color: '#fff', fontWeight: 700,
        fontSize: Math.max(11, Math.round(px * 0.4)),
        userSelect: 'none',
        ...style,
      }}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={resolvedName || 'User'}
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User size={Math.round(px * 0.5)} strokeWidth={2} />
      )}
    </div>
  );
}
