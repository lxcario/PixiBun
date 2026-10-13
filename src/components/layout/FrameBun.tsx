'use client';

import React, { useEffect, useState } from 'react';
import { BunMascot } from '@/components/ui/BunMascot';
import { useThemeStore } from '@/stores/themeStore';
import { useStudioStore } from '@/stores/studioStore';

/**
 * Moonlit only: Bun perched on the top edge of the canvas frame, legs dangling,
 * keeping you company while you draw. Bun perks up for a moment whenever the
 * artwork changes, then settles back to a sleepy blink. Purely decorative.
 */
export const FrameBun: React.FC = () => {
  const moonlit = useThemeStore((s) => s.studioTheme) === 'moonlit';
  const frames = useStudioStore((s) => s.frames);
  const [cheer, setCheer] = useState(0);
  const [happy, setHappy] = useState(false);

  useEffect(() => {
    if (!moonlit) return;
    setCheer((n) => n + 1);
    setHappy(true);
    const id = window.setTimeout(() => setHappy(false), 900);
    return () => window.clearTimeout(id);
  }, [frames, moonlit]);

  if (!moonlit) return null;
  return (
    <div aria-hidden="true" className="frame-bun absolute -top-[60px] right-6 z-10 pointer-events-none">
      <span key={cheer} className={cheer > 1 ? 'bun-hop block' : 'block'}>
        <BunMascot size={48} pose={happy ? 'happy' : 'idle'} animate={!happy} />
      </span>
      {/* little feet over the frame edge */}
      <span className="absolute left-[15px] top-[44px] w-[6px] h-[8px] bg-[#f2ecf7] border-x-2 border-b-2 border-[#3a2e4c]" />
      <span className="absolute left-[27px] top-[44px] w-[6px] h-[8px] bg-[#f2ecf7] border-x-2 border-b-2 border-[#3a2e4c]" />
    </div>
  );
};
