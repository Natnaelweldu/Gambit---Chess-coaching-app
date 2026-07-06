import React from 'react';

// Standard, classic, and completely uniform Wikipedia chess pieces
export const ChessPiece: React.FC<{ type: string; isWhite: boolean }> = ({ type, isWhite }) => {
  const pType = type.toLowerCase();
  const key = `${isWhite ? 'l' : 'd'}${pType}`;
  
  const pieceUrls: Record<string, string> = {
    lp: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    lr: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    ln: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    lb: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    lq: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    lk: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    dp: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    dr: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    dn: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    db: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    dq: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    dk: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  };

  const url = pieceUrls[key];
  if (!url) return null;

  return (
    <img 
      src={url} 
      alt={`${isWhite ? 'White' : 'Black'} ${type}`} 
      className="w-[82%] h-[82%] object-contain select-none"
      draggable={false}
    />
  );
};

// CORS-safe synthetic audio synthesis
export const playChessSound = (type: 'move' | 'capture' | 'check' | 'gameover') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'move') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'capture') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'check') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'gameover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Ignore autoplay blocks
  }
};

// Box shadow coordinate selection stable colors
export const getSquareBg = (
  r: number, 
  c: number, 
  isSelected: boolean, 
  isHighlighted: boolean, 
  isHint: boolean, 
  isLastMove: boolean,
  theme: 'classic' | 'ocean' | 'forest' | 'midnight' | 'wood' = 'midnight'
) => {
  const isDark = (r + c) % 2 === 1;

  if (isSelected) {
    return 'bg-amber-500/30 ring-2 ring-amber-400 ring-inset';
  }
  if (isHint) {
    return 'bg-emerald-500/20 ring-2 ring-emerald-400 ring-inset animate-pulse';
  }
  if (isHighlighted) {
    return 'bg-sky-500/25 ring-2 ring-sky-400 ring-inset';
  }
  if (isLastMove) {
    return isDark
      ? 'bg-amber-900/30 ring-2 ring-amber-500/25 ring-inset'
      : 'bg-amber-100/15 ring-2 ring-amber-500/25 ring-inset';
  }

  switch (theme) {
    case 'classic':
      return isDark ? 'bg-[#769656] text-[#eeeed2]' : 'bg-[#eeeed2] text-[#769656]';
    case 'ocean':
      return isDark ? 'bg-[#2f6291] text-[#dee5ed]' : 'bg-[#dee5ed] text-[#2f6291]';
    case 'forest':
      return isDark ? 'bg-[#224d34] text-[#e3eec0]' : 'bg-[#e3eec0] text-[#224d34]';
    case 'wood':
      return isDark ? 'bg-[#6b3a0e] text-amber-100' : 'bg-[#cfab7a] text-[#6b3a0e]';
    case 'midnight':
    default:
      return isDark ? 'bg-[#111827] text-[#475569]' : 'bg-[#1e293b] text-[#94a3b8]';
  }
};
