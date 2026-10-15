import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOnboardingStore, generateLessonSteps } from '@/stores/onboardingStore';
import { PLAYGROUND_LESSONS, getTemplateRows } from '@/lib/art/playgroundLessons';
import { StencilAnalysis } from '@/lib/art/stencilEvaluator';

describe('onboardingStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useOnboardingStore.getState().resetOnboarding();
  });

  it('initializes directly with Frame 1 drawing step and first lesson', () => {
    const state = useOnboardingStore.getState();
    expect(state.currentStepIndex).toBe(0);
    expect(state.isPlaygroundActive).toBe(true);
    expect(state.activeLessonId).toBe(PLAYGROUND_LESSONS[0].id);
    expect(state.showStencilGuide).toBe(true);
    expect(state.hasDrawnCurrentFrame).toBe(false);
    expect(state.getCurrentStep().type).toBe('DRAW_FRAME');
  });

  it('navigates through dynamic steps sequentially with nextStep and prevStep', () => {
    const store = useOnboardingStore.getState();
    
    expect(store.currentStepIndex).toBe(0);
    store.nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
    expect(useOnboardingStore.getState().getCurrentStep().type).toBe('DRAW_FRAME');

    store.nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(2);
    expect(useOnboardingStore.getState().getCurrentStep().type).toBe('DRAW_FRAME');

    store.prevStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
  });

  it('allows switching lessons and regenerates steps dynamically without welcome popup', () => {
    const store = useOnboardingStore.getState();
    store.selectLesson('hearth-flame');
    expect(useOnboardingStore.getState().activeLessonId).toBe('hearth-flame');
    expect(useOnboardingStore.getState().getCurrentLesson().title).toBe('The Hearth Flame');
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
    expect(useOnboardingStore.getState().getCurrentStep().type).toBe('DRAW_FRAME');

    const flameSteps = generateLessonSteps(useOnboardingStore.getState().getCurrentLesson());
    expect(flameSteps.length).toBe(5); // F1, F2, F3, Playback, Complete
  });

  it('provides frame stencil template for active step', () => {
    const store = useOnboardingStore.getState();
    store.setStepIndex(0); // Frame 1
    const template1 = useOnboardingStore.getState().getCurrentFrameTemplate();
    expect(template1).toBeDefined();
    expect(template1?.name).toContain('Frame 1');
    const rows = getTemplateRows(template1!);
    expect(rows.length).toBeGreaterThanOrEqual(16);
  });

  it('records outline analysis and marks complete when outline is covered', () => {
    useOnboardingStore.getState().setStepIndex(0); // Drawing Step

    const mockIncompleteAnalysis: StencilAnalysis = {
      targetOutlineCells: 20,
      coveredOutlineCells: 5,
      outlineCoverage: 0.25,
      totalTargetCells: 20,
      totalCoveredCells: 5,
      totalCoverage: 0.25,
      targetBoundingBox: { minX: 2, minY: 2, maxX: 14, maxY: 14 },
      drawnBoundingBox: { minX: 4, minY: 4, maxX: 12, maxY: 12 },
      boundingBoxIoU: 0.4,
      totalDrawnPixels: 15,
      isComplete: false,
      completionScore: 25,
      statusMessage: 'In progress',
    };

    useOnboardingStore.getState().recordAnalysis(mockIncompleteAnalysis);
    expect(useOnboardingStore.getState().hasDrawnCurrentFrame).toBe(true);
    expect(useOnboardingStore.getState().coverageRatio).toBe(0.25);
    expect(useOnboardingStore.getState().isFrameDrawingComplete).toBe(false);

    // Now send complete analysis (>= 85%)
    const mockCompleteAnalysis: StencilAnalysis = {
      ...mockIncompleteAnalysis,
      coveredOutlineCells: 18,
      outlineCoverage: 0.9,
      isComplete: true,
      completionScore: 90,
    };

    useOnboardingStore.getState().recordAnalysis(mockCompleteAnalysis);
    expect(useOnboardingStore.getState().isFrameDrawingComplete).toBe(true);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });

  it('shows the tracing guide again when a practice starts after Studio hid it', () => {
    useOnboardingStore.setState({ isPlaygroundActive: false, showStencilGuide: false });
    useOnboardingStore.getState().startPlayground();
    expect(useOnboardingStore.getState().showStencilGuide).toBe(true);
  });

  it('toggles stencil guide visibility and sets opacity', () => {
    expect(useOnboardingStore.getState().showStencilGuide).toBe(true);
    useOnboardingStore.getState().toggleStencilGuide();
    expect(useOnboardingStore.getState().showStencilGuide).toBe(false);

    useOnboardingStore.getState().setStencilOpacity(0.8);
    expect(useOnboardingStore.getState().stencilOpacity).toBe(0.8);
  });

  it('generates valid steps for all playground lessons', () => {
    for (const lesson of PLAYGROUND_LESSONS) {
      const steps = generateLessonSteps(lesson);
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps[0].type).toBe('DRAW_FRAME');
      expect(steps[steps.length - 1].type).toBe('COMPLETE');
    }
  });
});
