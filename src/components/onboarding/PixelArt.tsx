import React from 'react';

/**
 * Tiny pixel icons drawn from ASCII rows, so onboarding art stays crisp at any
 * size and lives next to the code. '.' is transparent; other characters index
 * the palette.
 */
export const PixelArt: React.FC<{ rows: readonly string[]; palette: Readonly<Record<string, string>>; size?: number; className?: string }> = ({ rows, palette, size = 32, className }) => {
  const width = Math.max(...rows.map(row => row.length));
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = palette[row[x]];
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }
  });
  return (
    <svg viewBox={`0 0 ${width} ${rows.length}`} width={size} height={(size * rows.length) / width} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {rects}
    </svg>
  );
};

export const ICONS = {
  seedling: {
    rows: ['.....gg...', '....ggG...', '.gg..G....', 'gGGg.G....', '.gg..G....', '.....G....', '..bbbbbb..', '..bBBBBb..', '...bBBb...', '...bbbb...'],
    palette: { g: '#9be36a', G: '#5aa83c', b: '#7a4a2a', B: '#b8754a' },
  },
  sprite: {
    rows: ['..k....k..', '.kpk..kpk.', '.kppkkppk.', 'kppppppppk', 'kpwkppkwpk', 'kppppppppk', '.kpprrppk.', '..kppppk..', '...kkkk...'],
    palette: { k: '#2a1a3a', p: '#c792df', w: '#ffffff', r: '#ff8fb3' },
  },
  crown: {
    rows: ['y...y...y.', 'yy.yyy.yy.', 'yyyyyyyyy.', 'yYrYYYbYy.', 'yyyyyyyyy.', 'YYYYYYYYY.'],
    palette: { y: '#ffd285', Y: '#d89a55', r: '#ff6b8a', b: '#5fb8ff' },
  },
  canvas: {
    rows: ['wwwwwwwwww', 'w........w', 'w........w', 'w....s...w', 'w...sss..w', 'w....s...w', 'w........w', 'wwwwwwwwww'],
    palette: { w: '#8a5a3a', s: '#ffd285' },
  },
  book: {
    rows: ['.rrrr.rrrr', 'rpppprpppp', 'rpllpRpllp', 'rpppprpppp', 'rpllpRpllp', 'rpppprpppp', '.rrrrRrrrr'],
    palette: { r: '#7a3a5e', R: '#4a2038', p: '#fff3e0', l: '#c7a8d8' },
  },
  sun: {
    rows: ['....y....', '.y.....y.', '...yyy...', '..yYYYy..', 'y.yYYYy.y', '..yYYYy..', '...yyy...', '.y.....y.', '....y....'],
    palette: { y: '#ffd285', Y: '#ffb347' },
  },
  moon: {
    rows: ['...mmm...', '..mmm....', '.mmm.....', '.mmm.....', '.mmm.....', '.mmmm..m.', '..mmmmmm.', '...mmmm..'],
    palette: { m: '#fff1cf' },
  },
} as const;
