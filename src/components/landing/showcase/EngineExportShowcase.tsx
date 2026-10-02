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
                {copied ? 'Copied' : isSpecification ? 'Copy notes' : 'Copy sample'}
              </button>
              <button
                onClick={handleDownloadSample}
                className="px-2 py-0.5 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[10px] font-mono text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
              >
                {isSpecification ? 'Download notes (.txt)' : 'Download sample'}
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
                onClick={() => { setActiveFormat(fmt.id as ExportFormat); setCopied(false); setCopyError(false); }}
                aria-pressed={activeFormat === fmt.id}
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

          <p className="px-3 py-2 text-[11px] text-[var(--text-body)]">{isSpecification ? 'Text notes only. Create your own animation in Studio.' : 'Example resource text only. Export your artwork and matching image in Studio.'}</p>
          {copyError && <p role="status" className="px-3 text-[11px] text-[var(--text-body)]">Copy could not start. You can select the text or download it instead.</p>}

          {/* Syntax Code View */}
          <div className="p-3 bg-[#171124] overflow-x-auto text-[11px] font-mono text-[#dcd4e8] leading-relaxed max-h-[260px] select-text">
            <pre className={isSpecification ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}>{getCode()}</pre>
          </div>

          {/* Bottom Feature Badges */}
          <div className="px-3 py-1.5 bg-[var(--desk-surface-raised)] border-t border-[var(--desk-border)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1 text-[var(--accent-gold)]">
              <span>✦</span>
              <span>Sample files</span>
            </span>
            <span>Your artwork stays yours</span>
          </div>
        </div>
      </div>

      {/* Right Explanation & Engine Architecture (5 cols) */}
      <div className="lg:col-span-5 flex flex-col items-start text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[11px] font-mono text-[var(--accent-gold)] mb-3">
          <span>07 / GAME ENGINE INTEROPERABILITY</span>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl text-[var(--text-heading)] leading-tight mb-3">
          A little peek at your export options
        </h3>

        <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-body)] mb-4 font-sans">
          Take your pixels into a game or share a little animation. These welcome samples show resource text and format notes.
          Head to Studio to export your own artwork; check the files in your chosen engine or viewer.
        </p>

        {/* Feature Points Card */}
        <div className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] p-4 mb-5 space-y-3 font-mono text-xs">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Godot 4 SpriteFrames (.tres)</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Studio exports Godot SpriteFrames resources with atlas regions and animation holds. Keep the resource beside its matching PNG.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-plum)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">TexturePacker Array JSON (Unity &amp; Phaser)</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Studio exports spritesheet metadata. Your engine may need an importer or a small adapter; this sample includes no image.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">APNG & GIF animations in Studio</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                APNG keeps RGBA color and soft transparency. GIF uses palette colors and simpler transparency. The welcome downloads are text notes.
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
