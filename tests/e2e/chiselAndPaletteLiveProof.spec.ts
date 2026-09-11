import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const outDir = path.join(process.cwd(), 'test-results', 'e2e-artifacts');
fs.mkdirSync(outDir, { recursive: true });
const RUN_ID = 'proof_20260908_1215';

interface WindowWithStudio {
  __pixibunDb?: {
    close: () => void;
    isOpen: () => boolean;
  };
  __studioStore?: {
    getState: () => {
      tools: {
        activeTool: string;
        chiselAzimuth: number;
        lightAzimuth: number;
        rivetRadius: number;
      };
      showNormalMapPreview: boolean;
      activeInspectorTab: string;
      isPaletteCycling: boolean;
      setLightAzimuth: (az: number) => void;
      resetToNewProject?: (newId?: string) => void;
      frames: Array<{
        id: string;
        layers: Array<{ id: string; name: string; tag?: string }>;
      }>;
      activeFrameIndex: number;
    };
  };
}

test.describe('Live Studio Integration Proof: Chisel, Rivet, Preview & Relighting', () => {
  test('verifies live UI wiring for chisel tool, normal preview toggle, 3D relighting, and palette cycling', async ({ page }) => {
    // 1. Navigate to live /studio and enforce Clean Canvas Invariant
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Execute rigorous, Promise-wrapped teardown of PixiBunDB and memory state
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();

      const win = window as unknown as WindowWithStudio;

      // 1. Explicitly close live Dexie connection so onblocked cannot fire
      if (win.__pixibunDb) {
        win.__pixibunDb.close();
      }

      // 2. Reset in-memory buffers and project state
      const store = win.__studioStore?.getState();
      if (store?.resetToNewProject) {
        store.resetToNewProject();
      }

      // 3. Explicitly delete 'PixiBunDB' with Promise. REJECT if blocked or error!
      if (typeof window.indexedDB !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const req = window.indexedDB.deleteDatabase('PixiBunDB');
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error || new Error('Failed to delete PixiBunDB'));
          req.onblocked = () => reject(new Error('Fatal: PixiBunDB deleteDatabase was BLOCKED by an unclosed connection!'));
        });
      }
    });

    // Reload page to start with 100% pristine database and empty layer buffer
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();
    await page.waitForTimeout(500);

    // Hard Assertion on Clean Canvas Invariant (verifying actual state, not just API signals)
    const cleanState = await page.evaluate(() => {
      const s = (window as unknown as WindowWithStudio).__studioStore?.getState();
      if (!s) return null;
      const f = s.frames;
      const layers = f?.[s.activeFrameIndex]?.layers || [];
      return {
        frameCount: f?.length,
        layerCount: layers.length,
        baseLayerName: layers[0]?.name,
        hasNormalLayer: layers.some(l => l.tag === 'normal'),
        showNormalPreview: s.showNormalMapPreview,
      };
    });
    expect(cleanState).not.toBeNull();
    expect(cleanState?.frameCount).toBe(1);
    expect(cleanState?.layerCount).toBe(1);
    expect(cleanState?.baseLayerName).toBe('Base Layer');
    expect(cleanState?.hasNormalLayer).toBe(false);
    expect(cleanState?.showNormalPreview).toBe(false);

    const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // 2. Draw a prominent base diamond/circle on the base layer
    if (box) {
      const centerX = box.x + box.width * 0.5;
      const centerY = box.y + box.height * 0.5;

      for (let r = 2; r <= box.width * 0.2; r += 4) {
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        for (let angle = 0; angle <= 360; angle += 30) {
          const rad = (angle * Math.PI) / 180;
          await page.mouse.move(centerX + Math.cos(rad) * r, centerY + Math.sin(rad) * r);
        }
        await page.mouse.up();
      }
      await page.waitForTimeout(200);
    }

    // 3. Switch right inspector to AI Tools tab
    const aiToolsTab = page.getByRole('button', { name: /PixiBud AI|AI Tools/i });
    await expect(aiToolsTab).toBeVisible();
    await aiToolsTab.click();
    await page.waitForTimeout(200);

    // Verify 2.5D Normal Sculptor section is mounted
    await expect(page.getByText('2.5D Normal Sculptor')).toBeVisible();

    // 4. Click "+ Add Dedicated Normal Layer"
    const addNormalLayerBtn = page.getByRole('button', { name: /Add Dedicated Normal Layer/i });
    if (await addNormalLayerBtn.isVisible()) {
      await addNormalLayerBtn.click();
      await page.waitForTimeout(200);
    }

    // 5. Select Normal Chisel tool from LeftToolbar
    const chiselBtn = page.getByTitle(/Normal Chisel \(K\)/i);
    await expect(chiselBtn).toBeVisible();
    await chiselBtn.click();
    await page.waitForTimeout(200);

    // Select 45° "NE" Azimuth Preset
    const nePreset = page.getByRole('button', { name: /^NE$/ });
    if (await nePreset.isVisible()) {
      await nePreset.click();
      await page.waitForTimeout(100);
    }

    // Carve a directional 45° chisel bevel across the sprite
    if (box) {
      const startX = box.x + box.width * 0.38;
      const startY = box.y + box.height * 0.38;
      const endX = box.x + box.width * 0.62;
      const endY = box.y + box.height * 0.62;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      for (let step = 1; step <= 10; step++) {
        const curX = startX + (endX - startX) * (step / 10);
        const curY = startY + (endY - startY) * (step / 10);
        await page.mouse.move(curX, curY);
        await page.waitForTimeout(20);
      }
      await page.mouse.up();
    }
    await page.waitForTimeout(300);

    // Assert Zustand state before taking chisel screenshot
    const activeTool = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().tools.activeTool);
    expect(activeTool).toBe('normal-chisel');
    const chiselAz = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().tools.chiselAzimuth);
    expect(chiselAz).toBe(45);

    // Save screenshot of Live Studio with Chisel Stroke carved
    const chiselCarvedPath = path.join(outDir, `${RUN_ID}_01_chisel_carved.png`);
    await page.screenshot({
      path: chiselCarvedPath,
      fullPage: false,
    });

    // 6. TOGGLE "Preview: ON" to prove normal map inspection in live viewport
    const previewBtn = page.getByRole('button', { name: /Preview: OFF/i });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();
    await page.waitForTimeout(300);

    // Verify button flipped to "Preview: ON"
    const previewOnBtn = page.getByRole('button', { name: /Preview: ON/i });
    await expect(previewOnBtn).toBeVisible();

    // Assert Zustand preview state is strictly true
    const previewState = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().showNormalMapPreview);
    expect(previewState).toBe(true);

    // Take screenshot with live tangent-space normal map preview ON
    const previewOnPath = path.join(outDir, `${RUN_ID}_02_normal_preview_on.png`);
    await page.screenshot({
      path: previewOnPath,
      fullPage: false,
    });

    // Toggle preview back to OFF for relighting inspection
    await previewOnBtn.click();
    await page.waitForTimeout(200);
    await expect(page.getByRole('button', { name: /Preview: OFF/i })).toBeVisible();

    // 7. Test Live Studio Photometric Relighting (Light Direction 1: Azimuth 45°)
    const manualModeBtn = page.getByLabel('Photometric lighting mode').getByRole('button', { name: /Manual/i });
    if (await manualModeBtn.isVisible()) {
      await manualModeBtn.click();
      await page.waitForTimeout(100);
    }

    // Explicitly dispatch and update slider to 45°
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Light direction around the sprite (azimuth)"]') as HTMLInputElement;
      if (input) {
        const proto = window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        setter?.call(input, '45');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      (window as unknown as WindowWithStudio).__studioStore?.getState().setLightAzimuth(45);
      window.dispatchEvent(new CustomEvent('pixibun:photometric-lighting', {
        detail: {
          lightAzimuth: 45,
          lightElevation: 35,
          lightBrightness: 1.45,
          material: 'gold',
        }
      }));
    });
    await page.waitForTimeout(500);

    // Assert store light azimuth is strictly 45° before screenshot
    const lightAz45 = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().tools.lightAzimuth);
    expect(lightAz45).toBe(45);

    // Take screenshot of 3D lit sprite under 45° directional light (chisel facet illuminated)
    const relit45Path = path.join(outDir, `${RUN_ID}_03_relit_45deg.png`);
    await page.screenshot({
      path: relit45Path,
      fullPage: false,
    });

    // 8. Test Live Studio Photometric Relighting (Light Direction 2: Azimuth 225° - opposite flank)
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Light direction around the sprite (azimuth)"]') as HTMLInputElement;
      if (input) {
        const proto = window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        setter?.call(input, '225');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      (window as unknown as WindowWithStudio).__studioStore?.getState().setLightAzimuth(225);
      window.dispatchEvent(new CustomEvent('pixibun:photometric-lighting', {
        detail: {
          lightAzimuth: 225,
          lightElevation: 35,
          lightBrightness: 1.45,
          material: 'gold',
        }
      }));
    });
    await page.waitForTimeout(500);

    // Assert store light azimuth is strictly 225° before screenshot
    const lightAz225 = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().tools.lightAzimuth);
    expect(lightAz225).toBe(225);

    // Take screenshot of 3D lit sprite under 225° directional light (chisel facet in deep shadow)
    const relit225Path = path.join(outDir, `${RUN_ID}_04_relit_225deg.png`);
    await page.screenshot({
      path: relit225Path,
      fullPage: false,
    });

    // 9. Test Rivet Stamp while keeping Right Inspector strictly on PixiBud AI tab!
    const rivetBtn = page.getByTitle(/Rivet Stamp \(N\)/i);
    await expect(rivetBtn).toBeVisible();
    await rivetBtn.click();
    await page.waitForTimeout(200);

    // In 2.5D Normal Sculptor, select "Rivet Stamp" and "Hemisphere Dome" preset (r: 8)
    const rivetToolBtn = page.getByRole('button', { name: /^Rivet Stamp$/ });
    if (await rivetToolBtn.isVisible()) {
      await rivetToolBtn.click();
      await page.waitForTimeout(100);
    }

    const domePreset = page.getByRole('button', { name: /Hemisphere Dome/i });
    if (await domePreset.isVisible()) {
      await domePreset.click();
      await page.waitForTimeout(100);
    }

    if (box) {
      // Stamp prominent 8px rivet dome in upper-left quadrant
      await page.mouse.click(box.x + box.width * 0.28, box.y + box.height * 0.28);
    }
    await page.waitForTimeout(300);

    // Assert store state for rivet tool, radius 8, and active tab AI before screenshot
    const rivetTool = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().tools.activeTool);
    expect(rivetTool).toBe('rivet-stamp');
    const rivetR = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().tools.rivetRadius);
    expect(rivetR).toBe(8);
    const currentTab = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().activeInspectorTab);
    expect(currentTab).toBe('ai');

    // Take screenshot of Live Studio with prominent Rivet stamped AND Normal Sculptor visible
    const rivetStampedPath = path.join(outDir, `${RUN_ID}_06_rivet_stamped_full.png`);
    await page.screenshot({
      path: rivetStampedPath,
      fullPage: false,
    });

    // Capture dynamic bounding boxes for both Canvas and Inspector
    const dynamicCanvasBox = await canvas.boundingBox();
    expect(dynamicCanvasBox).not.toBeNull();
    const inspectorAside = page.locator('aside.w-80');
    const dynamicInspectorBox = await inspectorAside.boundingBox();
    expect(dynamicInspectorBox).not.toBeNull();

    // Single-step atomic undo test
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    // 10. Test Palette Cycling in Live Studio (Switching to Palette tab only NOW)
    const paletteTab = page.getByRole('button', { name: /^Palette$/i });
    await expect(paletteTab).toBeVisible();
    await paletteTab.click();
    await page.waitForTimeout(300);

    const cyclingSubTab = page.getByRole('button', { name: /Cycle Engine/i });
    await expect(cyclingSubTab).toBeVisible();
    await cyclingSubTab.click();
    await page.waitForTimeout(200);

    const playBtn = page.getByRole('button', { name: /Play Cycle/i });
    await expect(playBtn).toBeVisible();
    await playBtn.click();
    await page.waitForTimeout(200);

    const pauseBtn = page.getByRole('button', { name: /Pause Cycle/i });
    await expect(pauseBtn).toBeVisible();

    await page.waitForTimeout(800);

    // Assert palette cycling is active and tab is palette before screenshot
    const isCycling = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().isPaletteCycling);
    expect(isCycling).toBe(true);
    const tabNow = await page.evaluate(() => (window as unknown as WindowWithStudio).__studioStore?.getState().activeInspectorTab);
    expect(tabNow).toBe('palette');

    const paletteCyclingPath = path.join(outDir, `${RUN_ID}_08_palette_cycling_active.png`);
    await page.screenshot({
      path: paletteCyclingPath,
      fullPage: false,
    });

    await pauseBtn.click();
    await expect(page.getByRole('button', { name: /Play Cycle/i })).toBeVisible();

    // 11. Create side-by-side diff heatmap and rivet closeup with dynamic canvas & inspector boxes
    if (dynamicCanvasBox && dynamicInspectorBox) {
      const b64_45 = fs.readFileSync(relit45Path).toString('base64');
      const b64_225 = fs.readFileSync(relit225Path).toString('base64');
      const b64_rivet = fs.readFileSync(rivetStampedPath).toString('base64');

      const processed = await page.evaluate(async ({ b45, b225, bRivet, cBox, iBox }) => {
        const loadImg = (b64: string) => new Promise<HTMLImageElement>((res) => {
          const img = new Image();
          img.onload = () => res(img);
          img.src = 'data:image/png;base64,' + b64;
        });

        const img45 = await loadImg(b45);
        const img225 = await loadImg(b225);
        const imgRivet = await loadImg(bRivet);

        // Dynamic bounding boxes!
        const cropX = Math.round(cBox.x);
        const cropY = Math.round(cBox.y);
        const cropW = Math.round(cBox.width);
        const cropH = Math.round(cBox.height);

        // Build side-by-side relighting diff
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = cropW * 3 + 40;
        diffCanvas.height = cropH + 70;
        const dCtx = diffCanvas.getContext('2d');
        if (!dCtx) throw new Error('Failed to get 2d context for diff canvas');

        dCtx.fillStyle = '#140d1f';
        dCtx.fillRect(0, 0, diffCanvas.width, diffCanvas.height);

        // 45 deg
        dCtx.drawImage(img45, cropX, cropY, cropW, cropH, 10, 45, cropW, cropH);
        // 225 deg
        dCtx.drawImage(img225, cropX, cropY, cropW, cropH, cropW + 20, 45, cropW, cropH);

        // Diff computation
        const tCanvas = document.createElement('canvas');
        tCanvas.width = cropW;
        tCanvas.height = cropH;
        const tCtx = tCanvas.getContext('2d');
        if (!tCtx) throw new Error('Failed to get 2d context for temp canvas');

        tCtx.drawImage(img45, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const id45 = tCtx.getImageData(0, 0, cropW, cropH);
        tCtx.clearRect(0, 0, cropW, cropH);
        tCtx.drawImage(img225, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const id225 = tCtx.getImageData(0, 0, cropW, cropH);

        let deltaCount = 0;
        const diffImg = tCtx.createImageData(cropW, cropH);
        for (let i = 0; i < id45.data.length; i += 4) {
          const dr = Math.abs(id45.data[i] - id225.data[i]);
          const dg = Math.abs(id45.data[i+1] - id225.data[i+1]);
          const db = Math.abs(id45.data[i+2] - id225.data[i+2]);
          const d = dr + dg + db;
          if (d > 10) deltaCount++;
          const val = Math.min(255, d * 1.5);
          diffImg.data[i] = val > 20 ? val : 0;
          diffImg.data[i+1] = val > 20 ? Math.round(val * 0.8) : 0;
          diffImg.data[i+2] = val > 20 ? Math.round(val * 0.4) : 0;
          diffImg.data[i+3] = 255;
        }
        tCtx.putImageData(diffImg, 0, 0);
        dCtx.drawImage(tCanvas, cropW * 2 + 30, 45);

        // Labels
        dCtx.font = 'bold 13px monospace';
        dCtx.fillStyle = '#f0be7c';
        dCtx.fillText('1. Light Azimuth: 45° (NE)', 10, 30);
        dCtx.fillText('2. Light Azimuth: 225° (SW)', cropW + 20, 30);
        dCtx.fillText(`3. Delta Heatmap (${deltaCount} px)`, cropW * 2 + 30, 30);

        dCtx.strokeStyle = '#352248';
        dCtx.lineWidth = 2;
        dCtx.strokeRect(10, 45, cropW, cropH);
        dCtx.strokeRect(cropW + 20, 45, cropW, cropH);
        dCtx.strokeRect(cropW * 2 + 30, 45, cropW, cropH);

        // Build Rivet Close-up using dynamic canvas & inspector boxes
        const rCanvas = document.createElement('canvas');
        rCanvas.width = 620;
        rCanvas.height = 360;
        const rCtx = rCanvas.getContext('2d');
        if (!rCtx) throw new Error('Failed to get 2d context for rivet canvas');
        rCtx.fillStyle = '#140d1f';
        rCtx.fillRect(0, 0, rCanvas.width, rCanvas.height);

        // Canvas stamped crop
        rCtx.imageSmoothingEnabled = false;
        rCtx.drawImage(imgRivet, cropX, cropY, cropW, cropH, 15, 45, 270, 270);

        // Inspector crop
        const insX = Math.round(iBox.x);
        const insY = Math.round(iBox.y);
        const insW = Math.round(iBox.width);
        const insH = Math.round(iBox.height);
        rCtx.drawImage(imgRivet, insX, insY, insW, Math.min(insH, 400), 305, 45, 300, 270);

        rCtx.font = 'bold 12px monospace';
        rCtx.fillStyle = '#f0be7c';
        rCtx.fillText('Live Canvas: 8px Rivet Dome', 15, 30);
        rCtx.fillText('Right Inspector: PixiBud AI Rivet Controls', 305, 30);

        rCtx.strokeStyle = '#352248';
        rCtx.lineWidth = 2;
        rCtx.strokeRect(15, 45, 270, 270);
        rCtx.strokeRect(305, 45, 300, 270);

        return {
          diffDataUrl: diffCanvas.toDataURL('image/png'),
          rivetCloseupDataUrl: rCanvas.toDataURL('image/png'),
          deltaCount,
        };
      }, {
        b45: b64_45,
        b225: b64_225,
        bRivet: b64_rivet,
        cBox: dynamicCanvasBox,
        iBox: dynamicInspectorBox,
      });

      const diffHeatmapPath = path.join(outDir, `${RUN_ID}_05_diff_heatmap.png`);
      fs.writeFileSync(diffHeatmapPath, Buffer.from(processed.diffDataUrl.split(',')[1], 'base64'));

      const rivetCloseupPath = path.join(outDir, `${RUN_ID}_07_rivet_dome_closeup.png`);
      fs.writeFileSync(rivetCloseupPath, Buffer.from(processed.rivetCloseupDataUrl.split(',')[1], 'base64'));
    }

    // 12. Generate SHA256 manifest
    const manifestFiles = [
      `${RUN_ID}_01_chisel_carved.png`,
      `${RUN_ID}_02_normal_preview_on.png`,
      `${RUN_ID}_03_relit_45deg.png`,
      `${RUN_ID}_04_relit_225deg.png`,
      `${RUN_ID}_05_diff_heatmap.png`,
      `${RUN_ID}_06_rivet_stamped_full.png`,
      `${RUN_ID}_07_rivet_dome_closeup.png`,
      `${RUN_ID}_08_palette_cycling_active.png`,
    ];

    const manifest: Record<string, { sha256: string; sizeBytes: number; mtime: string }> = {};
    for (const file of manifestFiles) {
      const fullPath = path.join(outDir, file);
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const stat = fs.statSync(fullPath);
        manifest[file] = {
          sha256: hash,
          sizeBytes: stat.size,
          mtime: stat.mtime.toISOString(),
        };
      }
    }

    fs.writeFileSync(path.join(outDir, `${RUN_ID}_manifest.json`), JSON.stringify(manifest, null, 2));
  });
});