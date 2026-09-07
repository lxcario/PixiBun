'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'primary' | 'secondary';
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number, k = (n + h / 60) % 6) =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [
    Math.round(f(5) * 255),
    Math.round(f(3) * 255),
    Math.round(f(1) * 255),
  ];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), s, v];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const {
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    addCustomColorToPalette,
    currentPaletteId,
  } = useStudioStore();

  const currentColor = target === 'primary' ? primaryColor : secondaryColor;

  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [val, setVal] = useState(1);
  const [hexInput, setHexInput] = useState(currentColor);

  const satValRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);

  // Sync initial color
  useEffect(() => {
    if (isOpen && currentColor) {
      try {
        const [r, g, b] = hexToRgb(currentColor);
        const [h, s, v] = rgbToHsv(r, g, b);
        setHue(h);
        setSat(s);
        setVal(v);
        setHexInput(currentColor);
      } catch {
        // Fallback
      }
    }
  }, [isOpen, currentColor]);

  const [r, g, b] = hsvToRgb(hue, sat, val);
  const hex = rgbToHex(r, g, b);

  const updateColorFromHsv = useCallback(
    (newH: number, newS: number, newV: number) => {
      const [nr, ng, nb] = hsvToRgb(newH, newS, newV);
      const newHex = rgbToHex(nr, ng, nb);
      setHexInput(newHex);
      if (target === 'primary') {
        setPrimaryColor(newHex);
      } else {
        setSecondaryColor(newHex);
      }
    },
    [target, setPrimaryColor, setSecondaryColor]
  );

  const handleSatValPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = satValRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const newSat = x / rect.width;
    const newVal = 1 - y / rect.height;

    setSat(newSat);
    setVal(newVal);
    updateColorFromHsv(hue, newSat, newVal);
  };

  const handleHexSubmit = (newHex: string) => {
    setHexInput(newHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      const [nr, ng, nb] = hexToRgb(newHex);
      const [h, s, v] = rgbToHsv(nr, ng, nb);
      setHue(h);
      setSat(s);
      setVal(v);
      if (target === 'primary') {
        setPrimaryColor(newHex);
      } else {
        setSecondaryColor(newHex);
      }
    }
  };

  const handleAddToPalette = () => {
    addCustomColorToPalette(currentPaletteId, hex);
  };

  const pureHueColor = rgbToHex(...hsvToRgb(hue, 1, 1));

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={`Pick Custom ${target === 'primary' ? 'Primary' : 'Secondary'} Color`}
      maxWidth="w-[380px]"
    >
      <div className="flex flex-col gap-3 text-xs font-mono">
        {/* 1. 2D Saturation / Value Gradient Map */}
        <div
          ref={satValRef}
          onPointerDown={(e) => {
            isDraggingSatVal.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            handleSatValPointer(e);
          }}
          onPointerMove={(e) => {
            if (isDraggingSatVal.current) handleSatValPointer(e);
          }}
          onPointerUp={() => {
            isDraggingSatVal.current = false;
          }}
          className="relative w-full h-44 rounded-[2px] border-2 border-[var(--desk-border)] cursor-crosshair overflow-hidden touch-none select-none shadow-inner"
          style={{
            backgroundColor: pureHueColor,
            backgroundImage: `
              linear-gradient(to right, #ffffff, transparent),
              linear-gradient(to top, #000000, transparent)
            `,
          }}
        >
          {/* Picker Crosshair Ring */}
          <div
            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-[#ffffff] shadow-[0_0_2px_#000000] pointer-events-none"
            style={{
              left: `${sat * 100}%`,
              top: `${(1 - val) * 100}%`,
            }}
          />
        </div>

        {/* 2. Rainbow Hue Slider */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--text-body)] font-bold uppercase">Hue</span>
          <input
            type="range"
            aria-label="Color hue"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => {
              const newH = parseInt(e.target.value, 10);
              setHue(newH);
              updateColorFromHsv(newH, sat, val);
            }}
            className="w-full h-4 rounded-[2px] cursor-pointer appearance-none border border-[var(--desk-border)]"
            style={{
              background: `linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)`,
            }}
          />
        </div>

        {/* 3. Live Preview & Hex Input & RGB Readouts */}
        <div className="grid grid-cols-[64px_1fr] gap-3 items-center bg-[var(--desk-surface)] p-2.5 rounded-[2px] border border-[var(--desk-border)]">
          {/* Swatch Preview */}
          <div
            className="w-16 h-12 rounded-[2px] border-2 border-[#ffffff] shadow-md"
            style={{ backgroundColor: hex }}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-body)] font-bold">HEX:</span>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexSubmit(e.target.value)}
                maxLength={7}
                className="bg-[var(--desk-surface)] text-[#f0be7c] font-bold px-2 py-0.5 rounded-[2px] border border-[var(--desk-border)] focus:border-[#f0be7c] outline-none text-xs w-28 uppercase"
              />
            </div>
            <div className="text-[10px] text-[#a89ab8]">
              R: {r} · G: {g} · B: {b}
            </div>
          </div>
        </div>

        {/* 4. Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-[var(--desk-border)]">
          <button
            onClick={handleAddToPalette}
            className="text-[11px] font-bold text-[#f0be7c] hover:text-[#fff8db] bg-[var(--desk-surface)] px-2.5 py-1 rounded-[2px] border border-[var(--desk-border)] hover:border-[#f0be7c] cursor-pointer transition-colors"
          >
            + Save to Palette
          </button>

          <TactileButton
            size="sm"
            variant="primary"
            onClick={onClose}
            className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120]"
          >
            Select Color
          </TactileButton>
        </div>
      </div>
    </ModalWrapper>
  );
};
