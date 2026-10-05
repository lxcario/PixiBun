import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';

describe('DesktopFileSystem API & Fallbacks', () => {
  const g = globalThis as unknown as {
    window: Record<string, unknown>;
    document: Record<string, unknown>;
    URL: Record<string, unknown>;
  };
  let savedWindow: unknown;
  let savedDocument: unknown;

  beforeEach(() => {
    savedWindow = g.window;
    savedDocument = g.document;
    g.window = g.window ?? {};
    g.document = g.document ?? {};
    g.document.body = g.document.body ?? {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };
    DesktopFileSystem.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    DesktopFileSystem.reset();
    g.window = savedWindow as Record<string, unknown>;
    g.document = savedDocument as Record<string, unknown>;
  });

  it('detects File System Access API support correctly', () => {
    delete g.window.showSaveFilePicker;
    delete g.window.showOpenFilePicker;
    expect(DesktopFileSystem.isSupported()).toBe(false);

    g.window.showSaveFilePicker = vi.fn();
    g.window.showOpenFilePicker = vi.fn();
    expect(DesktopFileSystem.isSupported()).toBe(true);
  });

  it('never reuses another project identity\'s native file handle', async () => {
    const writeA = vi.fn();
    const writeB = vi.fn();
    const handle = (name: string, write: typeof writeA) => ({ name,
      queryPermission: vi.fn().mockResolvedValue('granted'),
      createWritable: vi.fn().mockResolvedValue({ write, close: vi.fn() }),
    });
    const fileA = handle('A.pixibun', writeA);
    const fileB = handle('B.pixibun', writeB);
    g.window.showOpenFilePicker = vi.fn();
    g.window.showSaveFilePicker = vi.fn().mockResolvedValueOnce(fileA).mockResolvedValueOnce(fileB);
    await DesktopFileSystem.saveProject('A artwork', 'A.pixibun', false, 'A');
    await DesktopFileSystem.saveProject('B artwork', 'B.pixibun', false, 'B');
    expect(writeA.mock.calls).toEqual([['A artwork']]);
    expect(writeB.mock.calls).toEqual([['B artwork']]);
  });

  it('saves file via native File System Access API when supported', async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockHandle = {
      name: 'test-project.pixibun',
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      queryPermission: vi.fn().mockResolvedValue('granted'),
    };

    g.window.showOpenFilePicker = vi.fn();
    g.window.showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);

    const result = await DesktopFileSystem.saveProject('{"version": 1}', 'test-project.pixibun', true);

    expect(result.success).toBe(true);
    expect(result.filename).toBe('test-project.pixibun');
    expect(result.fallbackUsed).toBe(false);
    expect(mockWritable.write).toHaveBeenCalledWith('{"version": 1}');
    expect(mockWritable.close).toHaveBeenCalled();
    expect(DesktopFileSystem.getActiveHandle()).toBe(mockHandle as unknown as FileSystemFileHandle);
  });

  it('falls back to browser anchor download when showSaveFilePicker is unavailable', async () => {
    delete g.window.showSaveFilePicker;
    delete g.window.showOpenFilePicker;

    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    g.document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: clickSpy,
          remove: removeSpy,
        };
      }
      return {};
    });

    g.URL = g.URL || {};
    g.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
    g.URL.revokeObjectURL = vi.fn();

    const result = await DesktopFileSystem.saveProject('{"version": 1}', 'fallback.pixibun', false);

    expect(result.success).toBe(true);
    expect(result.filename).toBe('fallback.pixibun');
    expect(result.fallbackUsed).toBe(true);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles user cancellation in showSaveFilePicker gracefully', async () => {
    g.window.showOpenFilePicker = vi.fn();
    const abortErr = new Error('The user aborted a request.');
    abortErr.name = 'AbortError';
    g.window.showSaveFilePicker = vi.fn().mockRejectedValue(abortErr);

    const result = await DesktopFileSystem.saveProject('{"version": 1}', 'test.pixibun', true);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Save cancelled by user');
    expect(result.fallbackUsed).toBe(false);
  });

  it('opens project via native showOpenFilePicker', async () => {
    const mockFile = {
      name: 'opened.pixibun',
      text: vi.fn().mockResolvedValue('{"name":"opened-proj"}'),
    };

    const mockHandle = {
      name: 'opened.pixibun',
      getFile: vi.fn().mockResolvedValue(mockFile),
      queryPermission: vi.fn().mockResolvedValue('granted'),
    };

    g.window.showSaveFilePicker = vi.fn();
    g.window.showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);

    const result = await DesktopFileSystem.openProject();

    expect(result).not.toBeNull();
    expect(result?.filename).toBe('opened.pixibun');
    expect(result?.content).toBe('{"name":"opened-proj"}');
    expect(DesktopFileSystem.getActiveHandle()).toBe(mockHandle as unknown as FileSystemFileHandle);
  });

  it('verifies handle permission correctly', async () => {
    const mockHandleGranted = {
      queryPermission: vi.fn().mockResolvedValue('granted'),
    };
    expect(await DesktopFileSystem.verifyHandlePermission(mockHandleGranted as unknown as FileSystemFileHandle)).toBe(true);

    const mockHandlePrompt = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    expect(await DesktopFileSystem.verifyHandlePermission(mockHandlePrompt as unknown as FileSystemFileHandle)).toBe(true);
    expect(mockHandlePrompt.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('does not adopt a denied Save As handle', async () => {
    const original = { name: 'original.pixibun' } as FileSystemFileHandle;
    DesktopFileSystem.restoreAssociation({ handle: original, projectId: 'original', filename: original.name });
    const denied = { name: 'denied.pixibun', queryPermission: vi.fn(async () => 'denied'), createWritable: vi.fn() };
    g.window.showOpenFilePicker = vi.fn(); g.window.showSaveFilePicker = vi.fn(async () => denied);
    expect((await DesktopFileSystem.saveProject('pixels', denied.name, true, 'original')).success).toBe(false);
    expect(DesktopFileSystem.captureAssociation().handle).toBe(original); expect(denied.createWritable).not.toHaveBeenCalled();
  });

  it.each(['write', 'close'] as const)('aborts a staged native file on %s failure and retains the previous association', async failure => {
    const original = { name: 'original.pixibun' } as FileSystemFileHandle;
    DesktopFileSystem.restoreAssociation({ handle: original, projectId: 'original', filename: original.name });
    const stream = { write: vi.fn(async () => {}), close: vi.fn(async () => {}), abort: vi.fn(async () => {}) };
    stream[failure].mockRejectedValueOnce(new Error('Disk unavailable'));
    const selected = { name: 'new.pixibun', queryPermission: vi.fn(async () => 'granted'), createWritable: vi.fn(async () => stream) };
    g.window.showOpenFilePicker = vi.fn(); g.window.showSaveFilePicker = vi.fn(async () => selected);
    await expect(DesktopFileSystem.saveProject('pixels', selected.name, true, 'original')).rejects.toThrow('Disk unavailable');
    expect(stream.abort).toHaveBeenCalledOnce(); expect(DesktopFileSystem.getActiveHandle()).toBe(original);
  });

  it('does not attach a late save to a workspace that reset while the picker was open', async () => {
    let select!: (handle: unknown) => void;
    const stream = { write: vi.fn(async () => {}), close: vi.fn(async () => {}) };
    const selected = { name: 'old.pixibun', queryPermission: vi.fn(async () => 'granted'), createWritable: vi.fn(async () => stream) };
    g.window.showOpenFilePicker = vi.fn(); g.window.showSaveFilePicker = vi.fn(() => new Promise(resolve => { select = resolve; }));
    const pending = DesktopFileSystem.saveProject('old pixels', selected.name, true, 'old');
    DesktopFileSystem.reset(); select(selected); expect((await pending).success).toBe(true);
    expect(stream.write).toHaveBeenCalledWith('old pixels'); expect(DesktopFileSystem.getActiveHandle()).toBeNull();
  });

  it('cancels a staged write before commit and rejects overlapping file writes until it drains', async () => {
    let finish!: () => void;
    const stream = { write: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })), close: vi.fn(async () => {}), abort: vi.fn(async () => {}) };
    const selected = { name: 'pending.pixibun', queryPermission: vi.fn(async () => 'granted'), createWritable: vi.fn(async () => stream) };
    const picker = vi.fn(async () => selected); g.window.showOpenFilePicker = vi.fn(); g.window.showSaveFilePicker = picker;
    const controller = new AbortController(), pending = DesktopFileSystem.saveProject('pixels', selected.name, true, 'original', controller.signal);
    await vi.waitFor(() => expect(stream.write).toHaveBeenCalledOnce()); controller.abort();
    expect((await DesktopFileSystem.saveProject('other pixels', 'other.pixibun', true, 'other')).success).toBe(false);
    expect(picker).toHaveBeenCalledOnce(); finish(); expect((await pending).success).toBe(false);
    expect(stream.abort).toHaveBeenCalledOnce(); expect(stream.close).not.toHaveBeenCalled(); expect(DesktopFileSystem.getActiveHandle()).toBeNull();
    stream.write.mockResolvedValue(undefined); expect((await DesktopFileSystem.saveProject('retry pixels', selected.name, true, 'original')).success).toBe(true);
  });

  it('a pre-aborted download request does not create a file or URL', async () => {
    delete g.window.showSaveFilePicker; delete g.window.showOpenFilePicker;
    const create = vi.spyOn(URL, 'createObjectURL').mockClear(), controller = new AbortController(); controller.abort();
    await expect(DesktopFileSystem.saveProject('pixels', 'cancelled.pixibun', true, undefined, controller.signal)).rejects.toThrow(/abort/i);
    expect(create).not.toHaveBeenCalled();
  });
});
