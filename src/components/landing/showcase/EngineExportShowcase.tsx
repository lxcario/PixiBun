'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShowcaseNote } from './ShowcaseNote';
import { Dot, Picker, ToolWindow } from './ToolKit';
import { drawBun, type BunPose } from '@/lib/art/bunSprite';

type ExportFormat = 'godot' | 'unity' | 'phaser' | 'apng' | 'gif';

const GODOT_SAMPLE = `[gd_resource type="SpriteFrames" load_steps=6 format=3]

[ext_resource type="Texture2D" path="res://sprites/bun_walk.png" id="1_tex"]

[sub_resource type="AtlasTexture" id="AtlasTexture_0"]
atlas = ExtResource("1_tex")
region = Rect2(0, 0, 16, 16)

[sub_resource type="AtlasTexture" id="AtlasTexture_1"]
atlas = ExtResource("1_tex")
region = Rect2(16, 0, 16, 16)

[sub_resource type="AtlasTexture" id="AtlasTexture_2"]
atlas = ExtResource("1_tex")
region = Rect2(32, 0, 16, 16)

[sub_resource type="AtlasTexture" id="AtlasTexture_3"]
atlas = ExtResource("1_tex")
region = Rect2(48, 0, 16, 16)

[resource]
animations = [{
"frames": [{
"duration": 1.0,
"texture": SubResource("AtlasTexture_0")
}, {
"duration": 1.0,
"texture": SubResource("AtlasTexture_1")
}, {
"duration": 2.0,
"texture": SubResource("AtlasTexture_2")
}, {
"duration": 1.0,
"texture": SubResource("AtlasTexture_3")
}],
"loop": true,
"name": &"walk",
"speed": 8.0
}]`;

const UNITY_SAMPLE = `{
  "frames": [
    {
      "filename": "bun_walk_0.png",
      "frame": { "x": 0, "y": 0, "w": 16, "h": 16 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
      "sourceSize": { "w": 16, "h": 16 },
      "duration": 125
    },
    {
      "filename": "bun_walk_1.png",
      "frame": { "x": 16, "y": 0, "w": 16, "h": 16 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
      "sourceSize": { "w": 16, "h": 16 },
      "duration": 125
    },
    {
      "filename": "bun_walk_2.png",
      "frame": { "x": 32, "y": 0, "w": 16, "h": 16 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
      "sourceSize": { "w": 16, "h": 16 },
      "duration": 250
    },
    {
      "filename": "bun_walk_3.png",
      "frame": { "x": 48, "y": 0, "w": 16, "h": 16 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
      "sourceSize": { "w": 16, "h": 16 },
      "duration": 125
    }
  ],
  "meta": {
    "app": "PixiBun",
    "version": "1.0",
    "image": "bun_walk.png",
    "format": "RGBA8888",
    "size": { "w": 64, "h": 16 },
    "scale": "1"
  }
}`;

const PHASER_SAMPLE = `{
  "textures": [
    {
      "image": "bun_walk_spritesheet.png",
      "size": { "w": 64, "h": 16 },
      "frames": [
        {
          "filename": "frame_000",
          "frame": { "x": 0, "y": 0, "w": 16, "h": 16 },
          "rotated": false,
          "trimmed": false,
          "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
          "sourceSize": { "w": 16, "h": 16 }
        },
        {
          "filename": "frame_001",
          "frame": { "x": 16, "y": 0, "w": 16, "h": 16 },
          "rotated": false,
          "trimmed": false,
          "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
          "sourceSize": { "w": 16, "h": 16 }
        },
        {
          "filename": "frame_002",
          "frame": { "x": 32, "y": 0, "w": 16, "h": 16 },
          "rotated": false,
          "trimmed": false,
          "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
          "sourceSize": { "w": 16, "h": 16 }
        },
        {
          "filename": "frame_003",
          "frame": { "x": 48, "y": 0, "w": 16, "h": 16 },
          "rotated": false,
          "trimmed": false,
          "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
          "sourceSize": { "w": 16, "h": 16 }
        }
      ]
    }
  ],
  "meta": {
    "app": "PixiBun",
    "version": "1.0",
    "format": "RGBA8888",
    "scale": "1"
  }
}`;

const APNG_SPECS = `PixiBun APNG export notes — text sample, not an animation

In Studio, choose Export → APNG to download your animation.
- RGBA PNG frames preserve color and partial transparency without palette quantization.
- Animation chunks carry the exported frame holds and loop setting.
- Integer scaling keeps pixels crisp; geometry and memory limits apply.
- Check playback in your intended viewer or engine.

This welcome download describes the format. It contains no artwork.`;

const GIF_SPECS = `PixiBun GIF export notes — text sample, not an animation

In Studio, choose Export → GIF to download your animation.
- The encoder quantizes colors to a GIF palette; partial alpha is not preserved.
- Frame holds are rounded to GIF's 10 ms time units.
- A Web Worker is used when available, with a main-thread fallback.
- Integer scaling, cancellation and geometry/memory limits apply.
- Check colors, timing and transparency after exporting.

This welcome download describes the format. It contains no artwork.`;

const FILE_NAMES: Record<ExportFormat, string> = {
  godot: 'bun_spriteframes.tres',
  unity: 'bun_atlas.json',
  phaser: 'bun_atlas_phaser.json',
  apng: 'apng_specification.txt',
  gif: 'gif_pipeline.txt',
};

const STRIP_FRAMES: Array<[number, BunPose]> = [
  [0, 'idle'],
  [-2, 'happy'],
  [-3, 'happy'],
  [-1, 'blink'],
];

/** Four little frames of Bun hopping, laid out like the sprite sheet you would export. */
const BunSheetStrip: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, 80, 22);
    STRIP_FRAMES.forEach(([lift, pose], i) => {
      g.fillStyle = i % 2 ? '#2a1945' : '#241640';
      g.fillRect(i * 20, 0, 20, 22);
      g.fillStyle = 'rgba(8,4,16,0.5)';
      g.fillRect(i * 20 + 5, 21, 10, 1);
      drawBun(g, i * 20 + 2, 4 + lift, pose);
    });
  }, []);
  return (
    <div className="relative w-full max-w-[480px] rounded-[3px] border-2 border-[var(--ink)] bg-[var(--surface-0)] p-2 shadow-[0_4px_0_var(--ink)]">
      <div className="flex justify-between font-mono text-[11px] text-[var(--text-muted)] mb-1.5 px-1">
        <span>sprite sheet</span>
        <span className="text-[var(--accent-gold)]">4 frames · 20×22</span>
      </div>
      <div className="relative">
        <canvas
          ref={ref}
          width={80}
          height={22}
          className="block w-full h-auto"
          style={{ imageRendering: 'pixelated', aspectRatio: '80 / 22' }}
          aria-label="Sprite sheet with four frames of Bun hopping"
        />
        <span aria-hidden="true" className="sheet-playhead absolute top-0 bottom-0 w-1/4 border-2 border-[var(--accent-gold)] rounded-[2px]" />
      </div>
    </div>
  );
};

export const EngineExportShowcase: React.FC = () => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('godot');
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState(false);
  const isSpecification = activeFormat === 'apng' || activeFormat === 'gif';

  const getCode = () => {
    switch (activeFormat) {
      case 'godot':
        return GODOT_SAMPLE;
      case 'unity':
        return UNITY_SAMPLE;
      case 'phaser':
        return PHASER_SAMPLE;
      case 'apng':
        return APNG_SPECS;
      case 'gif':
        return GIF_SPECS;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCode());
      setCopied(true); setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopyError(true); }
  };

  const handleDownloadSample = () => {
    let filename = 'bun_spriteframes.tres';
    let mimeType = 'text/plain';

    if (activeFormat === 'unity') {
      filename = 'bun_atlas.json';
      mimeType = 'application/json';
    } else if (activeFormat === 'phaser') {
      filename = 'bun_atlas_phaser.json';
      mimeType = 'application/json';
    } else if (activeFormat === 'apng') {
      filename = 'apng_specification.txt';
      mimeType = 'text/plain';
    } else if (activeFormat === 'gif') {
      filename = 'gif_pipeline.txt';
      mimeType = 'text/plain';
    }

    const blob = new Blob([getCode()], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      <div className="lg:col-span-7 flex flex-col items-center gap-5">
        <div className="w-full max-w-[480px]">
          <Picker
            label="where is it going?"
            value={activeFormat}
            onChange={(fmt) => {
              setActiveFormat(fmt);
              setCopied(false);
              setCopyError(false);
            }}
            options={[
              { value: 'godot', label: 'Godot 4', icon: <Dot color="#6a9fd4" /> },
              { value: 'unity', label: 'Unity', icon: <Dot color="#ede8f4" /> },
              { value: 'phaser', label: 'Phaser 3', icon: <Dot color="#c792df" /> },
              { value: 'apng', label: 'APNG', icon: <Dot color="#a8e092" /> },
              { value: 'gif', label: 'GIF', icon: <Dot color="#f2b8c6" /> },
            ]}
          />
        </div>

        <BunSheetStrip />

        <ToolWindow
          name={FILE_NAMES[activeFormat]}
          className="max-w-[480px]"
          status={
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-0.5 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--primary-bg)] text-[var(--primary-fg)] font-bold shadow-[0_2px_0_var(--ink)] active:translate-y-px active:shadow-none"
              >
                {copied ? 'Copied' : isSpecification ? 'Copy notes' : 'Copy sample'}
              </button>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="px-2 py-0.5 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] text-[var(--text-heading)] font-bold shadow-[0_2px_0_var(--ink)] active:translate-y-px active:shadow-none"
              >
                {isSpecification ? 'Download notes (.txt)' : 'Download sample'}
              </button>
            </span>
          }
        >
          <p className="-mt-1 mb-3 text-[12px] text-[var(--text-muted)]">
            {isSpecification
              ? 'Notes about the format. Make your own animation in the studio.'
              : 'A real example file with a sample bunny. Your own export brings its image along.'}
          </p>
          {copyError && (
            <p role="status" className="mb-3 text-[12px] text-[var(--accent-plum)]">
              Copy could not start. You can select the text or download it instead.
            </p>
          )}
          <div className="flex max-h-[240px] overflow-auto rounded-[2px] border-2 border-[var(--ink)] bg-[var(--surface-0)] font-mono text-[11px] leading-relaxed">
            <div aria-hidden="true" className="sticky left-0 shrink-0 py-2 pl-2 pr-2 text-right text-[var(--text-muted)] bg-[var(--surface-0)] select-none">
              {getCode()
                .split(/\r?\n/)
                .map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
            </div>
            <pre className={`py-2 pr-3 text-[var(--text-body)] select-text ${isSpecification ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
              {getCode()}
            </pre>
          </div>
        </ToolWindow>
      </div>

      <ShowcaseNote
        kicker="into your game"
        title="Take it straight into your game."
        body="Export a sprite sheet with the notes your engine expects. These are the actual text files, just with a sample bunny."
        tips={['Pick where your sprite is going.', 'Copy or download the example file.', 'Export your own art from the studio.']}
        cta="EXPORT FROM THE STUDIO"
      />
    </div>
  );
};
