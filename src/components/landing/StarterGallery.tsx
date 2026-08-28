'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { STARTER_TEMPLATES } from '@/lib/art/starterTemplates';
import { paintTemplate } from '@/lib/render/templateRenderer';

export const StarterGallery: React.FC = () => {
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  useEffect(() => {
    STARTER_TEMPLATES.forEach((template, i) => {
      const canvas = canvasRefs.current[i];
      if (canvas) paintTemplate(canvas, template);
    });
  }, []);

  return (
    <section className="max-w-5xl mx-auto px-6 pb-16">
      <h2 className="font-display text-2xl text-[#ede8f4]">From the starter shelf</h2>
      <p className="mt-2 text-sm text-[#cdbfdf] max-w-lg">
        Every piece below uses the same nine colors waiting in the studio.
        Take one apart, repaint it, or just say you drew it. We will not tell.
      </p>

      <div className="mt-8 flex flex-wrap gap-5 items-end">
        {STARTER_TEMPLATES.map((template, i) => (
          <figure
            key={template.id}
            className="flex flex-col bg-surface-raised border-2 border-border-dark rounded-[4px] p-3 w-[168px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_6px_18px_rgba(12,8,18,0.45)]"
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              width={160}
              height={160}
              className="w-full aspect-square pixelated border border-border-dark/40 bg-[#e9e3f0]"
            />
            <figcaption className="mt-2.5 flex-1 flex flex-col">
              <span className="font-display text-sm text-text-primary">{template.name}</span>
              <span className="mt-1 text-xs leading-relaxed text-text-secondary flex-1">
                {template.blurb}
              </span>
              <Link
                href="/studio"
                className="mt-3 text-center text-[11px] font-mono font-bold uppercase tracking-wide px-2 py-1.5 rounded-[3px] border-2 border-border-dark bg-surface-inset hover:bg-surface text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
                title="Open the studio"
              >
                Open it up
              </Link>
            </figcaption>
          </figure>
        ))}
      </div>
      {/* The wooden shelf the sprites sit on */}
      <div className="h-3 border-x-2 border-b-2 border-[#4a3542] bg-[#6e4f3e] shadow-[0_10px_24px_rgba(12,8,18,0.55)]" />
    </section>
  );
};