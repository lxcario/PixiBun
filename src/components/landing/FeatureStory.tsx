import React from 'react';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';

interface StoryItem {
  icon: PixelIconName;
  heading: string;
  body: string;
}

const STORY: StoryItem[] = [
  {
    icon: 'layers',
    heading: 'Layers without ceremony',
    body:
      'Stack them, blend them, nudge opacity, merge down. The boring fundamentals, done properly and kept out of your way.',
  },
  {
    icon: 'onion',
    heading: 'Animation you can feel',
    body:
      'Flip frames with onion ghosts trailing behind you, then ship a looping GIF the moment the timing clicks.',
  },
  {
    icon: 'palette',
    heading: 'Color with a spine',
    body:
      'Curated palettes and generated OKLCH ramps keep every shade related, from highlight down to shadow.',
  },
  {
    icon: 'export',
    heading: 'Yours, locally',
    body:
      'Autosave lives in your browser. Projects pack into .pixibun files you can email, stash, or reopen next year.',
  },
];

export const FeatureStory: React.FC = () => {
  return (
    <section className="max-w-5xl mx-auto px-6 py-14">
      <h2 className="font-display text-2xl text-[#ede8f4]">
        Small studio, complete toolbox
      </h2>
      <p className="mt-2 text-sm text-[#cdbfdf] max-w-lg">
        Everything below runs on a hand-rolled canvas engine. No frameworks
        faking pixels, no cloud round-trips mid-stroke.
      </p>

      <div className="mt-9 flex flex-col divide-y divide-desk-grain border-y-2 border-desk-grain">
        {STORY.map((item) => (
          <article key={item.heading} className="py-5 flex gap-5 items-start">
            <span className="shrink-0 w-10 h-10 flex items-center justify-center rounded-[4px] border-2 border-desk-grain bg-lamp/10 texture-dither-light text-lamp mt-0.5">
              <PixelIcon name={item.icon} size={18} />
            </span>
            <div>
              <h3 className="font-bold text-[#ede8f4]">{item.heading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#b9aac9] max-w-xl">
                {item.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};