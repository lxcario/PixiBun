'use client';

import { create } from 'zustand';
import { BunPose } from '@/lib/art/bunSprite';
import { PLAYGROUND_LESSONS, PlaygroundLesson, LessonFrameTemplate } from '@/lib/art/playgroundLessons';
import { StencilAnalysis } from '@/lib/art/stencilEvaluator';

export type StepType = 'DRAW_FRAME' | 'PLAYBACK' | 'COMPLETE';

export interface DynamicStep {
  id: string;
  type: StepType;
  stepIndex: number;
  totalSteps: number;
  frameIndex?: number;
  title: string;
  subtitle: string;
  dialogTitle: string;
  mascotPose: BunPose;
  description: string;
  artisanTip: string;
  targetSelector: string | null;
  highlightLabel?: string;
  nextButtonLabel: string;
  template?: LessonFrameTemplate;
}

export function generateLessonSteps(lesson: PlaygroundLesson): DynamicStep[] {
  const steps: DynamicStep[] = [];

  // Steps 1..N: Draw each frame directly without screen-blocking welcome popups
  lesson.frames.forEach((frame, idx) => {
    const isLastFrame = idx === lesson.frames.length - 1;
    steps.push({
      id: `draw-frame-${idx}`,
      type: 'DRAW_FRAME',
      stepIndex: steps.length,
      totalSteps: 0,
      frameIndex: idx,
      title: `${frame.name}`,
      subtitle: `${frame.subhead}`,
      dialogTitle: `Inking ${frame.name}`,
      mascotPose: idx % 2 === 0 ? 'idle' : 'happy',
      description: 'Use your Pen tool (B) to trace the perimeter outline onto the canvas. Notice the silhouette deformation for this keyframe.',
      artisanTip: frame.artisanRule,
      targetSelector: '#center-canvas-area',
      highlightLabel: 'Canvas Tracing Lightbox',
      nextButtonLabel: isLastFrame ? 'Next: Test Playback' : `Next: Frame ${idx + 2}`,
      template: frame,
    });
  });

  // Playback Step
  steps.push({
    id: 'playback',
    type: 'PLAYBACK',
    stepIndex: steps.length,
    totalSteps: 0,
    title: 'Playback & Timing Validation',
    subtitle: `Testing ${lesson.title} Loop at ${lesson.fps} FPS`,
    dialogTitle: 'Validate Motion Loop',
    mascotPose: 'happy',
    description:
      'Press "PLAY" (or tap Spacebar) on the timeline. Observe the rhythm. Notice how the deformation keyframes produce fluid, living physics.',
    artisanTip: `Timing Metric: This loop runs at ${lesson.fps} FPS to give natural weight and bounce.`,
    targetSelector: '[data-tutorial="play-button"]',
    highlightLabel: 'Play / Pause Loop',
    nextButtonLabel: 'Complete Lesson',
  });

  // Complete Step
  steps.push({
    id: 'complete',
    type: 'COMPLETE',
    stepIndex: steps.length,
    totalSteps: 0,
    title: 'Lesson Mastered',
    subtitle: 'Ready for Full Production Workspace',
    dialogTitle: 'Artisan Lesson Complete',
    mascotPose: 'happy',
    description: `You have successfully built a full ${lesson.totalFrames}-frame animation cycle. Your artwork is preserved in live browser memory. Transfer into the full Studio to access color ramps, multi-layer shading, normal maps, and GIF exports.`,
    artisanTip: 'Next Steps: In the full studio, try adding secondary shading, specular glints, or character costumes.',
    targetSelector: null,
    nextButtonLabel: 'Enter Full Studio',
  });

  const total = steps.length;
  steps.forEach((s) => {
    s.totalSteps = total;
  });

  return steps;
}

interface OnboardingState {
  currentStepIndex: number;
  isPlaygroundActive: boolean;
  activeLessonId: string;
  steps: DynamicStep[];
  showStencilGuide: boolean;
  stencilOpacity: number;
  completedStepIndices: Set<number>;
  hasDrawnCurrentFrame: boolean;
  coverageRatio: number;
  isFrameDrawingComplete: boolean;
  latestAnalysis: StencilAnalysis | null;

  // Actions
  setStepIndex: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  selectLesson: (lessonId: string) => void;
  toggleStencilGuide: () => void;
  setStencilOpacity: (opacity: number) => void;
  recordAnalysis: (analysis: StencilAnalysis) => void;
  resetOnboarding: () => void;
  startPlayground: () => void;
  completeOnboarding: () => void;
  getCurrentLesson: () => PlaygroundLesson;
  getCurrentStep: () => DynamicStep;
  getCurrentFrameTemplate: () => LessonFrameTemplate | null;
}

const initialLesson = PLAYGROUND_LESSONS[0];
const initialSteps = generateLessonSteps(initialLesson);

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStepIndex: 0,
  isPlaygroundActive: true,
  activeLessonId: initialLesson.id,
  steps: initialSteps,
  showStencilGuide: true,
  stencilOpacity: 0.45,
  completedStepIndices: new Set<number>(),
  hasDrawnCurrentFrame: false,
  coverageRatio: 0,
  isFrameDrawingComplete: false,
  latestAnalysis: null,

  setStepIndex: (index: number) => {
    const { steps, currentStepIndex, completedStepIndices } = get();
    const validIndex = Math.max(0, Math.min(steps.length - 1, index));

    const nextCompleted = new Set(completedStepIndices);
    nextCompleted.add(currentStepIndex);

    set({
      currentStepIndex: validIndex,
      completedStepIndices: nextCompleted,
      hasDrawnCurrentFrame: false,
      coverageRatio: 0,
      isFrameDrawingComplete: false,
      latestAnalysis: null,
    });
  },

  nextStep: () => {
    const { currentStepIndex } = get();
    get().setStepIndex(currentStepIndex + 1);
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    get().setStepIndex(currentStepIndex - 1);
  },

  selectLesson: (lessonId: string) => {
    const lesson = PLAYGROUND_LESSONS.find((l) => l.id === lessonId) || PLAYGROUND_LESSONS[0];
    const newSteps = generateLessonSteps(lesson);

    set({
      activeLessonId: lesson.id,
      steps: newSteps,
      currentStepIndex: 0,
      completedStepIndices: new Set<number>(),
      hasDrawnCurrentFrame: false,
      coverageRatio: 0,
      isFrameDrawingComplete: false,
      latestAnalysis: null,
    });
  },

  toggleStencilGuide: () => {
    set((state) => ({ showStencilGuide: !state.showStencilGuide }));
  },

  setStencilOpacity: (opacity: number) => {
    set({ stencilOpacity: Math.max(0.1, Math.min(1.0, opacity)) });
  },

  recordAnalysis: (analysis: StencilAnalysis) => {
    set({
      hasDrawnCurrentFrame: true,
      coverageRatio: analysis.completionScore / 100,
      isFrameDrawingComplete: analysis.isComplete,
      latestAnalysis: analysis,
    });
  },

  resetOnboarding: () => {
    const lesson = PLAYGROUND_LESSONS[0];
    set({
      activeLessonId: lesson.id,
      steps: generateLessonSteps(lesson),
      currentStepIndex: 0,
      completedStepIndices: new Set<number>(),
      hasDrawnCurrentFrame: false,
      coverageRatio: 0,
      isFrameDrawingComplete: false,
      latestAnalysis: null,
    });
  },

  startPlayground: () => {
    const lesson = get().getCurrentLesson();
    set({
      isPlaygroundActive: true,
      steps: generateLessonSteps(lesson),
      currentStepIndex: 0,
      completedStepIndices: new Set<number>(),
      hasDrawnCurrentFrame: false,
      coverageRatio: 0,
      isFrameDrawingComplete: false,
      latestAnalysis: null,
    });
  },

  completeOnboarding: () => {
    const { steps } = get();
    set({ currentStepIndex: steps.length - 1 });
  },

  getCurrentLesson: () => {
    const { activeLessonId } = get();
    return PLAYGROUND_LESSONS.find((l) => l.id === activeLessonId) || PLAYGROUND_LESSONS[0];
  },

  getCurrentStep: () => {
    const { steps, currentStepIndex } = get();
    return steps[Math.max(0, Math.min(steps.length - 1, currentStepIndex))];
  },

  getCurrentFrameTemplate: () => {
    const step = get().getCurrentStep();
    if (!step || step.type !== 'DRAW_FRAME') return null;
    if (step.template) return step.template;
    if (step.frameIndex !== undefined) {
      const lesson = get().getCurrentLesson();
      return lesson.frames[step.frameIndex] || null;
    }
    return null;
  },
}));
