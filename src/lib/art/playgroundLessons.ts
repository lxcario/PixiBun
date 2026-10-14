// Dedicated master lesson templates and animation theory for the PixiBun Playground.
// Grounded in verified classical animation principles adapted to discrete pixel grids:
// Pedro Medeiros (Saint11), Michael Azzi (Pixel Logic), and Richard Williams (Animator's Survival Kit).
// The poses themselves are painted in lessonArt.ts.

import { buildLessonArt } from './lessonArt';

export interface LessonFrameTemplate {
  frameIndex: number;
  name: string;
  subhead: string;
  principle: string;
  explanation: string;
  artisanRule: string;
  grid16?: string[];
  gridRows?: string[];
  canvasSize?: 16 | 32;
  recommendedHoldMs: number;
  kineticPhase?: string;
  effectivePixelArea?: number;
  opticalTrick?: string;
}

export interface PlaygroundLesson {
  id: string;
  title: string;
  badge: string;
  concept: string;
  description: string;
  fps: number;
  totalFrames: number;
  canvasSize?: 16 | 32;
  frames: LessonFrameTemplate[];
}

export function getTemplateRows(template: LessonFrameTemplate): string[] {
  return template.gridRows || template.grid16 || [];
}

export function getTemplateGridSize(template: LessonFrameTemplate): number {
  if (template.canvasSize) return template.canvasSize;
  if (template.gridRows && template.gridRows.length > 0) return template.gridRows.length;
  if (template.grid16 && template.grid16.length > 0) return template.grid16.length;
  return 16;
}

// Master Bouncing Ball (12-Frame Complete Cycle at 32x32)
const MASTER_BOUNCING_BALL_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: "Frame 1: Apex Float",
    subhead: "Apex Float (112 px area, ~120 ms)",
    principle: "Apex Float",
    explanation: "Keyframe 1 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 120,
    kineticPhase: "Apex Float",
    effectivePixelArea: 112,
    opticalTrick: "Apex Hang Time: Gravitational balance at crest (0px velocity)",
  },
  {
    frameIndex: 1,
    name: "Frame 2: Apex Cushioning",
    subhead: "Apex Cushioning (112 px area, ~80 ms)",
    principle: "Apex Cushioning",
    explanation: "Keyframe 2 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 80,
    kineticPhase: "Apex Cushioning",
    effectivePixelArea: 112,
    opticalTrick: "Deceleration Halving: 1px initial descent cushions away from apex",
  },
  {
    frameIndex: 2,
    name: "Frame 3: Fall Acceleration",
    subhead: "Fall Acceleration (112 px area, ~60 ms)",
    principle: "Fall Acceleration",
    explanation: "Keyframe 3 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 60,
    kineticPhase: "Fall Acceleration",
    effectivePixelArea: 112,
    opticalTrick: "Kinetic Stretch: 1px lateral narrowing balances vertical elongation",
  },
  {
    frameIndex: 3,
    name: "Frame 4: Terminal Velocity Stretch",
    subhead: "Terminal Velocity Stretch (112 px area, ~50 ms)",
    principle: "Terminal Velocity Stretch",
    explanation: "Keyframe 4 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 50,
    kineticPhase: "Terminal Velocity Stretch",
    effectivePixelArea: 112,
    opticalTrick: "Terminal Velocity: Maximum kinetic stretch bridges distance to ground",
  },
  {
    frameIndex: 4,
    name: "Frame 5: Ground Contact",
    subhead: "Ground Contact (112 px area, ~40 ms)",
    principle: "Ground Contact",
    explanation: "Keyframe 5 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 40,
    kineticPhase: "Ground Contact",
    effectivePixelArea: 112,
    opticalTrick: "Impact Compression: Base touches ground plane (y=26), initiating squash",
  },
  {
    frameIndex: 5,
    name: "Frame 6: Impact Squash (Hitstop)",
    subhead: "Impact Squash (Hitstop) (112 px area, ~200 ms)",
    principle: "Impact Squash (Hitstop)",
    explanation: "Keyframe 6 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 200,
    kineticPhase: "Impact Squash (Hitstop)",
    effectivePixelArea: 112,
    opticalTrick: "Weight & Energy Dissipation: Broad flat base absorbs kinetic energy",
  },
  {
    frameIndex: 6,
    name: "Frame 7: Elastic Rebound",
    subhead: "Elastic Rebound (112 px area, ~40 ms)",
    principle: "Elastic Rebound",
    explanation: "Keyframe 7 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 40,
    kineticPhase: "Elastic Rebound",
    effectivePixelArea: 112,
    opticalTrick: "Elastic Recoil: Rebound stretch propels ball vertically",
  },
  {
    frameIndex: 7,
    name: "Frame 8: Ascent Transfer",
    subhead: "Ascent Transfer (112 px area, ~50 ms)",
    principle: "Ascent Transfer",
    explanation: "Keyframe 8 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 50,
    kineticPhase: "Ascent Transfer",
    effectivePixelArea: 112,
    opticalTrick: "Ascent Transition: Deceleration begins restoring circular equilibrium",
  },
  {
    frameIndex: 8,
    name: "Frame 9: Deceleration Cushion",
    subhead: "Deceleration Cushion (112 px area, ~70 ms)",
    principle: "Deceleration Cushion",
    explanation: "Keyframe 9 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 70,
    kineticPhase: "Deceleration Cushion",
    effectivePixelArea: 112,
    opticalTrick: "Deceleration Halving: Upward speed halves as gravity counteracts inertia",
  },
  {
    frameIndex: 9,
    name: "Frame 10: Apex Slow-In",
    subhead: "Apex Slow-In (112 px area, ~90 ms)",
    principle: "Apex Slow-In",
    explanation: "Keyframe 10 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 90,
    kineticPhase: "Apex Slow-In",
    effectivePixelArea: 112,
    opticalTrick: "Apex Slow-In: Near-zero velocity creates suspended hang time",
  },
  {
    frameIndex: 10,
    name: "Frame 11: Overshoot Oscillation",
    subhead: "Overshoot Oscillation (112 px area, ~100 ms)",
    principle: "Overshoot Oscillation",
    explanation: "Keyframe 11 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 100,
    kineticPhase: "Overshoot Oscillation",
    effectivePixelArea: 112,
    opticalTrick: "Micro-Settling: Subtle kinetic settling before final loop reset",
  },
  {
    frameIndex: 11,
    name: "Frame 12: Cycle Reset",
    subhead: "Cycle Reset (112 px area, ~100 ms)",
    principle: "Cycle Reset",
    explanation: "Keyframe 12 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline.",
    artisanRule: "Mass Conservation: 112 px effective area preserved with zero outline leaks.",
    canvasSize: 32,
    recommendedHoldMs: 100,
    kineticPhase: "Cycle Reset",
    effectivePixelArea: 112,
    opticalTrick: "Seamless Loop: Identical resting mass connects cleanly back to Frame 1",
  },
];

const SUBPIXEL_IDLE_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: "Frame 1: Resting Chest Stance",
    subhead: "Frame 1: Resting Chest Stance (~250 ms)",
    principle: "Sub-Pixel Luminosity & Anti-Boiling",
    explanation: "Keyframe 1 of 3. Silhouette contour maintains consistent edge alignment without pixel boiling.",
    artisanRule: "Cluster Stability: Locking silhouette clusters minimizes pixel boiling.",
    canvasSize: 32,
    recommendedHoldMs: 250,
    kineticPhase: "Neutral Rest",
    effectivePixelArea: 145,
    opticalTrick: "Sub-Pixel Contrast Modulation: Shifting internal belly shade by 1px simulates breathing.",
  },
  {
    frameIndex: 1,
    name: "Frame 2: Inhale Chest Rise",
    subhead: "Frame 2: Inhale Chest Rise (~300 ms)",
    principle: "Sub-Pixel Luminosity & Anti-Boiling",
    explanation: "Keyframe 2 of 3. Silhouette contour maintains consistent edge alignment without pixel boiling.",
    artisanRule: "Cluster Stability: Locking silhouette clusters minimizes pixel boiling.",
    canvasSize: 32,
    recommendedHoldMs: 300,
    kineticPhase: "Inhale Expansion",
    effectivePixelArea: 145,
    opticalTrick: "Sub-Pixel Contrast Modulation: Shifting internal belly shade by 1px simulates breathing.",
  },
  {
    frameIndex: 2,
    name: "Frame 3: Exhale Gravity Settle",
    subhead: "Frame 3: Exhale Gravity Settle (~550 ms)",
    principle: "Sub-Pixel Luminosity & Anti-Boiling",
    explanation: "Keyframe 3 of 3. Silhouette contour maintains consistent edge alignment without pixel boiling.",
    artisanRule: "Cluster Stability: Locking silhouette clusters minimizes pixel boiling.",
    canvasSize: 32,
    recommendedHoldMs: 550,
    kineticPhase: "Exhale Settle",
    effectivePixelArea: 145,
    opticalTrick: "Sub-Pixel Contrast Modulation: Shifting internal belly shade by 1px simulates breathing.",
  },
];

const COMBAT_SLASH_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: "Frame 1: High Windup Hold",
    subhead: "Potential energy stored at 45° angle (~200 ms)",
    principle: "Combat Anticipation",
    explanation: "The blade is held high above the warrior. Clear diagonal silhouette tells the player an attack is imminent.",
    artisanRule: "Silhouette Readability: A strong diagonal communicating high potential energy.",
    canvasSize: 32,
    recommendedHoldMs: 200,
    kineticPhase: "Anticipation Windup",
    effectivePixelArea: 68,
    opticalTrick: "Potential Energy Hold: High 45° angle registers upcoming strike.",
  },
  {
    frameIndex: 1,
    name: "Frame 2: 180° Crescent Smear",
    subhead: "Single-frame kinetic speed arc (~40 ms)",
    principle: "Action Smear Discipline",
    explanation: "In a single explosive 40ms frame, the blade sweeps 180 degrees. The crescent blur bridges the screen space.",
    artisanRule: "Single-Frame Discipline: Never hold a smear frame for longer than 1 frame (40ms).",
    canvasSize: 32,
    recommendedHoldMs: 40,
    kineticPhase: "Action Smear",
    effectivePixelArea: 96,
    opticalTrick: "180° Crescent Smear: 2px sweeping arc bridges screen space in 40ms.",
  },
  {
    frameIndex: 2,
    name: "Frame 3: Impact Hitstop & Spark",
    subhead: "Kinetic strike freeze with impact sparks (~180 ms)",
    principle: "Hitstop Impact Pause",
    explanation: "On impact, the motion freezes completely for 180ms. The contrast communicates bone-crunching strike weight.",
    artisanRule: "Impact Freeze: Hitstop holds sell physical impact better than continuous tweening.",
    canvasSize: 32,
    recommendedHoldMs: 180,
    kineticPhase: "Impact Hitstop",
    effectivePixelArea: 84,
    opticalTrick: "Visceral Hitstop: 180ms freeze registers strike contact and delivers punchy feedback.",
  },
  {
    frameIndex: 3,
    name: "Frame 4: Recovery Overshoot & Guard",
    subhead: "Settling back into ready combat guard (~120 ms)",
    principle: "Recovery & Settle",
    explanation: "After impact, the blade momentum settles downward into a solid guard stance, resetting combat balance.",
    artisanRule: "Recovery Momentum: Dissipate kinetic energy smoothly into defensive guard posture.",
    canvasSize: 32,
    recommendedHoldMs: 120,
    kineticPhase: "Recovery Settle",
    effectivePixelArea: 76,
    opticalTrick: "Follow-Through Dampening: Deceleration back into resting combat guard.",
  },
];

const CHARACTER_HOP_SHOCK_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: "Frame 1: Crouch Anticipation",
    subhead: "Downward compression stores spring potential (~140 ms)",
    principle: "Crouch Anticipation",
    explanation: "Keyframe 1 of 5. Frame 1: Crouch Anticipation. Symmetrical closed outline with zero leaks.",
    artisanRule: "Secondary Overlap & Ground Hitstop: Trailing ears and impact hold sell weight.",
    canvasSize: 32,
    recommendedHoldMs: 140,
    kineticPhase: "Crouch Anticipation",
    effectivePixelArea: 130,
    opticalTrick: "Secondary Overlap: Kinetic energy transfers through body into trailing ears.",
  },
  {
    frameIndex: 1,
    name: "Frame 2: Explosive Launch Stretch",
    subhead: "Kinetic elongation leaves the floor (~50 ms)",
    principle: "Launch Stretch",
    explanation: "Keyframe 2 of 5. Frame 2: Explosive Launch Stretch. Symmetrical closed outline with zero leaks.",
    artisanRule: "Secondary Overlap & Ground Hitstop: Trailing ears and impact hold sell weight.",
    canvasSize: 32,
    recommendedHoldMs: 50,
    kineticPhase: "Launch Stretch",
    effectivePixelArea: 130,
    opticalTrick: "Secondary Overlap: Kinetic energy transfers through body into trailing ears.",
  },
  {
    frameIndex: 2,
    name: "Frame 3: Apex Hang & Ear Drag",
    subhead: "Secondary overlapping action at zero-G (~160 ms)",
    principle: "Apex Hang",
    explanation: "Keyframe 3 of 5. Frame 3: Apex Hang & Ear Drag. Symmetrical closed outline with zero leaks.",
    artisanRule: "Secondary Overlap & Ground Hitstop: Trailing ears and impact hold sell weight.",
    canvasSize: 32,
    recommendedHoldMs: 160,
    kineticPhase: "Apex Hang",
    effectivePixelArea: 130,
    opticalTrick: "Secondary Overlap: Kinetic energy transfers through body into trailing ears.",
  },
  {
    frameIndex: 3,
    name: "Frame 4: Impact Squash & Hitstop",
    subhead: "Ground impact shock absorption hold (~180 ms)",
    principle: "Impact Squash (Hitstop)",
    explanation: "Keyframe 4 of 5. Frame 4: Impact Squash & Hitstop. Symmetrical closed outline with zero leaks.",
    artisanRule: "Secondary Overlap & Ground Hitstop: Trailing ears and impact hold sell weight.",
    canvasSize: 32,
    recommendedHoldMs: 180,
    kineticPhase: "Impact Squash (Hitstop)",
    effectivePixelArea: 130,
    opticalTrick: "Secondary Overlap: Kinetic energy transfers through body into trailing ears.",
  },
  {
    frameIndex: 4,
    name: "Frame 5: Sub-Pixel Elastic Settle",
    subhead: "Restoring neutral upright stance (~100 ms)",
    principle: "Sub-Pixel Settle",
    explanation: "Keyframe 5 of 5. Frame 5: Sub-Pixel Elastic Settle. Symmetrical closed outline with zero leaks.",
    artisanRule: "Secondary Overlap & Ground Hitstop: Trailing ears and impact hold sell weight.",
    canvasSize: 32,
    recommendedHoldMs: 100,
    kineticPhase: "Sub-Pixel Settle",
    effectivePixelArea: 130,
    opticalTrick: "Secondary Overlap: Kinetic energy transfers through body into trailing ears.",
  },
];

// 1. The Bouncing Mochi (Squash, Stretch & Mass Invariance)
const BOUNCING_MOCHI_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: Apex Float',
    subhead: 'Weightless anticipation at highest point',
    principle: 'Anticipation & Hang Time',
    explanation:
      'Every jump begins at the apex. Gravity pauses at the highest point, holding the silhouette in neutral, uncompressed form. Draw an 8x8 circular resting mass at the upper center of the canvas.',
    artisanRule:
      'Mass Invariance: The resting circular silhouette occupies ~28 outline pixels. All subsequent deformed frames must preserve this approximate volume.',
    recommendedHoldMs: 160,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: Kinetic Plummet',
    subhead: 'Downward velocity stretch along trajectory',
    principle: 'Kinetic Stretch',
    explanation:
      'As gravity accelerates the object downward, kinetic speed stretches the silhouette along its motion vector. Narrow the width by 2 pixels and extend the height by 3 pixels.',
    artisanRule:
      'Stretch Discipline: Keep side walls parallel to avoid jagged pixel stairs. The elongated shape communicates 60 FPS velocity even at 10 FPS.',
    recommendedHoldMs: 60,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Impact Squash',
    subhead: 'Floor contact and horizontal dispersion',
    principle: 'Impact Squash & Energy Dissipation',
    explanation:
      'Upon striking the floor line, downward kinetic energy pushes outward horizontally. Flatten the height to 4 pixels and spread the base to 12 pixels across the floor baseline.',
    artisanRule:
      'Ground Contact: Align the bottom boundary flush with the ground line (Y=14). Flatten the bottom row to establish a firm physical plane.',
    recommendedHoldMs: 90,
  },
  {
    frameIndex: 3,
    name: 'Frame 4: Upward Rebound',
    subhead: 'Elastic release returning to apex',
    principle: 'Elastic Recovery',
    explanation:
      'Like a compressed spring releasing its stored energy, the mochi snaps upward. Draw an oval shape slightly taller than resting width as it ascends toward Frame 1.',
    artisanRule:
      'Trajectory Loop: Positioning this frame at Y=7 between the impact baseline and the apex to complete a seamless parabolic easing arc.',
    recommendedHoldMs: 70,
  },
];

// 2. The Hearth Flame (Secondary Action & Fluid Loops)
const HEARTH_FLAME_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: Ember Seed',
    subhead: 'Resting teardrop flame core',
    principle: 'Organic Looping & Fluid Arcs',
    explanation:
      'Fire is an upward convection current. Begin with a centered teardrop core with warm outer ink leaning straight up.',
    artisanRule:
      'Teardrop Curve: Keep the base anchored wide on the wood hearth while tapering to a 2-pixel point at the apex.',
    recommendedHoldMs: 120,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: Leaning Crest',
    subhead: 'Flame tip curves with air draft',
    principle: 'Fluid Distortion',
    explanation:
      'As hot air rises, the upper tip billows slightly to the right while the base stays anchored on the wood hearth.',
    artisanRule:
      'Base Anchor: Keep the bottom 2 rows consistent while letting the upper tip deform with the draft.',
    recommendedHoldMs: 120,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Spark Detach',
    subhead: 'Upper ember pinches off into a rising spark',
    principle: 'Follow-Through & Particulate Motion',
    explanation:
      'The stretched tip pinches off into an independent 2x2 spark cluster above the flame body, while the main base resets.',
    artisanRule:
      'Floating Spark: A detached 2x2 pixel cluster floats 2 pixels above the main body before vanishing.',
    recommendedHoldMs: 120,
  },
];

// 3. The Character Hop (Anticipation & Secondary Follow-Through)
const BUN_HOP_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: Crouch Anticipation',
    subhead: 'Character compresses downward before leap',
    principle: 'Character Anticipation',
    explanation:
      'Before jumping, a character crouches to build upward momentum. Lower the head by 2 pixels and flatten the feet along the floor.',
    artisanRule:
      'Ear Drag: Keep ears upright or slightly swept back to show anticipation of the upcoming leap.',
    recommendedHoldMs: 140,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: Airborne Apex',
    subhead: 'Character reaches peak height in air',
    principle: 'Follow-Through on Secondary Elements',
    explanation:
      'At the height of the hop, the character body floats at Y=2. Secondary elements like ears trail behind the upward trajectory.',
    artisanRule:
      'Secondary Motion: Trailing ears lag 1 frame behind the body velocity.',
    recommendedHoldMs: 160,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Impact Recovery',
    subhead: 'Feet touch down with soft absorption',
    principle: 'Contact & Settle',
    explanation:
      'Upon touching the ground, the body squashes slightly to absorb the landing shock before returning to idle stance.',
    artisanRule:
      'Settle Timing: A 1-frame impact hold gives weight to character physics.',
    recommendedHoldMs: 100,
  },
];

// 4. The Magic Potion Bubbles (Buoyancy & Particle Burst)
const POTION_BUBBLE_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: Nucleating Bubble',
    subhead: 'Small gas seed forming at bottom',
    principle: 'Particle Nucleation',
    explanation:
      'Inside the flask, heat generates a small 2x2 bubble sphere near the bottom liquid bed.',
    artisanRule:
      'Flask Boundary: Anchor the flask beaker outline while animating the floating bubble core inside.',
    recommendedHoldMs: 120,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: Buoyant Ascend',
    subhead: 'Bubble rises and expands through liquid',
    principle: 'Buoyancy & Acceleration',
    explanation:
      'As the bubble ascends toward the liquid surface, it accelerates upward and expands to 4x4 pixels.',
    artisanRule:
      'Upward Spacing: Move the bubble up by 4 pixels between frames to show accelerating buoyancy.',
    recommendedHoldMs: 100,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Surface Meniscus',
    subhead: 'Bubble touches surface dome',
    principle: 'Surface Tension',
    explanation:
      'The bubble breaches the liquid waterline, forming a bulging dome ready to burst.',
    artisanRule:
      'Tension Dome: Flatten the bottom edge against the liquid line while arching the top dome.',
    recommendedHoldMs: 100,
  },
  {
    frameIndex: 3,
    name: 'Frame 4: Radial Droplet Burst',
    subhead: 'Bubble pops into dispersing droplets',
    principle: 'Radial Particle Dispersion',
    explanation:
      'Surface tension snaps! The bubble ruptures into four 1-pixel droplets dispersing radially outward.',
    artisanRule:
      'Radial Dispersion: Place 4 discrete single pixels radiating 2 pixels out from the burst center.',
    recommendedHoldMs: 80,
  },
];

// 5. The Slime Glide (Creature Wave Locomotion)
const SLIME_GLIDE_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: Idle Gel Stance',
    subhead: 'Resting gelatinous dome',
    principle: 'Organic Mass Balance',
    explanation:
      'A resting slime forms a gentle 10x6 pixel hemisphere with rounded corners along the floor line.',
    artisanRule:
      'Volume Baseline: Maintain roughly 40 pixels of body volume across all locomotion steps.',
    recommendedHoldMs: 140,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: Forward Surge Reach',
    subhead: 'Front edge stretches forward',
    principle: 'Anticipatory Surge',
    explanation:
      'To crawl, the slime extends its front pseudopod forward by 3 pixels while pinning its tail on the ground.',
    artisanRule:
      'Directional Asymmetry: Shift the front wall to X=14 while keeping the tail anchored at X=2.',
    recommendedHoldMs: 110,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Rear Body Catchup',
    subhead: 'Trailing mass compresses forward',
    principle: 'Follow-Through & Kinetic Drag',
    explanation:
      'The tail snaps forward to rejoin the front mass, compressing the body into a tall, compact blob.',
    artisanRule:
      'Vertical Bulge: Squeeze the width to 8 pixels and bulge the height up by 2 pixels.',
    recommendedHoldMs: 110,
  },
  {
    frameIndex: 3,
    name: 'Frame 4: Settle Elastic Reset',
    subhead: 'Gel settles back into resting base',
    principle: 'Settle & Damping',
    explanation:
      'The momentum dissipates and the gelatinous body relaxes back to its resting stance 2 pixels ahead.',
    artisanRule:
      'Loop Alignment: Smoothly connect the final resting frame back to the cycle start.',
    recommendedHoldMs: 130,
  },
];

// 6. The Twinkling Star / Gem (Lighting FX & Optical Pulse)
const TWINKLING_STAR_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: Micro Spark Core',
    subhead: 'Small dormant glimmer',
    principle: 'Optical Contrast',
    explanation:
      'Every twinkle begins as a concentrated, pinpoint 2x2 spark in dark space.',
    artisanRule:
      'Center Alignment: Keep the origin centered at (8,8) across all glare pulses.',
    recommendedHoldMs: 110,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: Cardinal Cross Beams',
    subhead: 'Light shoots along cardinal axes',
    principle: 'Anamorphic Flare',
    explanation:
      'Optical diffraction emits sharp 1-pixel rays extending north, south, east, and west.',
    artisanRule:
      'Ray Symmetry: Extend 4 cardinal spikes 4 pixels outward from the central core.',
    recommendedHoldMs: 90,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Diamond Flare Bloom',
    subhead: 'Full diagonal lens glare burst',
    principle: 'Peak Bloom',
    explanation:
      'At maximum intensity, diagonal glints ignite, turning the star into a brilliant 8-point diamond starburst.',
    artisanRule:
      'Diagonal Spikes: Add 1-pixel corners at 45-degree angles to create full bloom.',
    recommendedHoldMs: 90,
  },
  {
    frameIndex: 3,
    name: 'Frame 4: Soft Pulse Settle',
    subhead: 'Flare retracts into warm halo ring',
    principle: 'Dissipation & Decay',
    explanation:
      'The intense glare collapses, leaving a gentle 4x4 diamond ring that dissolves back to the micro spark.',
    artisanRule:
      'Hollow Ring: A hollow 1-pixel border simulates decaying optical afterglow.',
    recommendedHoldMs: 120,
  },
];

// 7. The Water Droplet Ripple (Fluid Shockwave Dynamics)
const WATER_RIPPLE_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: Droplet Impact',
    subhead: 'Vertical water needle splash',
    principle: 'Kinetic Impact Spike',
    explanation:
      'When a raindrop hits still water, momentum pushes a sharp 2x6 vertical needle splash upward.',
    artisanRule:
      'Impact Point: Draw a clean vertical 2-pixel column emerging from the center floor.',
    recommendedHoldMs: 100,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: Inner Crown Wave',
    subhead: 'Initial circular splash ring',
    principle: 'Radial Wave Propagation',
    explanation:
      'The vertical spike collapses into an expanding 6x3 perspective ring on the water surface.',
    artisanRule:
      'Perspective Ratio: Use a 2:1 isometric ratio (width is twice height) for surface ripples.',
    recommendedHoldMs: 110,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Expanding Ellipse',
    subhead: 'Wide outer ripple wavefront',
    principle: 'Energy Dissipation & Amplitude Decay',
    explanation:
      'The wave ring expands outward to 12x4 pixels as its kinetic energy disperses across the pond.',
    artisanRule:
      'Thinning Wave: Keep the wave ring strictly 1-pixel thick to show diminishing amplitude.',
    recommendedHoldMs: 120,
  },
  {
    frameIndex: 3,
    name: 'Frame 4: Dissipating Wavefront',
    subhead: 'Faint outer ring fading into calm water',
    principle: 'Wave Attenuation',
    explanation:
      'The outer ripple breaks into intermittent corner dashes and vanishes back into calm water.',
    artisanRule:
      'Broken Stride: Leaving 2-pixel gaps along the edge creates the illusion of fading water.',
    recommendedHoldMs: 140,
  },
];

// 8. The Sword Slash Arc (Action Smear & Combat Keyframing)
const SWORD_SLASH_FRAMES: LessonFrameTemplate[] = [
  {
    frameIndex: 0,
    name: 'Frame 1: High Windup Hold',
    subhead: 'Blade poised high in anticipation',
    principle: 'Combat Anticipation',
    explanation:
      'A warrior raises their sword above their head at a 45-degree angle, building potential energy for the strike.',
    artisanRule:
      'Diagonal Tension: A straight diagonal 2-pixel blade line at the upper left creates strong anticipation.',
    recommendedHoldMs: 150,
  },
  {
    frameIndex: 1,
    name: 'Frame 2: 180° Crescent Smear',
    subhead: 'Kinetic speed-blur arc cuts through space',
    principle: 'Animation Smear & Action Velocity',
    explanation:
      'In a single explosive frame, the blade sweeps 180 degrees, leaving a sweeping kinetic smear arc across the entire screen.',
    artisanRule:
      'Crescent Smear: A 2-pixel thick curved crescent communicates lightning-fast speed without multi-frame lag.',
    recommendedHoldMs: 70,
  },
  {
    frameIndex: 2,
    name: 'Frame 3: Blade Follow-Through',
    subhead: 'Blade rests forward with trailing spark',
    principle: 'Follow-Through & Kinetic Settle',
    explanation:
      'The blade finishes its stroke pointing low at the bottom right, with a single trailing impact spark settling in air.',
    artisanRule:
      'Low Resting Guard: The sword tip rests at (14,14), grounding the weight of the strike.',
    recommendedHoldMs: 130,
  },
];


// Beginner-first: the default lesson is the first entry.
const LESSONS: PlaygroundLesson[] = [
  {
    id: 'bouncing-mochi',
    title: 'The Bouncing Mochi',
    badge: 'Physics 101',
    concept: 'Squash, Stretch & Mass Invariance',
    description:
      'Master the core physics of 2D pixel animation: apex float, terminal velocity stretch, ground impact squash, and elastic rebound.',
    fps: 10,
    totalFrames: 4,
    canvasSize: 16,
    frames: BOUNCING_MOCHI_FRAMES,
  },
  {
    id: 'master-bouncing-ball',
    title: 'The Master Bouncing Ball',
    badge: 'Physics 201',
    concept: 'Discrete Volume Preservation & Apex Deceleration',
    description:
      'Master classical animation physics on a 32x32 integer grid. Build a complete 12-frame bouncing cycle with mathematical volume preservation (A ≈ 112–114 px), Richard Williams apex cushioning, terminal stretch, and ground hitstop.',
    fps: 12,
    totalFrames: 12,
    canvasSize: 32,
    frames: MASTER_BOUNCING_BALL_FRAMES,
  },
  {
    id: 'subpixel-idle',
    title: 'Sub-Pixel Character Idle',
    badge: 'Optical 201',
    concept: 'Sub-Pixel Luminosity & Anti-Boiling',
    description:
      'Learn how senior pixel animators produce organic, living character idle cycles without moving the outer silhouette. Shift internal specular glints and modulate anti-aliasing edge tones with zero pixel boiling.',
    fps: 8,
    totalFrames: 3,
    canvasSize: 32,
    frames: SUBPIXEL_IDLE_FRAMES,
  },
  {
    id: 'combat-slash-hitstop',
    title: 'Sword Slash & Combat Hitstop',
    badge: 'Combat 201',
    concept: 'Action Smears & Impact Freezes',
    description:
      'Master punchy combat animation using arcade fighting game techniques: anticipation windup hold, a single-frame 180° crescent smear arc, visceral hitstop impact pause, and recovery settle.',
    fps: 12,
    totalFrames: 4,
    canvasSize: 32,
    frames: COMBAT_SLASH_FRAMES,
  },
  {
    id: 'character-hop-shock',
    title: 'Character Hop & Shock Absorption',
    badge: 'Character 201',
    concept: 'Anticipation, Secondary Action & Hitstop',
    description:
      'Animate Bun performing a full athletic leap on a 32x32 canvas. Master downward crouch anticipation, 1-frame explosive stretch, zero-gravity apex hang with trailing ear drag, and visceral impact hitstop absorption on the ground baseline.',
    fps: 10,
    totalFrames: 5,
    canvasSize: 32,
    frames: CHARACTER_HOP_SHOCK_FRAMES,
  },
  {
    id: 'hearth-flame',
    title: 'The Hearth Flame',
    badge: 'Fluid FX',
    concept: 'Organic Morphing & Secondary Action',
    description:
      'Learn how to animate living, breathing organic elements with upward convection, wave billows, and detaching ember sparks.',
    fps: 8,
    totalFrames: 3,
    canvasSize: 16,
    frames: HEARTH_FLAME_FRAMES,
  },
  {
    id: 'bun-hop',
    title: 'The Character Hop',
    badge: 'Character 101',
    concept: 'Anticipation & Secondary Follow-Through',
    description:
      'Animate Bun hopping across the desk. Learn how anticipation crouches and trailing ear secondary physics bring characters to life.',
    fps: 9,
    totalFrames: 3,
    canvasSize: 16,
    frames: BUN_HOP_FRAMES,
  },
  {
    id: 'potion-bubble',
    title: 'Magic Potion Bubbles',
    badge: 'Alchemy FX',
    concept: 'Buoyancy & Particle Dispersion',
    description:
      'Animate bubbling magical potions with accelerating buoyant spheres, surface tension domes, and radial pop droplets.',
    fps: 9,
    totalFrames: 4,
    canvasSize: 16,
    frames: POTION_BUBBLE_FRAMES,
  },
  {
    id: 'slime-glide',
    title: 'The Slime Glide',
    badge: 'Creature 101',
    concept: 'Wave Locomotion & Kinetic Friction',
    description:
      'Learn how gelatinous creatures crawl forward using pseudopod expansion, rear dragging mass, and elastic settle cycles.',
    fps: 8,
    totalFrames: 4,
    canvasSize: 16,
    frames: SLIME_GLIDE_FRAMES,
  },
  {
    id: 'twinkling-star',
    title: 'The Twinkling Star',
    badge: 'Lighting FX',
    concept: 'Optical Flare Bloom & Optical Decay',
    description:
      'Master sparkling light effects with diamond starburst blooms, cross anamorphic rays, and smooth pulse loops.',
    fps: 10,
    totalFrames: 4,
    canvasSize: 16,
    frames: TWINKLING_STAR_FRAMES,
  },
  {
    id: 'water-ripple',
    title: 'The Water Ripple',
    badge: 'Water FX',
    concept: 'Shockwave Propagation & Perspective Decay',
    description:
      'Craft soothing water droplet ripples with vertical impact needles, 2:1 isometric expanding wavefronts, and fading rings.',
    fps: 8,
    totalFrames: 4,
    canvasSize: 16,
    frames: WATER_RIPPLE_FRAMES,
  },
  {
    id: 'sword-slash',
    title: 'The Sword Slash',
    badge: 'Combat 101',
    concept: 'Action Smear & Kinetic Anticipation',
    description:
      'Design punchy combat keyframes using anticipation windups, full-screen 180° smear arcs, and decisive follow-through poses.',
    fps: 12,
    totalFrames: 3,
    canvasSize: 16,
    frames: SWORD_SLASH_FRAMES,
  },
];

const ART = buildLessonArt();

/** Attach each lesson's painted poses; a frame's pixel area is counted from its art (ground shadows excluded). */
export const PLAYGROUND_LESSONS: PlaygroundLesson[] = LESSONS.map(lesson => ({
  ...lesson,
  frames: lesson.frames.map((frame, i) => {
    const gridRows = ART[lesson.id]?.[i];
    if (!gridRows) throw new Error(`Lesson ${lesson.id} has no art for frame ${i + 1}`);
    const area = gridRows.reduce((sum, row) => sum + [...row].filter(c => c !== '.' && c !== 'p').length, 0);
    return {
      ...frame,
      gridRows,
      canvasSize: lesson.canvasSize,
      ...(frame.effectivePixelArea !== undefined ? { effectivePixelArea: area } : {}),
    };
  }),
}));
