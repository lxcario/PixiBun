'use client';

import React, { useEffect, useRef } from 'react';

interface ChainLink {
  x: number;
  y: number;
  angle: number;
  isFront: boolean;
}

interface ChainStrand {
  baseX: number;
  baseY: number;
  targetLength: number;
  linkCount: number;
  links: ChainLink[];
  swaySpeed: number;
  swayAmount: number;
  phase: number;
  currentAngle: number;
  targetAngle: number;
  side: 'left' | 'right';
  hasCharm: boolean;
  charmType: 'lantern' | 'bell' | 'star' | 'prism';
  glintPhase: number;
}

// 16-bit Handcrafted Golden Chain Palette
const GOLD_PALETTE = {
  specular: '#fff8db', // Crisp highlight glint (top-left)
  brightGold: '#f7d26d', // Sunlit gold rim
  amberGold: '#d89a55', // Rich antique brass midtone
  deepBronze: '#8e5823', // Shadowed bronze edge
  inkOutline: '#241733', // Deep plum-obsidian outline
  glowAmber: 'rgba(240, 190, 124, 0.4)', // Warm light bloom
  castShadow: 'rgba(12, 8, 20, 0.45)', // Ambient drop shadow onto background
};

export const PixelGoldenChains: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const SCALE = 2; // High-DPI crisp pixel rendering

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * SCALE;
      canvas.height = height * SCALE;
      ctx.imageSmoothingEnabled = false;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Mouse parallax tracking for gentle breeze interaction
    let mouseX = width / 2;
    let mouseSpeedX = 0;
    let lastMouseX = mouseX;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseSpeedX = (mouseX - lastMouseX) * 0.001;
      lastMouseX = mouseX;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Generate Left & Right Golden Chains with Varied Lengths & Decorative Charms
    const createStrands = (): ChainStrand[] => {
      const list: ChainStrand[] = [];
      const LINK_LENGTH = 11; // px per chain link

      // Left Flank (3 cascading chains: foreground, midground, background)
      const leftConfigs = [
        { offsetX: 16, length: Math.min(height * 0.75, 580), charm: 'lantern' as const, speed: 0.0012, sway: 0.024 },
        { offsetX: 42, length: Math.min(height * 0.52, 380), charm: 'star' as const, speed: 0.0017, sway: 0.032 },
        { offsetX: 68, length: Math.min(height * 0.38, 260), charm: 'prism' as const, speed: 0.0021, sway: 0.038 },
      ];

      leftConfigs.forEach((cfg, idx) => {
        const count = Math.floor(cfg.length / LINK_LENGTH);
        const links: ChainLink[] = [];
        for (let i = 0; i < count; i++) {
          links.push({
            x: cfg.offsetX,
            y: i * LINK_LENGTH,
            angle: 0,
            isFront: i % 2 === 0,
          });
        }
        list.push({
          baseX: cfg.offsetX,
          baseY: 0,
          targetLength: cfg.length,
          linkCount: count,
          links,
          swaySpeed: cfg.speed,
          swayAmount: cfg.sway,
          phase: idx * 1.1,
          currentAngle: 0,
          targetAngle: 0,
          side: 'left',
          hasCharm: true,
          charmType: cfg.charm,
          glintPhase: idx * 2.5,
        });
      });

      // Right Flank (3 cascading chains)
      const rightConfigs = [
        { offsetRight: 16, length: Math.min(height * 0.78, 600), charm: 'lantern' as const, speed: 0.0011, sway: 0.022 },
        { offsetRight: 44, length: Math.min(height * 0.54, 400), charm: 'bell' as const, speed: 0.0016, sway: 0.030 },
        { offsetRight: 72, length: Math.min(height * 0.36, 250), charm: 'star' as const, speed: 0.0022, sway: 0.040 },
      ];

      rightConfigs.forEach((cfg, idx) => {
        const count = Math.floor(cfg.length / LINK_LENGTH);
        const links: ChainLink[] = [];
        for (let i = 0; i < count; i++) {
          links.push({
            x: width - cfg.offsetRight,
            y: i * LINK_LENGTH,
            angle: 0,
            isFront: i % 2 === 0,
          });
        }
        list.push({
          baseX: width - cfg.offsetRight,
          baseY: 0,
          targetLength: cfg.length,
          linkCount: count,
          links,
          swaySpeed: cfg.speed,
          swayAmount: cfg.sway,
          phase: idx * 1.3 + 2.0,
          currentAngle: 0,
          targetAngle: 0,
          side: 'right',
          hasCharm: true,
          charmType: cfg.charm,
          glintPhase: idx * 2.8 + 1.2,
        });
      });

      return list;
    };

    let strands = createStrands();

    // Rebuild on screen resize to keep right chains aligned to viewport edge
    const updateChainPositions = () => {
      strands = createStrands();
    };
    window.addEventListener('resize', updateChainPositions);

    // ==========================================
    // DRAWING: Pixel-Perfect Golden Links & Charms
    // ==========================================

    const drawPixelRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      fill: string
    ) => {
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    // Draw single 16-bit golden chain link with highlights and cast shadows
    const drawChainLink = (
      cx: number,
      cy: number,
      angle: number,
      isFront: boolean,
      glintIntensity: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // 1. Ambient Drop Shadow (cast on background behind link)
      ctx.fillStyle = GOLD_PALETTE.castShadow;
      if (isFront) {
        ctx.fillRect(-3, -4, 9, 13);
      } else {
        ctx.fillRect(-1, -3, 5, 11);
      }

      if (isFront) {
        // Front-Facing Oval Link (Outer: 8x12px, Inner Hole: 4x6px)
        // Outer dark ink outline
        drawPixelRect(-4, -6, 8, 12, GOLD_PALETTE.inkOutline);

        // Gold base body
        drawPixelRect(-3, -5, 6, 10, GOLD_PALETTE.amberGold);

        // Top & Left Bright Golden Highlights
        drawPixelRect(-3, -5, 5, 2, GOLD_PALETTE.brightGold);
        drawPixelRect(-3, -5, 2, 8, GOLD_PALETTE.brightGold);

        // Specular Glint (top-left apex)
        if (glintIntensity > 0.3) {
          drawPixelRect(-3, -5, 2, 2, GOLD_PALETTE.specular);
        }

        // Bottom & Right Deep Bronze Shadow
        drawPixelRect(1, -3, 2, 8, GOLD_PALETTE.deepBronze);
        drawPixelRect(-2, 3, 5, 2, GOLD_PALETTE.deepBronze);

        // Hollow Inner Hole (Cutout)
        drawPixelRect(-1, -3, 2, 6, GOLD_PALETTE.inkOutline);
        drawPixelRect(0, -2, 1, 4, 'rgba(30, 23, 48, 0.95)'); // Backdrop color
      } else {
        // Side-Facing Interlocking Pill Connector (4x10px)
        // Dark outline
        drawPixelRect(-2, -5, 4, 10, GOLD_PALETTE.inkOutline);

        // Gold body
        drawPixelRect(-1, -4, 2, 8, GOLD_PALETTE.amberGold);

        // Left Highlight
        drawPixelRect(-1, -4, 1, 7, GOLD_PALETTE.brightGold);

        // Top Specular Point
        if (glintIntensity > 0.4) {
          drawPixelRect(-1, -4, 1, 2, GOLD_PALETTE.specular);
        }

        // Right Shadow
        drawPixelRect(0, -2, 1, 6, GOLD_PALETTE.deepBronze);
      }

      ctx.restore();
    };

    // Draw End Weights & Glowing Charms (Lantern, Star, Bell, Prism)
    const drawCharm = (
      cx: number,
      cy: number,
      angle: number,
      type: 'lantern' | 'bell' | 'star' | 'prism',
      time: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Ambient Drop Shadow
      ctx.fillStyle = GOLD_PALETTE.castShadow;
      ctx.fillRect(-6, -2, 14, 18);

      if (type === 'lantern') {
        // Cozy Golden Lantern Charm (12x16px) with glowing amber core
        // Top Ring & Cap
        drawPixelRect(-2, -4, 4, 3, GOLD_PALETTE.inkOutline);
        drawPixelRect(-1, -3, 2, 2, GOLD_PALETTE.brightGold);
        drawPixelRect(-4, -1, 8, 3, GOLD_PALETTE.amberGold);
        drawPixelRect(-4, -1, 4, 1, GOLD_PALETTE.specular);

        // Glass Frame & Glowing Core
        drawPixelRect(-5, 2, 10, 10, GOLD_PALETTE.inkOutline);
        drawPixelRect(-4, 3, 8, 8, '#d89a55');
        // Warm glowing hearth ember inside
        const pulse = (Math.sin(time * 0.003) + 1) * 0.5;
        drawPixelRect(-3, 4, 6, 6, pulse > 0.5 ? '#fff4ce' : '#f0be7c');
        drawPixelRect(-2, 5, 4, 4, '#ffffff');

        // Brass Base
        drawPixelRect(-4, 12, 8, 3, GOLD_PALETTE.amberGold);
        drawPixelRect(-3, 13, 6, 1, GOLD_PALETTE.deepBronze);

        // Balanced, Cozy Warm Light Bloom behind Lantern
        const glowRad = 22 + pulse * 4;
        const glow = ctx.createRadialGradient(0, 7, 2, 0, 7, glowRad);
        glow.addColorStop(0, 'rgba(255, 245, 205, 0.65)');
        glow.addColorStop(0.4, 'rgba(240, 190, 124, 0.35)');
        glow.addColorStop(0.8, 'rgba(240, 190, 124, 0.1)');
        glow.addColorStop(1, 'rgba(240, 190, 124, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 7, glowRad, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'star') {
        // 4-Point Golden Star Charm (10x10px) with subtle warm glow
        const starGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
        starGlow.addColorStop(0, 'rgba(240, 190, 124, 0.45)');
        starGlow.addColorStop(0.6, 'rgba(240, 190, 124, 0.15)');
        starGlow.addColorStop(1, 'rgba(240, 190, 124, 0)');
        ctx.fillStyle = starGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        drawPixelRect(-4, -4, 8, 8, GOLD_PALETTE.inkOutline);
        drawPixelRect(-3, -3, 6, 6, GOLD_PALETTE.amberGold);
        // Star points
        drawPixelRect(-1, -6, 2, 12, GOLD_PALETTE.brightGold);
        drawPixelRect(-6, -1, 12, 2, GOLD_PALETTE.brightGold);
        drawPixelRect(-1, -1, 2, 2, GOLD_PALETTE.specular);
      } else if (type === 'bell') {
        // Brass Temple Bell Charm with subtle glow
        const bellGlow = ctx.createRadialGradient(0, 3, 1, 0, 3, 14);
        bellGlow.addColorStop(0, 'rgba(240, 190, 124, 0.4)');
        bellGlow.addColorStop(0.6, 'rgba(240, 190, 124, 0.12)');
        bellGlow.addColorStop(1, 'rgba(240, 190, 124, 0)');
        ctx.fillStyle = bellGlow;
        ctx.beginPath();
        ctx.arc(0, 3, 14, 0, Math.PI * 2);
        ctx.fill();

        drawPixelRect(-2, -3, 4, 2, GOLD_PALETTE.brightGold);
        drawPixelRect(-4, -1, 8, 8, GOLD_PALETTE.inkOutline);
        drawPixelRect(-3, 0, 6, 6, GOLD_PALETTE.amberGold);
        drawPixelRect(-3, 0, 2, 5, GOLD_PALETTE.brightGold);
        drawPixelRect(1, 2, 2, 4, GOLD_PALETTE.deepBronze);
        drawPixelRect(-5, 6, 10, 2, GOLD_PALETTE.amberGold);
        // Clapper point
        drawPixelRect(-1, 8, 2, 2, GOLD_PALETTE.specular);
      } else {
        // Faceted Amber Crystal Prism with subtle light bloom
        const prismGlow = ctx.createRadialGradient(0, 4, 1, 0, 4, 14);
        prismGlow.addColorStop(0, 'rgba(240, 190, 124, 0.45)');
        prismGlow.addColorStop(0.6, 'rgba(240, 190, 124, 0.12)');
        prismGlow.addColorStop(1, 'rgba(240, 190, 124, 0)');
        ctx.fillStyle = prismGlow;
        ctx.beginPath();
        ctx.arc(0, 4, 14, 0, Math.PI * 2);
        ctx.fill();

        drawPixelRect(-3, -2, 6, 12, GOLD_PALETTE.inkOutline);
        drawPixelRect(-2, -1, 4, 10, GOLD_PALETTE.amberGold);
        drawPixelRect(-2, -1, 2, 8, GOLD_PALETTE.brightGold);
        drawPixelRect(-1, 0, 1, 4, GOLD_PALETTE.specular);
        drawPixelRect(0, 2, 2, 6, GOLD_PALETTE.deepBronze);
        drawPixelRect(-1, 9, 2, 2, GOLD_PALETTE.amberGold);
      }

      ctx.restore();
    };

    // ==========================================
    // ANIMATION LOOP (Physics & Render)
    // ==========================================

    let animId: number;

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(SCALE, SCALE);

      // Render each golden chain strand
      strands.forEach((strand) => {
        // Smooth multi-segment pendulum sway
        const wind = Math.sin(time * strand.swaySpeed + strand.phase) * strand.swayAmount;
        strand.targetAngle = wind + mouseSpeedX * 0.4;
        strand.currentAngle += (strand.targetAngle - strand.currentAngle) * 0.05;

        let currX = strand.side === 'left' ? strand.baseX : width - (width - strand.baseX);
        let currY = strand.baseY;
        let cumulativeAngle = 0;

        const linkLength = strand.targetLength / strand.linkCount;

        // Traverse links and calculate natural gravity curve
        for (let i = 0; i < strand.linkCount; i++) {
          // Tension factor: top links stay stiffer, lower links sway wider
          const tensionFactor = (i + 1) / strand.linkCount;
          const linkAngle = strand.currentAngle * (0.4 + tensionFactor * 0.8);
          cumulativeAngle += (linkAngle - cumulativeAngle) * 0.25;

          const link = strand.links[i];
          if (link) {
            link.x = currX;
            link.y = currY;
            link.angle = cumulativeAngle;

            // Shimmering specular glint pulse traveling periodically down the chain
            const glintWave = Math.sin(time * 0.0025 - i * 0.35 + strand.glintPhase);
            const glintIntensity = Math.max(0, glintWave);

            drawChainLink(link.x, link.y, link.angle, link.isFront, glintIntensity);
          }

          currX += Math.sin(cumulativeAngle) * linkLength;
          currY += Math.cos(cumulativeAngle) * linkLength;
        }

        // Draw ornamental charm at the bottom tip of the chain
        if (strand.hasCharm) {
          drawCharm(currX, currY, cumulativeAngle * 1.1, strand.charmType, time);
        }
      });

      ctx.restore();
      mouseSpeedX *= 0.92; // Decay mouse inertia
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', updateChainPositions);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-30 pixelated"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
