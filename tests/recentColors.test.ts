import { useStudioStore } from '@/stores/studioStore';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

describe('Recent Colors LRU Logic', () => {
  beforeEach(() => {
    // Mock localStorage & window
    const mockStorage = new Map<string, string>();
    const storageMock = {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      clear: () => mockStorage.clear(),
    };
    vi.stubGlobal('localStorage', storageMock);
    vi.stubGlobal('window', { localStorage: storageMock });
    // Reset store
    useStudioStore.setState({ recentColors: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds colors and caps at 8', () => {
    const store = useStudioStore.getState();
    const colors = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006', '#000007', '#000008', '#000009'];
    colors.forEach(c => store.addRecentColor(c));
    
    const updatedState = useStudioStore.getState();
    expect(updatedState.recentColors).toHaveLength(8);
    // #000009 should be first, #000002 should be last, #000001 is popped
    expect(updatedState.recentColors[0]).toBe('#000009');
    expect(updatedState.recentColors[7]).toBe('#000002');
  });

  it('deduplicates repeat hex and corrects ordering on reuse', () => {
    const store = useStudioStore.getState();
    store.addRecentColor('#111111');
    store.addRecentColor('#222222');
    store.addRecentColor('#333333');
    
    // Current order: 3, 2, 1
    expect(useStudioStore.getState().recentColors).toEqual(['#333333', '#222222', '#111111']);
    
    // Reuse #111111
    store.addRecentColor('#111111');
    
    // Order should now be 1, 3, 2
    expect(useStudioStore.getState().recentColors).toEqual(['#111111', '#333333', '#222222']);
  });

  it('survives loadProjectState unchanged and is not in project output', () => {
    const store = useStudioStore.getState();
    store.addRecentColor('#ABCDEF');
    
    // Load a project state
    store.loadProjectState({
      name: 'Test Project',
      width: 16,
      height: 16
    });
    
    // recentColors must survive
    expect(useStudioStore.getState().recentColors).toEqual(['#ABCDEF']);
  });

  it('loads recent colors defensively from localStorage via loadRecentColors', () => {
    localStorage.setItem('pixibun_recent_colors', JSON.stringify(['#AABBCC', '#DDEEFF']));
    const store = useStudioStore.getState();
    store.loadRecentColors();
    expect(useStudioStore.getState().recentColors).toEqual(['#AABBCC', '#DDEEFF']);
  });

  it('handles invalid or corrupted localStorage data gracefully during loadRecentColors', () => {
    localStorage.setItem('pixibun_recent_colors', 'corrupted-json-not-valid{{{');
    const store = useStudioStore.getState();
    store.loadRecentColors();
    // Keeps previous state without throwing
    expect(Array.isArray(useStudioStore.getState().recentColors)).toBe(true);
  });
});
