// Dedicated master lesson templates and animation theory for the PixiBun Playground.
// Adheres strictly to the 12 Principles of Animation adapted to low-resolution pixel grids.

export interface LessonFrameTemplate {
  frameIndex: number;
  name: string;
  subhead: string;
  principle: string;
  explanation: string;
  artisanRule: string;
  grid16: string[];
  recommendedHoldMs: number;
}

export interface PlaygroundLesson {
  id: string;
  title: string;
  badge: string;
  concept: string;
  description: string;
  fps: number;
  totalFrames: number;
  frames: LessonFrameTemplate[];
}

const EMPTY_ROW_16 = '................';

function rows(arr: Array<[number, string]>): string[] {
  const r = Array(16).fill(EMPTY_ROW_16);
  for (const [idx, str] of arr) {
    r[idx] = str;
  }
  return r;
}

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
    grid16: rows([
      [2,  '......oooo......'],
      [3,  '....oo....oo....'],
      [4,  '...o........o...'],
      [5,  '..o..........o..'],
      [6,  '..o..........o..'],
      [7,  '..o..........o..'],
      [8,  '..o..........o..'],
      [9,  '..o..........o..'],
      [10, '...o........o...'],
      [11, '....oooooooo....'],
    ]),
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
    grid16: rows([
      [4,  '.......oo.......'],
      [5,  '.....oo..oo.....'],
      [6,  '....o......o....'],
      [7,  '....o......o....'],
      [8,  '....o......o....'],
      [9,  '....o......o....'],
      [10, '....o......o....'],
      [11, '....o......o....'],
      [12, '....o......o....'],
      [13, '.....o....o.....'],
      [14, '......oooo......'],
    ]),
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
    grid16: rows([
      [11, '....oooooooo....'],
      [12, '..oo........oo..'],
      [13, '.o............o.'],
      [14, 'o..............o'],
      [15, 'oooooooooooooooo'],
    ]),
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
    grid16: rows([
      [5,  '......oooo......'],
      [6,  '....oo....oo....'],
      [7,  '...o........o...'],
      [8,  '..o..........o..'],
      [9,  '..o..........o..'],
      [10, '..o..........o..'],
      [11, '..o..........o..'],
      [12, '...o........o...'],
      [13, '....oooooooo....'],
    ]),
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
    grid16: rows([
      [5,  '.......oo.......'],
      [6,  '......o..o......'],
      [7,  '.....o....o.....'],
      [8,  '....o......o....'],
      [9,  '...o........o...'],
      [10, '...o........o...'],
      [11, '...o........o...'],
      [12, '....o......o....'],
      [13, '.....oooooo.....'],
    ]),
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
    grid16: rows([
      [4,  '........oo......'],
      [5,  '.......o..o.....'],
      [6,  '......o....o....'],
      [7,  '.....o......o...'],
      [8,  '....o........o..'],
      [9,  '...o..........o.'],
      [10, '...o.........o..'],
      [11, '....o.......o...'],
      [12, '.....ooooooo....'],
    ]),
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
    grid16: rows([
      [2,  '........oo......'],
      [3,  '........oo......'],
      [6,  '......oo........'],
      [7,  '.....o..oo......'],
      [8,  '....o.....oo....'],
      [9,  '...o........o...'],
      [10, '...o........o...'],
      [11, '...o........o...'],
      [12, '....o......o....'],
      [13, '.....oooooo.....'],
    ]),
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
    grid16: rows([
      [5,  '...oo.....oo....'],
      [6,  '..o..o...o..o...'],
      [7,  '..o..o...o..o...'],
      [8,  '..o..ooooo..o...'],
      [9,  '.o..........o...'],
      [10, '.o..........o...'],
      [11, '.o..........o...'],
      [12, '.o..........o...'],
      [13, '..oooooooooo....'],
    ]),
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
    grid16: rows([
      [0,  '...oo.....oo....'],
      [1,  '..o..o...o..o...'],
      [2,  '..o..o...o..o...'],
      [3,  '..o..ooooo..o...'],
      [4,  '.o..........o...'],
      [5,  '.o..........o...'],
      [6,  '.o..........o...'],
      [7,  '.o..........o...'],
      [8,  '..oooooooooo....'],
    ]),
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
    grid16: rows([
      [6,  '...oo.....oo....'],
      [7,  '..o..o...o..o...'],
      [8,  '..o..ooooo..o...'],
      [9,  '.o..........o...'],
      [10, '.o..........o...'],
      [11, '.o..........o...'],
      [12, '.o..........o...'],
      [13, '..oooooooooo....'],
    ]),
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
    grid16: rows([
      [1,  '.....oooooo.....'],
      [2,  '.....o....o.....'],
      [3,  '....o......o....'],
      [4,  '...o........o...'],
      [5,  '..o..........o..'],
      [6,  '..o..........o..'],
      [7,  '..o..........o..'],
      [8,  '..o..........o..'],
      [9,  '..o..........o..'],
      [10, '..o....oo....o..'],
      [11, '..o....oo....o..'],
      [12, '..o..........o..'],
      [13, '...oooooooooo...'],
    ]),
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
    grid16: rows([
      [1,  '.....oooooo.....'],
      [2,  '.....o....o.....'],
      [3,  '....o......o....'],
      [4,  '...o........o...'],
      [5,  '..o...oooo...o..'],
      [6,  '..o..o....o..o..'],
      [7,  '..o..o....o..o..'],
      [8,  '..o...oooo...o..'],
      [9,  '..o..........o..'],
      [10, '..o..........o..'],
      [11, '..o..........o..'],
      [12, '..o..........o..'],
      [13, '...oooooooooo...'],
    ]),
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
    grid16: rows([
      [1,  '.....oooooo.....'],
      [2,  '.....o....o.....'],
      [3,  '....o.oooo.o....'],
      [4,  '...o.o....o.o...'],
      [5,  '..o..oooooo..o..'],
      [6,  '..o..........o..'],
      [7,  '..o..........o..'],
      [8,  '..o..........o..'],
      [9,  '..o..........o..'],
      [10, '..o..........o..'],
      [11, '..o..........o..'],
      [12, '..o..........o..'],
      [13, '...oooooooooo...'],
    ]),
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
    grid16: rows([
      [1,  '.....oooooo.....'],
      [2,  '.....o.o..o.....'],
      [3,  '....o.o..o.o....'],
      [4,  '...o...o....o...'],
      [5,  '..o..........o..'],
      [6,  '..o..........o..'],
      [7,  '..o..........o..'],
      [8,  '..o..........o..'],
      [9,  '..o..........o..'],
      [10, '..o..........o..'],
      [11, '..o..........o..'],
      [12, '..o..........o..'],
      [13, '...oooooooooo...'],
    ]),
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
    grid16: rows([
      [7,  '......oooo......'],
      [8,  '....oo....oo....'],
      [9,  '...o........o...'],
      [10, '..o..........o..'],
      [11, '..o..........o..'],
      [12, '..o..........o..'],
      [13, '..oooooooooooo..'],
    ]),
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
    grid16: rows([
      [8,  '......oooooo....'],
      [9,  '....oo......oo..'],
      [10, '...o..........o.'],
      [11, '..o............o'],
      [12, '..o............o'],
      [13, '..oooooooooooooo'],
    ]),
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
    grid16: rows([
      [6,  '........oooo....'],
      [7,  '......oo....oo..'],
      [8,  '.....o........o.'],
      [9,  '....o..........o'],
      [10, '....o..........o'],
      [11, '....o..........o'],
      [12, '....o..........o'],
      [13, '.....oooooooooo.'],
    ]),
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
    grid16: rows([
      [7,  '.......oooo.....'],
      [8,  '.....oo....oo...'],
      [9,  '....o........o..'],
      [10, '...o..........o.'],
      [11, '...o..........o.'],
      [12, '...o..........o.'],
      [13, '...oooooooooooo.'],
    ]),
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
    grid16: rows([
      [7,  '.......oo.......'],
      [8,  '.......oo.......'],
    ]),
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
    grid16: rows([
      [4,  '.......oo.......'],
      [5,  '.......oo.......'],
      [6,  '......oooo......'],
      [7,  '..oooooooooooo..'],
      [8,  '..oooooooooooo..'],
      [9,  '......oooo......'],
      [10, '.......oo.......'],
      [11, '.......oo.......'],
    ]),
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
    grid16: rows([
      [3,  '.......oo.......'],
      [4,  '..o....oo....o..'],
      [5,  '...o...oo...o...'],
      [6,  '....oooooooo....'],
      [7,  '.oooooooooooooo.'],
      [8,  '.oooooooooooooo.'],
      [9,  '....oooooooo....'],
      [10, '...o...oo...o...'],
      [11, '..o....oo....o..'],
      [12, '.......oo.......'],
    ]),
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
    grid16: rows([
      [5,  '.......oo.......'],
      [6,  '.....oo..oo.....'],
      [7,  '....o......o....'],
      [8,  '....o......o....'],
      [9,  '.....oo..oo.....'],
      [10, '.......oo.......'],
    ]),
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
    grid16: rows([
      [5,  '.......oo.......'],
      [6,  '.......oo.......'],
      [7,  '.......oo.......'],
      [8,  '.......oo.......'],
      [9,  '......oooo......'],
      [10, '.....oooooo.....'],
    ]),
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
    grid16: rows([
      [8,  '......oooo......'],
      [9,  '....oo....oo....'],
      [10, '...o........o...'],
      [11, '....oo....oo....'],
      [12, '......oooo......'],
    ]),
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
    grid16: rows([
      [7,  '....oooooooo....'],
      [8,  '..oo........oo..'],
      [9,  '.o............o.'],
      [10, '.o............o.'],
      [11, '..oo........oo..'],
      [12, '....oooooooo....'],
    ]),
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
    grid16: rows([
      [6,  '..oo........oo..'],
      [7,  '.o............o.'],
      [11, '.o............o.'],
      [12, '..oo........oo..'],
    ]),
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
    grid16: rows([
      [1,  '..oo............'],
      [2,  '...oo...........'],
      [3,  '....oo..........'],
      [4,  '.....oo.........'],
      [5,  '......oo........'],
      [6,  '.......oo.......'],
      [7,  '........oooo....'],
      [8,  '..........oo....'],
      [9,  '...........oo...'],
    ]),
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
    grid16: rows([
      [2,  '....oooooooo....'],
      [3,  '..oo........oo..'],
      [4,  '.o............o.'],
      [5,  'o..............o'],
      [6,  'o..............o'],
      [7,  'o..............o'],
      [8,  'o..............o'],
      [9,  '.o............o.'],
      [10, '..oo........oo..'],
      [11, '....oooooooo....'],
    ]),
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
    grid16: rows([
      [7,  '....oo..........'],
      [8,  '.....oo.........'],
      [9,  '......oo........'],
      [10, '.......oo.......'],
      [11, '........oo......'],
      [12, '.........oo.....'],
      [13, '..........oo....'],
      [14, '...........oo...'],
    ]),
  },
];

export const PLAYGROUND_LESSONS: PlaygroundLesson[] = [
  {
    id: 'bouncing-mochi',
    title: 'The Bouncing Mochi',
    badge: 'Physics 101',
    concept: 'Squash, Stretch & Mass Invariance',
    description:
      'Master the core physics of 2D pixel animation: apex float, terminal velocity stretch, ground impact squash, and elastic rebound.',
    fps: 10,
    totalFrames: 4,
    frames: BOUNCING_MOCHI_FRAMES,
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
    frames: SWORD_SLASH_FRAMES,
  },
];
