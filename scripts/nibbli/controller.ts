import { expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ControllerInputError, pixelToClient, type PixelPoint } from './geometry';
import { NibbliMemory } from './memory';
import { readCanvas } from './vision';

/** Shared by Tester and future Artist planners. Every edit goes through visible UI. */
export class PixiBunController {
  private actionNumber = 0;
  readonly runtimeErrors: string[] = [];
  constructor(readonly page: Page, readonly memory: NibbliMemory, private readonly session = '') {
    if (session && !/^[a-z][a-z0-9-]*$/.test(session)) throw new ControllerInputError('Invalid controller session name.');
    page.on('pageerror', error => this.runtimeErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') this.runtimeErrors.push(message.text()); });
  }

  private async capture(number: number) {
    const prefix = `${this.session ? `${this.session}-` : ''}${String(number).padStart(3, '0')}`;
    await this.memory.artifact(`${prefix}-screen.png`, await this.page.screenshot());
    const canvas = this.page.getByTestId('main-composite-canvas');
    if (await canvas.count() && await canvas.isVisible()) {
      await this.memory.artifact(`${prefix}-canvas.png`, await canvas.screenshot({ animations: 'disabled' }));
      await this.memory.artifact(`${prefix}-pixels.json`, JSON.stringify(await readCanvas(this.page)));
    }
  }

  async action<T>(name: string, parameters: Record<string, unknown>, perform: () => Promise<T>, correctionOf?: string): Promise<T> {
    const number = ++this.actionNumber;
    const id = await this.memory.event('action-start', { number, session: this.session || 'main', name, parameters, correctionOf });
    let outcome: T;
    try { outcome = await perform(); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.memory.event('action-failed', { action: id, number, name, message,
        failureOwner: error instanceof ControllerInputError ? 'controller' : 'unknown',
        review: 'Preserve expectations. Investigate before proposing a separate repair.' });
      try { await this.capture(number); } catch (captureError) {
        await this.memory.event('capture-failed', { action: id, message: String(captureError) });
      }
      throw error;
    }
    try { await this.capture(number); }
    catch (error) {
      await this.memory.event('capture-failed', { action: id, number, name, message: String(error), failureOwner: 'unknown' });
      throw error;
    }
    await this.memory.event('action-completed', { action: id, number, name });
    return outcome;
  }

  async open(width = 32, height = 32) {
    return this.action('new-project', { width, height }, async () => {
      if (![width, height].every(v => Number.isInteger(v) && v >= 1 && v <= 2048)) throw new ControllerInputError('Invalid project dimensions.');
      await this.page.goto(`/studio?width=${width}&height=${height}`);
      await expect(this.page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await expect(this.page.getByTestId('main-composite-canvas')).toHaveAttribute('width', String(width));
      await expect(this.page.getByTestId('main-composite-canvas')).toHaveAttribute('height', String(height));
    });
  }

  async tool(tool: 'pen' | 'eraser' | 'bucket' | 'line' | 'curve' | 'select-box') {
    return this.action('choose-tool', { tool }, async () => {
      await this.page.getByTestId(`${tool}-tool`).click();
      await expect(this.page.getByTestId(`${tool}-tool`)).toHaveAttribute('aria-pressed', 'true');
    });
  }

  /** Explicit UI settings for the Artist's independently specified one-pixel gestures. */
  async singlePixelBrush() {
    await this.tool('pen');
    return this.action('single-pixel-brush', { size: 1, cleanCorners: false }, async () => {
      const preset = this.page.getByRole('button', { name: '1px brush preset', exact: true });
      await preset.click(); await expect(preset).toHaveAttribute('aria-pressed', 'true');
      const cleanCorners = this.page.locator('button[title^="Pixel-Perfect:"]');
      if (await cleanCorners.getAttribute('aria-pressed') === 'true') await cleanCorners.click();
      await expect(cleanCorners).toHaveAttribute('aria-pressed', 'false');
    });
  }

  async color(hex: string) {
    return this.action('primary-color', { hex }, async () => {
      if (!/^#[\da-f]{6}$/i.test(hex)) throw new ControllerInputError('Use a six-digit RGB color.');
      await this.page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / }).dblclick();
      const dialog = this.page.getByRole('dialog').filter({
        has: this.page.getByRole('heading', { name: /^(?:✦\s*)?Pick Custom Primary Color$/ }),
      });
      await expect(dialog).toBeVisible();
      await this.memory.event('dialog-observation', await dialog.evaluate(element => {
        const label = element.getAttribute('aria-labelledby');
        return { heading: element.querySelector('h2')?.textContent, labelledBy: label,
          referencedText: label?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? null) };
      }));
      await dialog.getByRole('textbox', { name: 'Picker hex color', exact: true }).fill(hex);
      await dialog.getByRole('button', { name: 'Select Color', exact: true }).click();
      await expect(dialog).toBeHidden();
      await this.page.keyboard.press('Escape');
    });
  }

  async stroke(points: PixelPoint[], correctionOf?: string) {
    return this.action('stroke', { points }, async () => {
      if (!points.length || points.length > 4096) throw new ControllerInputError('A stroke needs 1–4096 points.');
      const canvas = this.page.getByTestId('main-composite-canvas');
      const geometry = await canvas.evaluate((element: HTMLCanvasElement) => {
        const rect = element.getBoundingClientRect();
        return { width: element.width, height: element.height,
          bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
      });
      // Validate the entire gesture before pressing; malformed plans cannot partly paint.
      const client = points.map(point => pixelToClient(point, geometry));
      const viewport = this.page.viewportSize();
      if (!viewport || client.some(p => p.x < 0 || p.y < 0 || p.x >= viewport.width || p.y >= viewport.height)) {
        throw new ControllerInputError('The requested stroke is off screen; fit or pan before drawing.');
      }
      await this.page.mouse.move(client[0].x, client[0].y);
      await this.page.mouse.down();
      try {
        for (const point of client.slice(1)) await this.page.mouse.move(point.x, point.y, { steps: 1 });
      } finally { await this.page.mouse.up(); }
      await this.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }, correctionOf);
  }

  async undo() { return this.action('undo', {}, () => this.page.getByTestId('undo-button').click()); }
  async redo() { return this.action('redo', {}, () => this.page.getByTestId('redo-button').click()); }
  async layer(name: string) {
    return this.action('add-layer', { name }, async () => {
      await this.page.getByTestId('tab-layers').click();
      await this.page.getByRole('button', { name: 'Add New Layer', exact: true }).click();
      await this.page.getByRole('button', { name: /^Select layer / }).first().dblclick();
      const input = this.page.getByRole('textbox', { name: 'Layer name', exact: true });
      await input.fill(name); await input.press('Enter');
    });
  }
  async selectFrame(number: number) {
    return this.action('select-frame', { number }, async () => {
      if (!Number.isInteger(number) || number < 1) throw new ControllerInputError('Frame numbers start at one.');
      await this.page.getByRole('button', { name: new RegExp(`^Select frame ${number}\\.`) }).click();
      await this.settle();
    });
  }
  /** Existing layer identity, never an ambiguous or model-supplied name selector. */
  async selectLayer(id: string) {
    return this.action('select-existing-layer', { id }, async () => {
      if (!/^[a-zA-Z0-9-]{1,120}$/.test(id)) throw new ControllerInputError('Invalid layer identity.');
      if (await this.page.getByTestId('selection-transform-gizmo').isVisible()) throw new ControllerInputError('Finish the existing selection before changing layers.');
      await this.page.getByTestId('tab-layers').click();
      const row = this.page.getByTestId(`layer-row-${id}`);
      if (await row.count() !== 1) throw new ControllerInputError('The target layer is unavailable.');
      if (await row.getByRole('button', { name: /^Unlock layer / }).count()
        || await row.getByRole('button', { name: /^Show layer / }).count()) throw new ControllerInputError('Target layer is locked or hidden.');
      const control = row.getByRole('button', { name: /^Select layer / });
      await control.click(); await expect(control).toHaveClass(/font-semibold/); await this.settle();
    });
  }
  /** Inclusive rectangle endpoints and an integer move through the visible gizmo. */
  async moveSelection(rect: { x: number; y: number; width: number; height: number }, delta: PixelPoint) {
    return this.selectionTranslation(rect, delta, false);
  }
  /** Copy the active layer through workspace shortcuts, then place the floating copy. */
  async copySelection(rect: { x: number; y: number; width: number; height: number }, delta: PixelPoint) {
    return this.selectionTranslation(rect, delta, true);
  }
  /** In-place mirror using the selection HUD; cancellation is a trusted diagnostic option. */
  async flipSelection(rect: { x: number; y: number; width: number; height: number }, axis: 'horizontal' | 'vertical', finish: 'commit' | 'cancel' = 'commit') {
    return this.action('flip-rectangular-selection', { rect, axis, finish }, async () => {
      if (!['horizontal', 'vertical'].includes(axis) || !['commit', 'cancel'].includes(finish)
        || ![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger)
        || rect.width < 2 || rect.height < 2 || rect.x < 0 || rect.y < 0
        || rect.x + rect.width > 32 || rect.y + rect.height > 32) throw new ControllerInputError('Invalid bounded selection flip.');
      const canvas = this.page.getByTestId('main-composite-canvas');
      const geometry = await canvas.evaluate((element: HTMLCanvasElement) => {
        const b = element.getBoundingClientRect();
        return { width: element.width, height: element.height, bounds: { x: b.x, y: b.y, width: b.width, height: b.height } };
      });
      if (geometry.width !== 32 || geometry.height !== 32) throw new ControllerInputError('Flip currently requires a 32×32 canvas.');
      const start = pixelToClient({ x: rect.x, y: rect.y }, geometry);
      const end = pixelToClient({ x: rect.x + rect.width - 1, y: rect.y + rect.height - 1 }, geometry);
      const viewport = this.page.viewportSize(), sx = geometry.bounds.width / 32, sy = geometry.bounds.height / 32;
      if (!viewport || [start, end].some(p => p.x < 0 || p.y < 0 || p.x >= viewport.width || p.y >= viewport.height)) throw new ControllerInputError('Selection flip is off screen.');
      if (rect.width * sx < 24 || rect.height * sy < 24) throw new ControllerInputError('Zoom in before using a small selection gizmo.');
      const gizmo = this.page.getByTestId('selection-transform-gizmo');
      if (await gizmo.isVisible()) throw new ControllerInputError('Finish the existing selection before flipping.');
      if (await this.page.getByTestId('curve-adjustment-gizmo').isVisible()) throw new ControllerInputError('Finish the pending curve before flipping.');
      if ((await this.page.getByTestId('bottom-timeline').locator('[data-tutorial="play-button"]').innerText()).trim() !== 'Play') throw new ControllerInputError('Pause playback before editing.');
      await this.page.getByTestId('tab-layers').click();
      const activeRow = this.page.locator('[data-testid^="layer-row-"]').filter({ has: this.page.locator('button.font-semibold[aria-label^="Select layer "]') });
      if (await activeRow.count() !== 1 || await activeRow.getByRole('button', { name: /^Unlock layer / }).count()
        || await activeRow.getByRole('button', { name: /^Show layer / }).count()) throw new ControllerInputError('Active layer is unavailable, locked or hidden.');
      await this.page.getByTestId('select-box-tool').click();
      await this.page.mouse.move(start.x, start.y); await this.page.mouse.down();
      try { await this.page.mouse.move(end.x, end.y, { steps: 2 }); } finally { await this.page.mouse.up(); }
      await expect(gizmo).toBeVisible(); await this.settle();
      const matches = (box: { x: number; y: number; width: number; height: number } | null) => box
        && Math.abs(box.width - rect.width * sx) <= 0.6 && Math.abs(box.height - rect.height * sy) <= 0.6
        && Math.abs(box.x - geometry.bounds.x - rect.x * sx) <= 0.6 && Math.abs(box.y - geometry.bounds.y - rect.y * sy) <= 0.6;
      if (!matches(await gizmo.boundingBox())) throw new ControllerInputError('Actual selection differs from the validated flip rectangle.');
      await gizmo.getByTitle(axis === 'horizontal' ? 'Flip Horizontal (H)' : 'Flip Vertical (V)', { exact: true }).click();
      await this.settle();
      if (!matches(await gizmo.boundingBox())) throw new ControllerInputError('Flip changed the selection bounds.');
      await this.memory.artifact(`${String(this.actionNumber).padStart(3, '0')}-flip-preview-screen.png`, await this.page.screenshot());
      await this.memory.artifact(`${String(this.actionNumber).padStart(3, '0')}-flip-preview-pixels.json`, JSON.stringify(await readCanvas(this.page)));
      await this.page.getByTestId(finish === 'commit' ? 'gizmo-commit-btn' : 'gizmo-cancel-btn').click();
      await expect(gizmo).toBeHidden(); await this.settle();
    });
  }
  private async selectionTranslation(rect: { x: number; y: number; width: number; height: number }, delta: PixelPoint, copy: boolean) {
    return this.action(copy ? 'copy-paste-rectangular-selection' : 'move-rectangular-selection', { rect, delta }, async () => {
      if (![rect.x, rect.y, rect.width, rect.height, delta.x, delta.y].every(Number.isInteger)
        || rect.width < 2 || rect.height < 2 || Math.abs(delta.x) + Math.abs(delta.y) < 1
        || Math.abs(delta.x) + Math.abs(delta.y) > 32) throw new ControllerInputError('Invalid bounded selection move.');
      if (copy && rect.x + delta.x < rect.x + rect.width && rect.x + delta.x + rect.width > rect.x
        && rect.y + delta.y < rect.y + rect.height && rect.y + delta.y + rect.height > rect.y) throw new ControllerInputError('Copy source and destination must not overlap.');
      const canvas = this.page.getByTestId('main-composite-canvas');
      const geometry = await canvas.evaluate((element: HTMLCanvasElement) => {
        const b = element.getBoundingClientRect();
        return { width: element.width, height: element.height, bounds: { x: b.x, y: b.y, width: b.width, height: b.height } };
      });
      const start = pixelToClient({ x: rect.x, y: rect.y }, geometry);
      const end = pixelToClient({ x: rect.x + rect.width - 1, y: rect.y + rect.height - 1 }, geometry);
      const destination = [pixelToClient({ x: rect.x + delta.x, y: rect.y + delta.y }, geometry),
        pixelToClient({ x: rect.x + rect.width - 1 + delta.x, y: rect.y + rect.height - 1 + delta.y }, geometry)];
      const center = { x: Math.max(0, Math.floor((geometry.width - rect.width) / 2)), y: Math.max(0, Math.floor((geometry.height - rect.height) / 2)) };
      const staging = copy ? [pixelToClient(center, geometry), pixelToClient({ x: center.x + rect.width - 1, y: center.y + rect.height - 1 }, geometry)] : [];
      const viewport = this.page.viewportSize();
      if (!viewport || [start, end, ...destination, ...staging].some(p => p.x < 0 || p.y < 0 || p.x >= viewport.width || p.y >= viewport.height)) throw new ControllerInputError('Selection move is off screen.');
      const sx = geometry.bounds.width / geometry.width, sy = geometry.bounds.height / geometry.height;
      if (rect.width * sx < 24 || rect.height * sy < 24) throw new ControllerInputError('Zoom in before using a small selection gizmo.');
      const gizmo = this.page.getByTestId('selection-transform-gizmo');
      if (await gizmo.isVisible()) throw new ControllerInputError('Existing selections are outside this move contract.');
      if (await this.page.getByTestId('curve-adjustment-gizmo').isVisible()) throw new ControllerInputError('Finish the pending curve before moving a selection.');
      const playback = this.page.getByTestId('bottom-timeline').locator('[data-tutorial="play-button"]');
      if ((await playback.innerText()).trim() !== 'Play') throw new ControllerInputError('Pause playback before editing.');
      await this.page.getByTestId('tab-layers').click();
      const activeRow = this.page.locator('[data-testid^="layer-row-"]').filter({ has: this.page.locator('button.font-semibold[aria-label^="Select layer "]') });
      if (await activeRow.count() !== 1 || await activeRow.getByRole('button', { name: /^Unlock layer / }).count()
        || await activeRow.getByRole('button', { name: /^Show layer / }).count()) throw new ControllerInputError('Active layer is unavailable, locked or hidden.');
      await this.page.getByTestId('select-box-tool').click();
      await this.page.mouse.move(start.x, start.y); await this.page.mouse.down();
      try { await this.page.mouse.move(end.x, end.y, { steps: 2 }); } finally { await this.page.mouse.up(); }
      await expect(gizmo).toBeVisible(); await this.settle();
      let before = await gizmo.boundingBox();
      if (!before || Math.abs(before.width - rect.width * sx) > 0.6 || Math.abs(before.height - rect.height * sy) > 0.6
        || Math.abs(before.x - (geometry.bounds.x + rect.x * sx)) > 0.6 || Math.abs(before.y - (geometry.bounds.y + rect.y * sy)) > 0.6) throw new ControllerInputError('Actual selection geometry differs from the validated rectangle.');
      if (copy) {
        await this.page.locator('#main-content').focus();
        await this.page.keyboard.press('ControlOrMeta+c');
        await this.page.keyboard.press('Escape'); await expect(gizmo).toBeHidden();
        await this.page.keyboard.press('ControlOrMeta+v'); await expect(gizmo).toBeVisible(); await this.settle();
        before = await gizmo.boundingBox();
        if (!before || Math.abs(before.width - rect.width * sx) > 0.6 || Math.abs(before.height - rect.height * sy) > 0.6
          || Math.abs(before.x - (geometry.bounds.x + center.x * sx)) > 0.6 || Math.abs(before.y - (geometry.bounds.y + center.y * sy)) > 0.6) throw new ControllerInputError('Actual pasted selection differs from the copied rectangle.');
        await this.memory.event('copy-paste-staging', { source: rect, staging: center, destination: { x: rect.x + delta.x, y: rect.y + delta.y }, clipboard: 'Real workspace shortcuts; no OS clipboard or state injection.' });
      }
      const body = await this.page.getByTestId('gizmo-translate-body').boundingBox();
      if (!body || body.width < 24 || body.height < 24) throw new ControllerInputError('Zoom in before using a small selection gizmo.');
      const grip = { x: body.x + body.width * 0.3, y: body.y + body.height * 0.3 };
      const ownsPointer = await this.page.evaluate(point => Boolean(document.elementFromPoint(point.x, point.y)
        ?.closest('[data-testid="gizmo-translate-body"]')), grip);
      if (!ownsPointer) throw new ControllerInputError('The move grip overlaps a transform handle; use a larger selection or zoom.');
      const shift = copy ? { x: (rect.x + delta.x - center.x) * sx, y: (rect.y + delta.y - center.y) * sy } : { x: delta.x * sx, y: delta.y * sy };
      await this.page.mouse.move(grip.x, grip.y); await this.page.mouse.down();
      try { await this.page.mouse.move(grip.x + shift.x, grip.y + shift.y, { steps: 2 }); } finally { await this.page.mouse.up(); }
      await this.settle(); const moved = await gizmo.boundingBox();
      if (!moved || Math.abs(moved.x - before.x - shift.x) > 0.6 || Math.abs(moved.y - before.y - shift.y) > 0.6
        || Math.abs(moved.width - before.width) > 0.6 || Math.abs(moved.height - before.height) > 0.6) throw new ControllerInputError('Actual move differs from the validated destination.');
      await this.page.getByTestId('gizmo-commit-btn').click(); await expect(gizmo).toBeHidden(); await this.settle();
    });
  }
  /** Exact clockwise quarter turns, with a visible, explicitly checked pivot. */
  async rotateSelection(rect: { x: number; y: number; width: number; height: number }, degrees: 90 | 180 | 270, pivot: PixelPoint, finish: 'commit' | 'cancel' = 'commit') {
    return this.action('rotate-rectangular-selection', {rect,degrees,pivot,finish}, async()=>{
      if(![90,180,270].includes(degrees)||!['commit','cancel'].includes(finish)||![rect.x,rect.y,rect.width,rect.height].every(Number.isInteger)
        ||rect.width<2||rect.height<2||rect.x<0||rect.y<0||rect.x+rect.width>32||rect.y+rect.height>32
        ||![pivot.x,pivot.y].every(v=>Number.isFinite(v)&&Number.isInteger(v*2)&&v>=0&&v<=32)) throw new ControllerInputError('Invalid bounded quarter-turn or pivot.');
      const c=degrees===180?-1:0,s=degrees===90?1:degrees===270?-1:0;
      const corners=[[rect.x,rect.y],[rect.x+rect.width,rect.y],[rect.x,rect.y+rect.height],[rect.x+rect.width,rect.y+rect.height]].map(([x,y])=>({x:pivot.x+c*(x-pivot.x)-s*(y-pivot.y),y:pivot.y+s*(x-pivot.x)+c*(y-pivot.y)}));
      if(corners.some(p=>!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x>32||p.y>32)) throw new ControllerInputError('Rotated bounds are clipped or do not align to the pixel grid.');
      const bounds={x:Math.min(...corners.map(p=>p.x)),y:Math.min(...corners.map(p=>p.y)),width:Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),height:Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y))};
      const canvas=this.page.getByTestId('main-composite-canvas'),geometry=await canvas.evaluate((element:HTMLCanvasElement)=>{const b=element.getBoundingClientRect();return {width:element.width,height:element.height,bounds:{x:b.x,y:b.y,width:b.width,height:b.height}};});
      if(geometry.width!==32||geometry.height!==32)throw new ControllerInputError('Rotation currently requires a 32×32 canvas.');
      const sx=geometry.bounds.width/32,sy=geometry.bounds.height/32,viewport=this.page.viewportSize();
      const start=pixelToClient({x:rect.x,y:rect.y},geometry),end=pixelToClient({x:rect.x+rect.width-1,y:rect.y+rect.height-1},geometry);
      const target={x:geometry.bounds.x+pivot.x*sx,y:geometry.bounds.y+pivot.y*sy};
      const clients=[start,end,target,...corners.map(p=>({x:geometry.bounds.x+p.x*sx,y:geometry.bounds.y+p.y*sy}))];
      if(!viewport||clients.some(p=>p.x<0||p.y<0||p.x>=viewport.width||p.y>=viewport.height))throw new ControllerInputError('Selection, pivot or rotated bounds are off screen.');
      if(rect.width*sx<32||rect.height*sy<32)throw new ControllerInputError('Zoom in before using a small rotation gizmo.');
      const gizmo=this.page.getByTestId('selection-transform-gizmo');
      if(await gizmo.isVisible()||await this.page.getByTestId('curve-adjustment-gizmo').isVisible())throw new ControllerInputError('Finish the existing selection or curve before rotating.');
      if((await this.page.getByTestId('bottom-timeline').locator('[data-tutorial="play-button"]').innerText()).trim()!=='Play')throw new ControllerInputError('Pause playback before editing.');
      await this.page.getByTestId('tab-layers').click();
      const row=this.page.locator('[data-testid^="layer-row-"]').filter({has:this.page.locator('button.font-semibold[aria-label^="Select layer "]')});
      if(await row.count()!==1||await row.getByRole('button',{name:/^Unlock layer /}).count()||await row.getByRole('button',{name:/^Show layer /}).count())throw new ControllerInputError('Active layer is unavailable, locked or hidden.');
      await this.page.getByTestId('select-box-tool').click();
      await this.page.getByTestId('tab-tools').click();
      await this.page.getByRole('combobox',{name:'Rotation algorithm',exact:true}).selectOption('rotsprite');
      await expect(this.page.getByRole('combobox',{name:'Rotation algorithm',exact:true})).toHaveValue('rotsprite');
      await this.page.mouse.move(start.x,start.y);await this.page.mouse.down();
      try{await this.page.mouse.move(end.x,end.y,{steps:2});}finally{await this.page.mouse.up();}
      await expect(gizmo).toBeVisible();await this.settle();
      const matches=(box:{x:number;y:number;width:number;height:number}|null,r:{x:number;y:number;width:number;height:number})=>box&&Math.abs(box.x-geometry.bounds.x-r.x*sx)<=0.6&&Math.abs(box.y-geometry.bounds.y-r.y*sy)<=0.6&&Math.abs(box.width-r.width*sx)<=0.6&&Math.abs(box.height-r.height*sy)<=0.6;
      if(!matches(await gizmo.boundingBox(),rect))throw new ControllerInputError('Actual selection differs from the validated rotation rectangle.');
      const reticle=this.page.getByTestId('gizmo-pivot'),box=await reticle.boundingBox();if(!box)throw new ControllerInputError('Missing pivot reticle.');
      const grip={x:box.x+box.width/2,y:box.y+box.height/2};
      if(Math.abs(grip.x-target.x)>0.6||Math.abs(grip.y-target.y)>0.6){
        if(!await this.page.evaluate(p=>Boolean(document.elementFromPoint(p.x,p.y)?.closest('[data-testid="gizmo-pivot"]')),grip))throw new ControllerInputError('Pivot grip is not owned by the pivot reticle.');
        await this.page.mouse.move(grip.x,grip.y);await this.page.mouse.down();
        try{await this.page.mouse.move(target.x,target.y,{steps:2});}finally{await this.page.mouse.up();}await this.settle();
      }
      const movedPivot=await reticle.boundingBox();
      if(!movedPivot||Math.abs(movedPivot.x+movedPivot.width/2-target.x)>0.6||Math.abs(movedPivot.y+movedPivot.height/2-target.y)>0.6)throw new ControllerInputError('Actual pivot differs from the explicit plan.');
      const control=gizmo.getByTitle(degrees===270?'Rotate 90° CCW':'Rotate 90° CW',{exact:true});
      for(let i=0;i<(degrees===180?2:1);i++){await control.click();await this.settle();}
      await expect(this.page.getByTestId('gizmo-degree-badge')).toHaveText(degrees===270?'-90.0°':`${degrees}.0°`);
      if(!matches(await gizmo.boundingBox(),bounds))throw new ControllerInputError('Actual rotated gizmo differs from the exact destination bounds.');
      await this.memory.artifact(`${String(this.actionNumber).padStart(3,'0')}-rotation-preview-screen.png`,await this.page.screenshot());
      const preview=await readCanvas(this.page);await this.memory.artifact(`${String(this.actionNumber).padStart(3,'0')}-rotation-preview-pixels.json`,JSON.stringify(preview));
      await this.memory.event('rotation-geometry',{source:rect,degrees,pivot,destination:bounds,engine:'Real RotSprite UI; exact quarter-turn path',finish});
      await this.page.getByTestId(finish==='commit'?'gizmo-commit-btn':'gizmo-cancel-btn').click();await expect(gizmo).toBeHidden();await this.settle();
      if(finish==='commit')await expect.poll(()=>readCanvas(this.page)).toEqual(preview);
    });
  }
  async addFrame() { return this.action('add-frame', {}, () => this.page.getByTestId('add-frame-button').click()); }
  private async settle() {
    await this.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  async resume() {
    return this.action('resume-saved-project', {}, async () => {
      await this.page.goto('/studio');
      await expect(this.page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await this.settle();
    });
  }
  async frameDuration(milliseconds: number) {
    return this.action('frame-duration', { milliseconds }, async () => {
      if (!Number.isInteger(milliseconds) || milliseconds < 1 || milliseconds > 60_000) throw new ControllerInputError('Frame duration must be 1–60000 ms.');
      const input = this.page.getByRole('spinbutton', { name: 'Active frame duration in milliseconds', exact: true });
      await input.fill(String(milliseconds));
      await input.blur();
      await expect(input).toHaveValue(String(milliseconds));
    });
  }
  async previewSettings() {
    return this.action('preview-settings', { loop: 'repeat', speed: 1, onionSkin: false }, async () => {
      const timeline = this.page.getByTestId('bottom-timeline');
      const loop = timeline.locator('button[title^="Loop Mode:"]');
      for (let attempt = 0; attempt < 3 && await loop.getAttribute('title') !== 'Loop Mode: repeat'; attempt++) await loop.click();
      await expect(loop).toHaveAttribute('title', 'Loop Mode: repeat');
      await timeline.getByRole('button', { name: /^Preview .* speed$/ }).click();
      await timeline.getByRole('button', { name: '1× preview speed', exact: true }).click();
      await expect(timeline.getByRole('button', { name: 'Preview 1× speed', exact: true })).toBeVisible();
      const onion = timeline.getByRole('button', { name: 'Onion Skin', exact: true });
      if (await onion.getAttribute('aria-pressed') === 'true') await onion.click();
      await expect(onion).toHaveAttribute('aria-pressed', 'false');
    });
  }
  async playing(enabled: boolean) {
    return this.action(enabled ? 'play' : 'pause', { enabled }, async () => {
      const timeline = this.page.getByTestId('bottom-timeline');
      const control = timeline.locator('[data-tutorial="play-button"]');
      if ((await control.innerText()).trim() !== (enabled ? 'Pause' : 'Play')) await control.click();
      await expect(control).toHaveText(enabled ? 'Pause' : 'Play');
    });
  }
  async save() {
    return this.action('save', {}, async () => {
      await this.page.getByTestId('save-button').click();
      await expect(this.page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
    });
  }
  async reload() {
    return this.action('reload', {}, async () => {
      await this.page.reload();
      await expect(this.page.locator('[data-restoration-phase="active"]')).toBeVisible();
    });
  }
  async export(format: 'project' | 'png') {
    return this.action('export', { format }, async () => {
      if (format === 'project' && await this.page.evaluate(() =>
        typeof Reflect.get(window, 'showOpenFilePicker') === 'function'
        && typeof Reflect.get(window, 'showSaveFilePicker') === 'function')) {
        throw new ControllerInputError('This controller supports browser downloads. An OS-native save picker needs a separately qualified adapter.');
      }
      await this.page.getByTestId('export-button').click();
      const dialog = this.page.getByRole('dialog').filter({
        has: this.page.getByRole('heading', { name: /^(?:✦\s*)?Export Studio Assets$/ }),
      });
      await dialog.getByTestId(`export-tab-${format}`).click();
      if (format === 'png') await dialog.getByRole('button', { name: '1x', exact: true }).click();
      const pending = this.page.waitForEvent('download');
      await this.page.getByRole('dialog').getByRole('button', { name: format === 'project' ? 'Download project backup' : 'Download PNG', exact: true }).click();
      const download = await pending;
      const source = await download.path();
      if (!source) throw new Error('The browser did not retain the exported file.');
      const bytes = await readFile(source);
      await this.memory.artifact(`${String(this.actionNumber).padStart(3, '0')}-export.${format === 'project' ? 'pixibun' : 'png'}`, bytes);
      return bytes;
    });
  }
  async spriteSheet() {
    return this.action('export-sprite-sheet', { layout: 'horizontal', scale: 1, padding: 0, metadata: true }, async () => {
      await this.page.getByTestId('export-button').click();
      const dialog = this.page.getByRole('dialog');
      await dialog.getByTestId('export-tab-spritesheet').click();
      for (const name of ['horizontal', '1x', '0px']) await dialog.getByRole('button', { name, exact: true }).click();
      const scope = dialog.getByRole('combobox', { name: 'Export frame scope', exact: true });
      if (await scope.count()) await scope.selectOption('all');
      const metadataOff = dialog.getByRole('button', { name: 'OFF', exact: true });
      if (await metadataOff.count()) await metadataOff.click();
      await expect(dialog.getByRole('button', { name: 'ENABLED', exact: true })).toBeVisible();
      const extensions = ['png', 'json', 'tres'] as const;
      const pending = extensions.map(extension => this.page.waitForEvent('download', {
        predicate: download => download.suggestedFilename().endsWith(`.${extension}`),
      }));
      await dialog.getByRole('button', { name: 'Download SPRITESHEET', exact: true }).click();
      const downloads = await Promise.all(pending);
      const result = {} as Record<typeof extensions[number], { bytes: Buffer; filename: string }>;
      for (let index = 0; index < downloads.length; index++) {
        const download = downloads[index], source = await download.path();
        if (!source) throw new Error('The sprite sheet download was not retained.');
        const bytes = await readFile(source), extension = extensions[index];
        await this.memory.artifact(`${String(this.actionNumber).padStart(3, '0')}-sheet.${extension}`, bytes);
        result[extension] = { bytes, filename: download.suggestedFilename() };
      }
      return result;
    });
  }
}
