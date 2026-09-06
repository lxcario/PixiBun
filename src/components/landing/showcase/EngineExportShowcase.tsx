'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
    "app": "PixiBun Atelier",
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
    "app": "PixiBun Atelier",
    "version": "1.0",
    "format": "RGBA8888",
    "scale": "1"
  }
}`;

const APNG_SPECS = `/* Animated PNG (APNG) Specification Implementation */
- Official W3C APNG Format Specification (2004)
- True 24-Bit / 32-Bit RGBA Lossless Color Storage
- Chunks Generated:
  • acTL (Animation Control Chunk: num_frames=4, num_plays=0 [loop])
  • fcTL (Frame Control Chunk: sequence=0..3, delay_num=125, delay_den=1000)
  • fdAT (Frame Data Chunks with uncompressed DEFLATE store blocks [BTYPE 00])
  • IEND (Image End Terminator)

/* Comparison vs Legacy GIF: */
Feature               APNG (PixiBun)           Legacy GIF
--------------------------------------------------------------
Color Depth           24-bit / 32-bit RGBA     8-bit (Max 256 colors)
Alpha Transparency    256 levels of alpha      1-bit binary mask (matte halos)
Color Banding         Zero quantization noise  Severe posterization & dithering
Browser Support       Chrome, Safari, Firefox  Universal
Game Engine Import    Godot 4, Raylib, PixiJS  Standard`;

const GIF_SPECS = `/* Multi-Threaded Web Worker Animated GIF Pipeline */
- Zero main-thread UI jank: encodes in Web Worker
- Octree & NeuQuant high-speed perceptual color quantization
- Per-frame variable duration delays (100ms - 1000ms)
- Crisp integer pixel scale multipliers: 1x, 2x, 4x, 8x, 16x
- Optional Bayer 4x4 or Atkinson error diffusion dithering

Export Command in Studio:
const blob = await exportAnimationToGifAsync(frameCanvases, {
  fps: 12,
  scale: 4,
  loop: 0,
  dither: 'atkinson'
});`;

export const EngineExportShowcase: React.FC = () => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('godot');
  const [copied, setCopied] = useState<boolean>(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* Left interactive code viewer (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Code Box Container */}
        <div className="w-full max-w-[460px] bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-lg select-none overflow-hidden">
          {/* Format Tabs Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--desk-surface-raised)] border-b border-[var(--desk-border)]">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400/80 inline-block mr-0.5" />
              <span className="w-2 h-2 rounded-full bg-yellow-400/80 inline-block mr-0.5" />
              <span className="w-2 h-2 rounded-full bg-green-400/80 inline-block mr-2" />
              <span className="text-[11px] font-mono text-[var(--accent-gold)] font-bold">
                ENGINE EXPORTS
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="px-2 py-0.5 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[10px] font-mono text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
              >
                {copied ? '✔ Copied! ✦' : 'Copy Code'}
              </button>
              <button
                onClick={handleDownloadSample}
                className="px-2 py-0.5 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[10px] font-mono text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
              >
                Download
              </button>
            </div>
          </div>

          {/* Format Switcher Pills */}
          <div className="grid grid-cols-5 p-1.5 bg-[var(--desk-surface)] border-b border-[var(--desk-border)] gap-1 text-[11px] font-mono">
            {[
              { id: 'godot', label: 'Godot 4' },
              { id: 'unity', label: 'Unity' },
              { id: 'phaser', label: 'Phaser 3' },
              { id: 'apng', label: 'APNG' },
              { id: 'gif', label: 'GIF' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setActiveFormat(fmt.id as ExportFormat)}
                className={`py-1 text-center rounded-[1px] border transition-colors ${
                  activeFormat === fmt.id
                    ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                    : 'bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          {/* Syntax Code View */}
          <div className="p-3 bg-[#171124] overflow-x-auto text-[11px] font-mono text-[#dcd4e8] leading-relaxed max-h-[260px] select-text">
            <pre className="whitespace-pre">{getCode()}</pre>
          </div>

          {/* Bottom Feature Badges */}
          <div className="px-3 py-1.5 bg-[var(--desk-surface-raised)] border-t border-[var(--desk-border)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1 text-[var(--accent-gold)]">
              <span>✦</span>
              <span>Direct Drag-and-Drop</span>
            </span>
            <span>Zero Lock-In Standard</span>
          </div>
        </div>
      </div>

      {/* Right Explanation & Engine Architecture (5 cols) */}
      <div className="lg:col-span-5 flex flex-col items-start text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[11px] font-mono text-[var(--accent-gold)] mb-3">
          <span>07 / GAME ENGINE INTEROPERABILITY</span>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl text-[var(--text-heading)] leading-tight mb-3">
          Game-Ready Engine Exports: Godot 4, Unity, APNG &amp; GIF
        </h3>

        <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-body)] mb-4 font-sans">
          Your artwork is meant to be played. PixiBun bridges the gap between drawing and shipping games with zero vendor lock-in.
          Export native engine resources directly into your project folders.
        </p>

        {/* Feature Points Card */}
        <div className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] p-4 mb-5 space-y-3 font-mono text-xs">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Godot 4 SpriteFrames (.tres)</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Generates native Godot 4 text resources with AtlasTexture regions and tagged animation loops. Drop right into your filesystem.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-plum)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">TexturePacker Array JSON (Unity &amp; Phaser)</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Exports universal spritesheet JSON metadata supported natively by Unity 2D, Phaser 3, PixiJS, and Raylib.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">24-Bit Truecolor APNG (No GIF Banding)</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Full 32-bit RGBA animated PNG encoding with smooth translucent shadows—no 256-color degradation or dithering noise.
              </span>
            </div>
          </div>
        </div>

        {/* CTA to studio */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[2px] pixel-primary-btn text-xs font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
        >
          <span>EXPORT ASSETS IN STUDIO</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
};
