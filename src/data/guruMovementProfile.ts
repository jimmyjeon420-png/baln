/**
 * guruMovementProfile.ts
 *
 * Animal-specific movement traits for each of the 10 guru characters.
 * Values reflect the animal's real movement patterns combined with
 * the guru's investing personality.
 */

export interface GuruMovementProfile {
  guruId: string;
  animal: string;

  // ── Wander behavior ──
  /** How fast they walk (0.3 = turtle slow, 1.8 = cheetah burst) */
  wanderSpeed: number;
  /** Pixels per step (2 = tiny turtle steps, 12 = cheetah leap) */
  stepSize: number;
  /** How many steps in a burst (2 = turtle, 6 = wolf) */
  stepsPerBurst: number;
  /** Pause duration range in ms [min, max] */
  pauseRange: [number, number];
  /** Chance to stay still during a "move" phase (0–1) */
  idleChance: number;
  /** Movement style */
  gait: 'waddle' | 'trot' | 'prowl' | 'hop' | 'glide' | 'lumber' | 'creep' | 'dart' | 'stride';

  // ── Body animation modifiers ──
  /** Rotation amplitude in degrees */
  rotationAmplitude: number;
  /** Bounce height in pixels */
  bounceHeight: number;
  /** Base animation speed multiplier */
  animSpeedMultiplier: number;
  /** Sway amplitude (side-to-side rocking) */
  swayAmplitude: number;

  // ── Unique signature moves (performed periodically) ──
  /** Name of a unique periodic animation this character performs */
  signatureMove: string;
  /** How often the signature move triggers (ms) [min, max] */
  signatureMoveInterval: [number, number];
  /** Duration of the signature move (ms) */
  signatureMoveDuration: number;

  // ── Activity preferences ──
  /** Activities this guru does more often (weighted higher) */
  preferredActivities: string[];
  /** Activities this guru never does */
  avoidedActivities: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual profiles
// ─────────────────────────────────────────────────────────────────────────────

const buffett: GuruMovementProfile = {
  guruId: 'buffett',
  animal: 'owl',
  // Owls sit motionless for long stretches; when they do move, it is slow and deliberate
  wanderSpeed: 0.5,
  stepSize: 4,
  stepsPerBurst: 2,
  pauseRange: [4000, 8000],
  idleChance: 0.6,
  gait: 'waddle',
  rotationAmplitude: 3,
  bounceHeight: 1,
  animSpeedMultiplier: 0.5,
  swayAmplitude: 1,
  // Sharp 45° head rotation then snap back — classic owl surveillance
  signatureMove: 'headTurn',
  signatureMoveInterval: [8000, 15000],
  signatureMoveDuration: 400,
  preferredActivities: ['reading', 'tea_ceremony', 'chess'],
  avoidedActivities: ['surfing', 'dancing', 'exercising'],
};

const dalio: GuruMovementProfile = {
  guruId: 'dalio',
  animal: 'deer',
  // Graceful gliding walk; freezes and listens at any hint of change
  wanderSpeed: 1.0,
  stepSize: 7,
  stepsPerBurst: 4,
  pauseRange: [1500, 4000],
  idleChance: 0.3,
  gait: 'glide',
  rotationAmplitude: 5,
  bounceHeight: 4,
  animSpeedMultiplier: 1.0,
  swayAmplitude: 2,
  // Quick side-to-side ear twitch — alert macro sensor
  signatureMove: 'earTwitch',
  signatureMoveInterval: [5000, 10000],
  signatureMoveDuration: 250,
  preferredActivities: ['meditating', 'yoga', 'walking'],
  avoidedActivities: ['debugging', 'surfing'],
};

const cathie_wood: GuruMovementProfile = {
  guruId: 'cathie_wood',
  animal: 'fox',
  // High-energy bouncy trot; curious, always darting toward new things
  wanderSpeed: 1.3,
  stepSize: 8,
  stepsPerBurst: 5,
  pauseRange: [800, 2000],
  idleChance: 0.15,
  gait: 'trot',
  rotationAmplitude: 10,
  bounceHeight: 7,
  animSpeedMultiplier: 1.4,
  swayAmplitude: 4,
  // Quick left-right rotation burst — tail swishing with excitement
  signatureMove: 'tailSwish',
  signatureMoveInterval: [4000, 8000],
  signatureMoveDuration: 350,
  preferredActivities: ['dancing', 'photography', 'exercising'],
  avoidedActivities: ['napping', 'fishing'],
};

const druckenmiller: GuruMovementProfile = {
  guruId: 'druckenmiller',
  animal: 'cheetah',
  // Long patient stillness punctuated by explosive speed — apex predator cadence
  wanderSpeed: 1.8,
  stepSize: 12,
  stepsPerBurst: 3,
  pauseRange: [3000, 7000],
  idleChance: 0.5,
  gait: 'prowl',
  rotationAmplitude: 4,
  bounceHeight: 3,
  animSpeedMultiplier: 1.8,
  swayAmplitude: 1.5,
  // Sharp micro-rotation — predator tail flick signalling focus
  signatureMove: 'tailFlick',
  signatureMoveInterval: [3000, 6000],
  signatureMoveDuration: 150,
  preferredActivities: ['chess', 'birdwatching', 'writing'],
  avoidedActivities: ['yoga', 'singing'],
};

const saylor: GuruMovementProfile = {
  guruId: 'saylor',
  animal: 'wolf',
  // Confident territorial loop; pack-leader — purposeful and rhythmic
  wanderSpeed: 1.1,
  stepSize: 9,
  stepsPerBurst: 5,
  pauseRange: [1500, 4000],
  idleChance: 0.2,
  gait: 'stride',
  rotationAmplitude: 6,
  bounceHeight: 4,
  animSpeedMultiplier: 1.1,
  swayAmplitude: 3,
  // Head tilts upward + scale pulse — wolf declaring position
  signatureMove: 'howl',
  signatureMoveInterval: [12000, 20000],
  signatureMoveDuration: 800,
  preferredActivities: ['walking', 'exercising', 'singing'],
  avoidedActivities: ['meditating', 'tea_ceremony'],
};

const dimon: GuruMovementProfile = {
  guruId: 'dimon',
  animal: 'lion',
  // Slow regal walk with frequent lounging — king energy, moves when it matters
  wanderSpeed: 0.7,
  stepSize: 6,
  stepsPerBurst: 3,
  pauseRange: [3000, 6000],
  idleChance: 0.45,
  gait: 'stride',
  rotationAmplitude: 4,
  bounceHeight: 2,
  animSpeedMultiplier: 0.7,
  swayAmplitude: 2,
  // Quick scale pulse + rotation burst — mane shake asserting dominance
  signatureMove: 'maneShake',
  signatureMoveInterval: [10000, 18000],
  signatureMoveDuration: 500,
  preferredActivities: ['chess', 'tea_ceremony', 'writing'],
  avoidedActivities: ['surfing', 'dancing', 'yoga'],
};

const musk: GuruMovementProfile = {
  guruId: 'musk',
  animal: 'chameleon',
  // Jerky stop-start creep; independent eye movement; completely unpredictable
  wanderSpeed: 0.9,
  stepSize: 5,
  stepsPerBurst: 2,
  pauseRange: [500, 3000],
  idleChance: 0.25,
  gait: 'creep',
  rotationAmplitude: 15,
  bounceHeight: 2,
  animSpeedMultiplier: 1.3,
  swayAmplitude: 6,
  // Wobble + scale pump — colour-shift moment of transformation
  signatureMove: 'colorShift',
  signatureMoveInterval: [6000, 12000],
  signatureMoveDuration: 600,
  preferredActivities: ['debugging', 'photography', 'dancing'],
  avoidedActivities: ['fishing', 'tea_ceremony'],
};

const lynch: GuruMovementProfile = {
  guruId: 'lynch',
  animal: 'bear',
  // Heavy lumbering gait with frequent pauses to look around — thorough researcher
  wanderSpeed: 0.6,
  stepSize: 5,
  stepsPerBurst: 3,
  pauseRange: [2500, 5000],
  idleChance: 0.35,
  gait: 'lumber',
  rotationAmplitude: 7,
  bounceHeight: 3,
  animSpeedMultiplier: 0.6,
  swayAmplitude: 5,
  // TranslateY up then down + scale — bear standing on hind legs to survey
  signatureMove: 'standUp',
  signatureMoveInterval: [15000, 25000],
  signatureMoveDuration: 1000,
  preferredActivities: ['gardening', 'cooking', 'reading'],
  avoidedActivities: ['surfing', 'debugging'],
};

const marks: GuruMovementProfile = {
  guruId: 'marks',
  animal: 'turtle',
  // Absolute minimum movement; every step is deliberate and cautious
  wanderSpeed: 0.3,
  stepSize: 2,
  stepsPerBurst: 2,
  pauseRange: [5000, 10000],
  idleChance: 0.6,
  gait: 'creep',
  rotationAmplitude: 2,
  bounceHeight: 0.5,
  animSpeedMultiplier: 0.35,
  swayAmplitude: 0.5,
  // Scale shrinks (retreating into shell) then very slowly returns
  signatureMove: 'shellRetreat',
  signatureMoveInterval: [20000, 35000],
  signatureMoveDuration: 1200,
  preferredActivities: ['writing', 'reading', 'chess'],
  avoidedActivities: ['dancing', 'exercising', 'surfing'],
};

const rogers: GuruMovementProfile = {
  guruId: 'rogers',
  animal: 'tiger',
  // Powerful confident prowl; alert and exploratory — global adventurer
  wanderSpeed: 1.2,
  stepSize: 10,
  stepsPerBurst: 4,
  pauseRange: [2000, 4500],
  idleChance: 0.2,
  gait: 'prowl',
  rotationAmplitude: 8,
  bounceHeight: 5,
  animSpeedMultiplier: 1.2,
  swayAmplitude: 3.5,
  // Big scale expand + translateY dip — tiger full-body stretch
  signatureMove: 'stretch',
  signatureMoveInterval: [10000, 18000],
  signatureMoveDuration: 700,
  preferredActivities: ['walking', 'birdwatching', 'photography'],
  avoidedActivities: ['debugging', 'napping'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Master lookup table
// ─────────────────────────────────────────────────────────────────────────────

export const GURU_MOVEMENT_PROFILES: Record<string, GuruMovementProfile> = {
  buffett,
  dalio,
  cathie_wood,
  druckenmiller,
  saylor,
  dimon,
  musk,
  lynch,
  marks,
  rogers,
};

// ─────────────────────────────────────────────────────────────────────────────
// Default fallback — middle-ground values for any unknown guru
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: GuruMovementProfile = {
  guruId: 'default',
  animal: 'unknown',
  wanderSpeed: 0.8,
  stepSize: 6,
  stepsPerBurst: 3,
  pauseRange: [2000, 5000],
  idleChance: 0.3,
  gait: 'trot',
  rotationAmplitude: 5,
  bounceHeight: 3,
  animSpeedMultiplier: 0.9,
  swayAmplitude: 2.5,
  signatureMove: 'idle',
  signatureMoveInterval: [10000, 20000],
  signatureMoveDuration: 400,
  preferredActivities: ['walking', 'reading'],
  avoidedActivities: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the movement profile for the given guruId.
 * Falls back to DEFAULT_PROFILE when the id is not recognised.
 */
export function getGuruProfile(guruId: string): GuruMovementProfile {
  return GURU_MOVEMENT_PROFILES[guruId] ?? DEFAULT_PROFILE;
}
