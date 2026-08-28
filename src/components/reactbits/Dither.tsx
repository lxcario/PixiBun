'use client';

import React, { useRef, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface DitherProps {
  pixelSize?: number;
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  colorPalette?: [string, string, string, string, string];
  className?: string;
  style?: React.CSSProperties;
}

const DARK_PALETTE: [string, string, string, string, string] = [
  '#140c1e',
  '#191026',
  '#201431',
  '#2b1a42',
  '#392357',
];

const LIGHT_PALETTE: [string, string, string, string, string] = [
  '#f5efe6',
  '#ede4f3',
  '#e4d5ed',
  '#dac3e8',
  '#cdb0e0',
];

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
};

export const Dither: React.FC<DitherProps> = ({
  pixelSize = 3.0,
  waveSpeed = 0.25,
  waveFrequency = 1.4,
  waveAmplitude = 0.22,
  colorPalette,
  className = '',
  style = {},
}) => {
  const { theme } = useThemeStore();
  const activePalette = colorPalette || (theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const targetColorsRef = useRef<[number[], number[], number[], number[], number[]]>([
      hexToRgb(activePalette[0]),
      hexToRgb(activePalette[1]),
      hexToRgb(activePalette[2]),
      hexToRgb(activePalette[3]),
      hexToRgb(activePalette[4]),
    ]);

    const currentColorsRef = useRef<[number[], number[], number[], number[], number[]]>([
      hexToRgb(activePalette[0]),
      hexToRgb(activePalette[1]),
      hexToRgb(activePalette[2]),
      hexToRgb(activePalette[3]),
      hexToRgb(activePalette[4]),
    ]);

    useEffect(() => {
      targetColorsRef.current = [
        hexToRgb(activePalette[0]),
        hexToRgb(activePalette[1]),
        hexToRgb(activePalette[2]),
        hexToRgb(activePalette[3]),
        hexToRgb(activePalette[4]),
      ];
    }, [activePalette]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });

      if (!gl) return;

      const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
          v_uv = a_position * 0.5 + 0.5;
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

      const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_uv;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform float u_pixel_size;
        uniform float u_speed;
        uniform float u_freq;
        uniform float u_amp;

        uniform vec3 u_color0;
        uniform vec3 u_color1;
        uniform vec3 u_color2;
        uniform vec3 u_color3;
        uniform vec3 u_color4;

        float getBayer(vec2 pos) {
          int x = int(mod(pos.x, 4.0));
          int y = int(mod(pos.y, 4.0));
          
          if (y == 0) {
            if (x == 0) return 0.0 / 16.0;
            if (x == 1) return 8.0 / 16.0;
            if (x == 2) return 2.0 / 16.0;
            return 10.0 / 16.0;
          } else if (y == 1) {
            if (x == 0) return 12.0 / 16.0;
            if (x == 1) return 4.0 / 16.0;
            if (x == 2) return 14.0 / 16.0;
            return 6.0 / 16.0;
          } else if (y == 2) {
            if (x == 0) return 3.0 / 16.0;
            if (x == 1) return 11.0 / 16.0;
            if (x == 2) return 1.0 / 16.0;
            return 9.0 / 16.0;
          } else {
            if (x == 0) return 15.0 / 16.0;
            if (x == 1) return 7.0 / 16.0;
            if (x == 2) return 13.0 / 16.0;
            return 5.0 / 16.0;
          }
        }

        void main() {
          vec2 pixelCoord = floor(gl_FragCoord.xy / u_pixel_size);
          vec2 uv = pixelCoord * u_pixel_size / u_resolution;
          
          float aspect = u_resolution.x / u_resolution.y;
          vec2 p = uv;
          p.x *= aspect;

          float t = u_time * u_speed;
          
          float wave1 = sin(p.x * u_freq + t * 0.6) * cos(p.y * u_freq * 0.7 - t * 0.4);
          float wave2 = sin(p.y * u_freq * 0.9 + t * 0.3 + p.x * 0.4);
          float wave3 = cos(length(p - vec2(aspect * 0.5, 0.35)) * 2.8 - t * 0.5);
          
          vec2 mouseP = u_mouse / u_resolution;
          mouseP.x *= aspect;
          float mouseDist = length(p - mouseP);
          float mouseRipple = exp(-mouseDist * 3.0) * 0.18;

          float rawVal = (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2) * u_amp + 0.38 + mouseRipple;
          
          // Gentle center glow
          float centerDist = length(uv - vec2(0.5, 0.3));
          rawVal += (1.0 - smoothstep(0.0, 0.85, centerDist)) * 0.15;
          rawVal = clamp(rawVal, 0.0, 1.0);

          // Soft Bayer Dithering
          float bayer = getBayer(pixelCoord);
          float ditheredVal = rawVal + (bayer - 0.5) * 0.14;
          ditheredVal = clamp(ditheredVal, 0.0, 1.0);

          float stepped = floor(ditheredVal * 4.0 + 0.5) / 4.0;

          vec3 col;
          if (stepped <= 0.0) col = u_color0;
          else if (stepped <= 0.25) col = u_color1;
          else if (stepped <= 0.5) col = u_color2;
          else if (stepped <= 0.75) col = u_color3;
          else col = u_color4;

          gl_FragColor = vec4(col, 1.0);
        }
      `;

      const createShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fragShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
      if (!vertShader || !fragShader) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return;
      }

      gl.useProgram(program);

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPositionLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPositionLocation);
      gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

      const uResolution = gl.getUniformLocation(program, 'u_resolution');
      const uTime = gl.getUniformLocation(program, 'u_time');
      const uMouse = gl.getUniformLocation(program, 'u_mouse');
      const uPixelSize = gl.getUniformLocation(program, 'u_pixel_size');
      const uSpeed = gl.getUniformLocation(program, 'u_speed');
      const uFreq = gl.getUniformLocation(program, 'u_freq');
      const uAmp = gl.getUniformLocation(program, 'u_amp');

      const uColor0 = gl.getUniformLocation(program, 'u_color0');
      const uColor1 = gl.getUniformLocation(program, 'u_color1');
      const uColor2 = gl.getUniformLocation(program, 'u_color2');
      const uColor3 = gl.getUniformLocation(program, 'u_color3');
      const uColor4 = gl.getUniformLocation(program, 'u_color4');

      gl.uniform1f(uPixelSize, pixelSize);
      gl.uniform1f(uSpeed, waveSpeed);
      gl.uniform1f(uFreq, waveFrequency);
      gl.uniform1f(uAmp, waveAmplitude);

      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;

      const handleMouseMove = (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = window.innerHeight - e.clientY;
      };
      window.addEventListener('mousemove', handleMouseMove);

      const resize = () => {
        const parent = canvas.parentElement;
        const width = parent ? parent.clientWidth : window.innerWidth;
        const height = parent ? parent.clientHeight : window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
      };

      resize();
      window.addEventListener('resize', resize);

      const startTime = performance.now();
      let animId: number;

      const render = (time: number) => {
        const elapsed = (time - startTime) * 0.001;
        gl.uniform1f(uTime, elapsed);
        gl.uniform2f(
          uMouse,
          mouseX * (window.devicePixelRatio || 1),
          mouseY * (window.devicePixelRatio || 1)
        );

        // Smooth uniform color interpolation at 60fps
        const targets = targetColorsRef.current;
        const currents = currentColorsRef.current;
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 3; j++) {
            currents[i][j] += (targets[i][j] - currents[i][j]) * 0.08;
          }
        }

        gl.uniform3fv(uColor0, currents[0]);
        gl.uniform3fv(uColor1, currents[1]);
        gl.uniform3fv(uColor2, currents[2]);
        gl.uniform3fv(uColor3, currents[3]);
        gl.uniform3fv(uColor4, currents[4]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animId = requestAnimationFrame(render);
      };

      animId = requestAnimationFrame(render);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', resize);
        gl.deleteProgram(program);
      };
    }, [pixelSize, waveSpeed, waveFrequency, waveAmplitude]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none ${className}`}
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
};
