import React from 'react';
import { BunMascot } from '@/components/ui/BunMascot';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="border-t-2 border-desk-grain">
      <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BunMascot size={26} pose="happy" />
          <p className="text-xs text-[#b9aac9] max-w-sm">
            Made by hand, one pixel at a time. PixiBun runs entirely in your
            browser; nothing you draw ever leaves this tab.
          </p>
        </div>
        <a
          href="#top"
          className="text-xs font-mono text-[#cdbfdf] hover:text-[#ede8f4] underline decoration-[#5e4d73] underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp rounded-[2px]"
        >
          Back to the top
        </a>
      </div>
    </footer>
  );
};