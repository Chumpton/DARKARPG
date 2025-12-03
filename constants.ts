

export const TILE_WIDTH = 48;
export const TILE_HEIGHT = 24;
export const MAP_SIZE = 20; // Used for spawning radius bounds

export const PLAYER_START_HP = 100;
export const PLAYER_START_MANA = 100;
export const PLAYER_START_SHIELD = 50;
export const SHIELD_REGEN_RATE = 0.5; // Per frame
export const SHIELD_COOLDOWN = 180; // 3 seconds (60fps)

export const MANA_REGEN = 0.2; // Per frame

export const PLAYER_BASE_SPEED = 1.8; 
export const MOUNT_SPEED_MULT = 2.0; 

export const ENEMY_BASE_SPEED = 1.3;
export const ENEMY_SPAWN_RATE = 260; // Was 330, increased by ~25%
export const MAX_ENEMIES = 25; // Reverted to higher cap
export const ENEMY_RADIUS = 0.8; // 2x size collision
export const ENEMY_PHASE_DURATION = 120; // Frames to phase through walls

export const ENEMY_CASTER_CONFIG = {
  hp: 40,
  speed: 1.2,
  damage: 10,
  range: 8,
  cooldown: 120, // 2 seconds
};

export const LOOT_DROP_CHANCE = 0.20; // Increased slightly to account for equipment
export const LOOT_LIFE = 600; // 10 seconds (60fps)
export const COIN_VALUE_RANGE = { min: 1, max: 5 };

export const LEVEL_5_UNLOCK = 5; 
export const LEVEL_7_UNLOCK = 7; 

// Talent Config
export const TALENT_CONFIG = {
  PYROCLASM: {
    radiusPerRank: 0.5,
    baseRadius: 1.5,
  },
  MULTISHOT: {
    countPerRank: 1,
  },
  FORCE: {
    knockbackPerRank: 0.8,
    baseKnockback: 0.5,
  },
  VELOCITY: {
    speedPerRank: 0.1, // 10% per rank
  }
};

export const BASE_STAT_CONFIG = {
  VITALITY: { hpPerPoint: 10 },
  POWER: { dmgPerPoint: 0.5 }, // Reduced from 2 to match lower damage numbers
  HASTE: { cdrPerPoint: 0.02 }, // 2% per point
  SWIFTNESS: { speedPerPoint: 0.02 } // 2% per point
};

export const QUEST_CONFIG = {
    baseKillTarget: 10,
    baseCollectTarget: 15,
    baseRewardXp: 50,
    baseRewardCoins: 25,
};

export const COLORS = {
  background: '#1a1a1a',
  grid: '#2d2d2d',
  gridHighlight: '#3d3d3d',
  uiBg: 'rgba(0, 0, 0, 0.7)',
  text: '#ffffff',
  fire: '#ef4444',
  ice: '#3b82f6',
  xp: '#fbbf24',
  hp: '#ef4444',
  tree: '#2d6a4f',
  bomb: '#1c1917',
};

// Road colors for procedural generation
export const ROAD_COLORS = [
  '#5d5c61', // Grey Stone
  '#8c7b75', // Brownish Cobble
  '#556b2f', // Mossy Path
  '#8b4513', // Dirt Road
];

export const FOLIAGE_VARIANTS = ['🌿', '🌾', '🍄', '🌱'];

export const RARITY_COLORS = {
  COMMON: '#a3a3a3',
  RARE: '#3b82f6',
  EPIC: '#a855f7',
  LEGENDARY: '#eab308'
};

export const POTION_START_CHARGES = 2;
export const POTION_MAX_CHARGES = 5;
export const KILLS_PER_CHARGE = 3;

export const POTION_CONFIG = {
  HEALTH: {
    restore: 50,
    color: '#ef4444',
    emoji: '🍷'
  },
  MANA: {
    restore: 50,
    color: '#3b82f6',
    emoji: '🧪'
  },
  SPEED: {
    duration: 300, // 5 seconds
    multiplier: 1.5,
    color: '#22c55e',
    emoji: '⚡'
  }
};

export const IMPACT_PUFF_CONFIG: Record<string, { emoji: string, color: string }> = {
  FIRE: { emoji: '✨', color: '#ef4444' },
  ICE: { emoji: '❄️', color: '#3b82f6' },
  LIGHTNING: { emoji: '⚡', color: '#fcd34d' },
  WIND: { emoji: '💨', color: '#a7f3d0' },
  EARTH: { emoji: '🪨', color: '#8b4513' },
  ARCANE_EXPLOSION: { emoji: '✨', color: '#9333ea' },
  BOMB: { emoji: '💥', color: '#000000' }
};

export const SPELL_CONFIG: any = {
  FIRE: {
    baseDamage: 5.5, // Reduced from 25 to hit ~4-7 range
    damageVariance: 0.3, // 30% variance
    baseSpeed: 4, 
    speedPerLevel: 0.1, 
    cooldown: 35, 
    color: '#ef4444',
    emoji: '🔥',
    cost: 0,
    shrapnelCount: 5,
    shrapnelDamage: 2,
  },
  ICE: {
    baseDamage: 2.5, // Reduced from 10
    damageVariance: 0.2,
    baseSpeed: 5,
    speedPerLevel: 0.1, 
    cooldown: 25,
    color: '#3b82f6',
    emoji: '❄️',
    cost: 0,
    slowDuration: 120, 
  },
  LIGHTNING: {
    baseDamage: 3.5, // Reduced from 15
    damageVariance: 0.4, // High variance
    baseSpeed: 10, 
    speedPerLevel: 0,
    cooldown: 45,
    color: '#fcd34d',
    emoji: '⚡',
    cost: 0,
    chainRange: 5,
    chainCount: 3,
  },
  WIND: {
    baseDamage: 1.5, // Reduced from 5
    damageVariance: 0.1,
    baseSpeed: 7,
    speedPerLevel: 0.1,
    cooldown: 30,
    color: '#a7f3d0',
    emoji: '💨',
    cost: 0,
    knockbackBase: 1.5,
    knockbackPerLevel: 0.2,
  },
  EARTH: {
    baseDamage: 7.0, // Reduced from 30
    damageVariance: 0.2,
    baseSpeed: 3, // Slow
    speedPerLevel: 0.05,
    cooldown: 50,
    color: '#8b4513',
    emoji: '🪨',
    cost: 0,
    knockbackBase: 3.0, // Innate heavy knockback
  },
  ARCANE_EXPLOSION: {
    baseDamage: 9.0, // Reduced from 40
    damageVariance: 0.1,
    baseSpeed: 0,
    speedPerLevel: 0.2,
    cooldown: 120,
    color: '#9333ea',
    emoji: '💥',
    cost: 0,
    radius: 3.0,
    radiusPerLevel: 0.5,
  },
  TELEPORT: {
    baseDamage: 0,
    baseSpeed: 0,
    speedPerLevel: 0,
    cooldown: 240, 
    color: '#a855f7',
    emoji: '✨',
    cost: 0,
  },
  BOMB: {
    baseDamage: 35, // Reduced from 150
    damageVariance: 0.2,
    baseSpeed: 3,
    speedPerLevel: 0,
    cooldown: 60,
    color: '#000000',
    emoji: '💣',
    cost: 0,
    radius: 3.5, 
  }
};

export const SPELL_UNLOCK_ORDER = [
  'ICE',
  'LIGHTNING',
  'WIND',
  'ARCANE_EXPLOSION',
  'TELEPORT',
  'BOMB',
  'EARTH'
];
