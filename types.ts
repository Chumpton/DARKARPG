
export type Vector2 = {
  x: number;
  y: number;
};

export enum SpellType {
  FIRE = 'FIRE',
  ICE = 'ICE',
  LIGHTNING = 'LIGHTNING',
  WIND = 'WIND',
  EARTH = 'EARTH',
  ARCANE_EXPLOSION = 'ARCANE_EXPLOSION',
  TELEPORT = 'TELEPORT',
  BOMB = 'BOMB',
}

export interface Entity {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  radius: number;
  isDead: boolean;
}

export interface PlayerTalents {
  pyroclasm: number; // FIRE: Explosion Radius
  multishot: number; // AIR: Projectile Count
  force: number;     // EARTH: Knockback
  velocity: number;  // WATER/GENERAL: Projectile Speed
}

export interface PlayerBaseStats {
  vitality: number;  // Increases Max HP
  power: number;     // Increases Spell Damage
  haste: number;     // Reduces Cooldowns
  swiftness: number; // Increases Movement Speed
}

export type EquipmentSlot = 'HEAD' | 'BODY' | 'WEAPON' | 'ACCESSORY';
export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  stats: {
    damage?: number; // Additive
    speed?: number; // Multiplier add
    shield?: number; // Additive Max Shield
    projectileCount?: number; // Additive
  };
  icon: string;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;
  mana: number;
  maxMana: number;
  xp: number;
  level: number;
  toNextLevel: number;
  currentSpell: SpellType;
  knownSpells: SpellType[];
  speed: number;
  statPoints: number;
  talents: PlayerTalents;
  baseStats: PlayerBaseStats;
  bombAmmo: number;
  isMounted: boolean;
  coins: number;
  potions: {
    health: number;
    mana: number;
    speed: number;
  };
  potionKillCounter: number; // Tracks kills for recharge
  activeBuffs: {
    speedBoost: number; // Frames remaining
  };
  // Loot System
  equipment: {
    HEAD: EquipmentItem | null;
    BODY: EquipmentItem | null;
    WEAPON: EquipmentItem | null;
    ACCESSORY: EquipmentItem | null;
  };
  inventory: EquipmentItem[];
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  isFrozen: boolean;
  freezeTimer: number;
  type: 'melee' | 'caster';
  attackCooldown: number;
  // Unstuck / Phasing Logic
  lastStuckPos?: Vector2;
  stuckCheckTimer?: number;
  stuckCounter?: number;
  isPhasing: boolean;
  phaseTimer: number;
  forceMoveDir?: Vector2; // Legacy wiggle
}

export interface Projectile extends Entity {
  spellType: SpellType;
  damage: number;
  duration: number; // Frames to live
  hitList: string[]; // For piercing: track enemies already hit
  isShrapnel?: boolean; // For fire: prevent recursive explosions
  targetPos?: Vector2; // For bomb tossing
  isEnemy: boolean;
  // Elemental Properties
  explosionRadius?: number;
  knockback?: number;
}

export interface Loot extends Entity {
  type: 'bomb' | 'equipment' | 'coin'; // Removed potions from drops
  life: number;
  data?: EquipmentItem; // Only if type is equipment
  value?: number; // For coins
}

export interface FloatingText {
  id: string;
  pos: Vector2; // Screen coords
  text: string;
  color: string;
  life: number;
  velocity: Vector2;
}

export interface VisualEffect {
  id: string;
  type: 'sparkle' | 'lightning_chain' | 'nova' | 'impact_puff';
  pos: Vector2;
  life: number;
  data?: any; // For lightning: targetPos, For nova: radius, For puff: emoji/color
}

export type QuestType = 'kill' | 'collect';

export interface Quest {
  id: string;
  type: QuestType;
  description: string;
  target: number;
  current: number;
  rewardXp: number;
  rewardCoins: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  loot: Loot[];
  texts: FloatingText[];
  visualEffects: VisualEffect[];
  score: number;
  gameOver: boolean;
  activeQuest: Quest;
  questsCompleted: number;
}

export interface Renderable {
  type: 'player' | 'enemy' | 'projectile' | 'tree' | 'loot' | 'effect' | 'foliage';
  y: number; // Y-sort key
  pos: Vector2;
  data?: any;
}
