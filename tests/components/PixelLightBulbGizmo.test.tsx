// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelLightBulbGizmo } from '@/components/studio/PixelLightBulbGizmo';
import { DEFAULT_LIGHT_LOOK, useLightLook } from '@/lib/canvas/lightLook';

describe('PixelLightBulbGizmo Component', () => {
  afterEach(() => {
    cleanup();
  });

  const dummyCanvasRef = { current: null };

  it('renders the interactive on-canvas light bulb gizmo with HUD controls', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByTestId('pixel-light-bulb-gizmo')).toBeDefined();
    const toolbar = screen.getByRole('toolbar', { name: 'Live Light Bulb Controls' });
    expect(toolbar).toBeDefined();
    expect(toolbar.className).toContain('top-full');
    expect(toolbar.className).not.toContain('-top-12');
    expect(screen.getByRole('slider', { name: /Directional Light Bulb/i })).toBeDefined();
    expect(screen.getByText(/Live Light Bulb/i)).toBeDefined();
    expect(toolbar.textContent).not.toContain('💡');
    expect(toolbar.textContent).not.toContain('📍');
    expect(toolbar.textContent).not.toContain('☀️');
  });

  it('handles Apply and Cancel button clicks', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    expect(applyBtn.textContent).toContain('Apply');
    expect(applyBtn.textContent).not.toContain('✔');
    fireEvent.click(applyBtn);
    expect(onCommit).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelBtn.textContent).toContain('Cancel');
    expect(cancelBtn.textContent).not.toContain('✖');
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('flushes the latest queued strength change before applying', () => {
    const callOrder: string[] = [];
    const onCommit = vi.fn(() => callOrder.push('commit'));
    const onCancel = vi.fn();
    const onLightChange = vi.fn(() => callOrder.push('render'));

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
        onLightChange={onLightChange}
      />
    );

    fireEvent.click(screen.getByTestId('pixel-light-strength-inc'));
    fireEvent.click(screen.getByTestId('pixel-light-apply'));

    expect(onLightChange).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['render', 'commit']);
  });

  it('selects glint styles live, flushes before Apply, and keeps Enter on a choice from applying', () => {
    useStudioStore.getState().setGlintStyle('soft');
    const onLightChange = vi.fn(), onCommit = vi.fn();
    render(<PixelLightBulbGizmo canvasWidth={32} canvasHeight={32} zoom={1600}
      mainCanvasRef={dummyCanvasRef} onCommit={onCommit} onCancel={vi.fn()} onLightChange={onLightChange} />);
    const crisp = screen.getByTestId('pixel-light-glint-crisp');
    fireEvent.click(crisp);
    expect(crisp.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(crisp, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('pixel-light-apply'));
    expect(onLightChange).toHaveBeenCalledTimes(1);
    expect(useStudioStore.getState().tools.glintStyle).toBe('crisp');
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('leaves capture-phase light actions untouched behind an open dialog', () => {
    const onCommit = vi.fn(); const onCancel = vi.fn(); const onLightChange = vi.fn();
    render(<PixelLightBulbGizmo canvasWidth={32} canvasHeight={32} zoom={1600} mainCanvasRef={dummyCanvasRef}
      onCommit={onCommit} onCancel={onCancel} onLightChange={onLightChange} />);
    const dialog = document.createElement('dialog'); dialog.setAttribute('open', ''); document.body.append(dialog);
    try {
      for (const key of ['Enter', 'Escape', '[', ']', '-']) fireEvent.keyDown(window, { key });
      fireEvent.keyDown(window, { key: 'r', code: 'KeyR', altKey: true });
      expect(onCommit).not.toHaveBeenCalled(); expect(onCancel).not.toHaveBeenCalled(); expect(onLightChange).not.toHaveBeenCalled();
    } finally { dialog.remove(); }
  });

  it('keeps the lighting handle owner able to adjust and apply while its slider is focused', () => {
    useStudioStore.getState().setLightBrightness(1.15);
    const onCommit = vi.fn(); const onCancel = vi.fn(); const onLightChange = vi.fn();
    render(<PixelLightBulbGizmo canvasWidth={32} canvasHeight={32} zoom={1600} mainCanvasRef={dummyCanvasRef}
      onCommit={onCommit} onCancel={onCancel} onLightChange={onLightChange} />);
    const handle = screen.getByTestId('pixel-light-bulb-handle'); handle.focus();
    fireEvent.keyDown(handle, { key: ']' }); fireEvent.keyDown(handle, { key: 'Enter' });
    expect(onLightChange).toHaveBeenCalledTimes(1); expect(onCommit).toHaveBeenCalledTimes(1);
    expect(useStudioStore.getState().tools.lightBrightness).toBe(1.3);
  });

  it('triggers onCommit when Enter key is pressed', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancel when Escape key is pressed', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders draggable middle light point handle and updates center coordinates on drag', async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const onLightChange = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
        onLightChange={onLightChange}
      />
    );

    const centerHandle = screen.getByTestId('pixel-light-center-handle');
    expect(centerHandle).toBeDefined();

    // Drag the middle light point
    fireEvent.pointerDown(centerHandle, { clientX: 200, clientY: 200, pointerId: 1 });
    const container = screen.getByTestId('pixel-light-bulb-gizmo');
    fireEvent.pointerMove(container, { clientX: 250, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(container, { pointerId: 1 });

    // Verify recenter button exists
    const recenterBtn = screen.getByRole('button', { name: /Recenter/i });
    expect(recenterBtn).toBeDefined();
    fireEvent.click(recenterBtn);
  });

  it('adjusts light strength via [-] / [+] steppers, keyboard hotkeys, and mouse wheel', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const onLightChange = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
        onLightChange={onLightChange}
      />
    );

    const valDisplay = screen.getByTestId('pixel-light-strength-val');
    expect(valDisplay).toBeDefined();
    const initialText = valDisplay.textContent;

    // Click increment button [+]
    const incBtn = screen.getByTestId('pixel-light-strength-inc');
    fireEvent.click(incBtn);
    expect(valDisplay.textContent).not.toBe(initialText);

    // Click decrement button [-]
    const decBtn = screen.getByTestId('pixel-light-strength-dec');
    fireEvent.click(decBtn);

    // Keyboard shortcut [-]
    fireEvent.keyDown(window, { key: '-' });

    // Keyboard shortcut [+]
    fireEvent.keyDown(window, { key: '+' });

    // Wheel event over gizmo
    const container = screen.getByTestId('pixel-light-bulb-gizmo');
    fireEvent.wheel(container, { deltaY: -100 });
  });

  it('updates azimuth and elevation to top-right when bulb handle is dragged to the top-right without moving center', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const onLightChange = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
        onLightChange={onLightChange}
      />
    );

    const bulbHandle = screen.getByTestId('pixel-light-bulb-handle');
    const container = screen.getByTestId('pixel-light-bulb-gizmo');

    // Canvas is 32x32 at zoom 1600% = 512x512 stage. Center is at (256, 256).
    // Top right is at (400, 100) -> dx = 144 > 0, dy = -156 < 0
    fireEvent.pointerDown(bulbHandle, { clientX: 256, clientY: 256, pointerId: 1 });
    fireEvent.pointerMove(container, { clientX: 400, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(container, { pointerId: 1 });

    expect(onLightChange).toHaveBeenCalled();
    const lastCall = onLightChange.mock.calls[onLightChange.mock.calls.length - 1];
    const [azimuth, elevation, centerX, centerY] = lastCall;
    // Azimuth for top-right (dx > 0, dy < 0) must be in the first quadrant (0° to 90°)
    expect(azimuth).toBeGreaterThan(0);
    expect(azimuth).toBeLessThan(90);
    expect(elevation).toBeGreaterThan(0);
    // Center must stay fixed at (16, 16) - bulb drag does NOT move center!
    expect(centerX).toBe(16);
    expect(centerY).toBe(16);
  });

  it('updates center coordinates when center handle is dragged without collapsing bulb onto center', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const onLightChange = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
        onLightChange={onLightChange}
      />
    );

    const centerHandle = screen.getByTestId('pixel-light-center-handle');
    const container = screen.getByTestId('pixel-light-bulb-gizmo');

    // Drag center handle to (400, 100) on stage -> (25, 6) in canvas coords
    fireEvent.pointerDown(centerHandle, { clientX: 256, clientY: 256, pointerId: 1 });
    fireEvent.pointerMove(container, { clientX: 400, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(container, { pointerId: 1 });

    expect(onLightChange).toHaveBeenCalled();
    const lastCall = onLightChange.mock.calls[onLightChange.mock.calls.length - 1];
    const [, , centerX, centerY] = lastCall;
    expect(centerX).toBe(25);
    expect(centerY).toBe(6);
  });

  it('aims from the compass, sets height, and sends tint and material with the live light', () => {
    useLightLook.setState({ ...DEFAULT_LIGHT_LOOK });
    useStudioStore.getState().setLightElevation(40);
    const onLightChange = vi.fn(), onCommit = vi.fn();
    render(<PixelLightBulbGizmo canvasWidth={32} canvasHeight={32} zoom={1600}
      mainCanvasRef={dummyCanvasRef} onCommit={onCommit} onCancel={vi.fn()} onLightChange={onLightChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Light from the right' }));
    fireEvent.click(screen.getByTestId('pixel-light-apply'));
    expect(onLightChange.mock.calls.at(-1)?.[0]).toBe(90);

    fireEvent.change(screen.getByTestId('pixel-light-height'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('pixel-light-more'));
    fireEvent.click(screen.getByTestId('pixel-light-tint-candle'));
    fireEvent.click(screen.getByTestId('pixel-light-material-gold'));
    fireEvent.click(screen.getByTestId('pixel-light-apply'));
    const [, elevation, , , , look] = onLightChange.mock.calls.at(-1)!;
    expect(elevation).toBe(20);
    expect(look).toMatchObject({ lightColor: '#FFD49A', material: 'gold' });
    expect(useStudioStore.getState().tools.materialPreset).toBe('gold');
    expect(screen.getByTestId('pixel-light-material-gold').getAttribute('aria-pressed')).toBe('true');
  });

  it('resets the look to daylight, default fill, normal edges and no dither', () => {
    useLightLook.setState({ lightColor: '#B8CCFF', ambientIntensity: 0.2, material: 'matte' });
    useStudioStore.getState().setCavityStrength(1.8);
    useStudioStore.getState().setDitherModulation(0.6);
    render(<PixelLightBulbGizmo canvasWidth={32} canvasHeight={32} zoom={1600}
      mainCanvasRef={dummyCanvasRef} onCommit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByTestId('pixel-light-reset-look'));
    expect(useLightLook.getState()).toMatchObject({ lightColor: '#FFFFFF', ambientIntensity: 0.48 });
    expect(useStudioStore.getState().tools.cavityStrength).toBe(1);
    expect(useStudioStore.getState().tools.ditherModulation).toBe(0);
  });
});
