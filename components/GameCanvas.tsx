import React, { useEffect, useRef } from 'react';
import { GameState, Player, Enemy, Projectile, SpellType, Vector2, Renderable, Loot, VisualEffect, EquipmentItem, Rarity, EquipmentSlot, Quest } from '../types';
import { TILE_WIDTH, TILE_HEIGHT, MAP_SIZE, COLORS, SPELL_CONFIG, ENEMY_SPAWN_RATE, PLAYER_BASE_SPEED, ENEMY_BASE_SPEED, PLAYER_START_HP, PLAYER_START_MANA, MANA_REGEN, LEVEL_5_UNLOCK, LOOT_DROP_CHANCE, LOOT_LIFE, LEVEL_7_UNLOCK, MOUNT_SPEED_MULT, POTION_CONFIG, ENEMY_CASTER_CONFIG, PLAYER_START_SHIELD, SHIELD_REGEN_RATE, SHIELD_COOLDOWN, RARITY_COLORS, MAX_ENEMIES, ENEMY_RADIUS, COIN_VALUE_RANGE, QUEST_CONFIG, ENEMY_PHASE_DURATION, TALENT_CONFIG, SPELL_UNLOCK_ORDER, BASE_STAT_CONFIG, KILLS_PER_CHARGE, POTION_MAX_CHARGES, IMPACT_PUFF_CONFIG } from '../constants';
import { toScreen, toWorld, getDistance, normalize } from '../utils/isometric';
import { getTileAt } from '../utils/procedural';
import { GameActions } from '../App';

interface GameCanvasProps {
  onUiUpdate: (player: Player, score: number, gameOver: boolean, activeQuest: Quest) => void;
  gameActionsRef: React.MutableRefObject<GameActions>;
  isPaused: boolean;
}

interface RainParticle {
    x: number;
    y: number;
    speed: number;
    length: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onUiUpdate, gameActionsRef, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const generateQuest = (completed: number): Quest => {
      const type = Math.random() > 0.5 ? 'kill' : 'collect';
      const scale = 1 + (completed * 0.2);
      
      if (type === 'kill') {
          const target = Math.ceil(QUEST_CONFIG.baseKillTarget * scale);
          return {
              id: `quest_${Date.now()}`,
              type: 'kill',
              description: `Kill ${target} Enemies`,
              target: target,
              current: 0,
              rewardXp: Math.ceil(QUEST_CONFIG.baseRewardXp * scale),
              rewardCoins: Math.ceil(QUEST_CONFIG.baseRewardCoins * scale)
          };
      } else {
          const target = Math.ceil(QUEST_CONFIG.baseCollectTarget * scale);
          return {
              id: `quest_${Date.now()}`,
              type: 'collect',
              description: `Collect ${target} Coins`,
              target: target,
              current: 0,
              rewardXp: Math.ceil(QUEST_CONFIG.baseRewardXp * scale),
              rewardCoins: Math.ceil(QUEST_CONFIG.baseRewardCoins * scale)
          };
      }
  };

  const stateRef = useRef<GameState>({
    player: {
      id: 'player',
      pos: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.4,
      isDead: false,
      hp: PLAYER_START_HP,
      maxHp: PLAYER_START_HP,
      shield: PLAYER_START_SHIELD,
      maxShield: PLAYER_START_SHIELD,
      shieldRegenTimer: 0,
      mana: PLAYER_START_MANA,
      maxMana: PLAYER_START_MANA,
      xp: 0,
      level: 1,
      toNextLevel: 100,
      currentSpell: SpellType.FIRE,
      knownSpells: [SpellType.FIRE],
      speed: PLAYER_BASE_SPEED,
      statPoints: 0,
      bombAmmo: 0,
      isMounted: false,
      coins: 0,
      talents: { pyroclasm: 0, multishot: 0, force: 0, velocity: 0 },
      baseStats: { vitality: 0, power: 0, haste: 0, swiftness: 0 },
      potions: { health: 2, mana: 2, speed: 2 },
      potionKillCounter: 0,
      activeBuffs: { speedBoost: 0 },
      equipment: { HEAD: null, BODY: null, WEAPON: null, ACCESSORY: null },
      inventory: []
    },
    enemies: [],
    projectiles: [],
    loot: [],
    texts: [],
    visualEffects: [],
    score: 0,
    gameOver: false,
    activeQuest: {
        id: 'init',
        type: 'kill',
        description: `Kill ${QUEST_CONFIG.baseKillTarget} Enemies`,
        target: QUEST_CONFIG.baseKillTarget,
        current: 0,
        rewardXp: QUEST_CONFIG.baseRewardXp,
        rewardCoins: QUEST_CONFIG.baseRewardCoins
    },
    questsCompleted: 0
  });

  const rainRef = useRef<RainParticle[]>([]);
  const sessionTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  // Initialize Rain
  useEffect(() => {
      const rain: RainParticle[] = [];
      for(let i=0; i<150; i++) {
          rain.push({
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              speed: 10 + Math.random() * 10,
              length: 10 + Math.random() * 20
          });
      }
      rainRef.current = rain;
  }, []);

  // ---- Equipment Generation Helper ----
  const generateEquipment = (level: number): EquipmentItem => {
      const slots: EquipmentSlot[] = ['HEAD', 'BODY', 'WEAPON', 'ACCESSORY'];
      const slot = slots[Math.floor(Math.random() * slots.length)];
      
      const rand = Math.random();
      let rarity: Rarity = 'COMMON';
      if (rand > 0.95) rarity = 'LEGENDARY';
      else if (rand > 0.85) rarity = 'EPIC';
      else if (rand > 0.60) rarity = 'RARE';

      const item: EquipmentItem = {
          id: `equip_${Date.now()}_${Math.random()}`,
          name: `${rarity} ${slot}`,
          slot,
          rarity,
          stats: {},
          icon: ''
      };

      // Assign Stats
      const statBudget = { COMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 }[rarity];
      
      for(let i=0; i<statBudget; i++) {
          const type = Math.random();
          if (type < 0.3) {
              item.stats.damage = (item.stats.damage || 0) + Math.floor(Math.random() * 2 + 1); // Reduced from 5 to 2
          } else if (type < 0.5) {
              item.stats.shield = (item.stats.shield || 0) + Math.floor(Math.random() * 5 + 2); // Reduced
          } else if (type < 0.7) {
              item.stats.speed = (item.stats.speed || 0) + 0.05;
          } else {
             if (rarity === 'LEGENDARY' || rarity === 'EPIC') {
                 item.stats.projectileCount = (item.stats.projectileCount || 0) + 1;
             } else {
                 item.stats.damage = (item.stats.damage || 0) + 1; // Reduced
             }
          }
      }

      // Icon
      if (slot === 'HEAD') item.icon = '🧢';
      if (slot === 'BODY') item.icon = '👕';
      if (slot === 'WEAPON') item.icon = '⚔️';
      if (slot === 'ACCESSORY') item.icon = '💍';

      const adjectives = ['Rusty', 'Glowing', 'Ancient', 'Void', 'Divine'];
      const nouns = { HEAD: 'Helm', BODY: 'Armor', WEAPON: 'Wand', ACCESSORY: 'Ring' };
      item.name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[slot]}`;

      return item;
  };

  const consumePotion = (type: 'health' | 'mana' | 'speed') => {
      const p = stateRef.current.player;
      if (p.potions[type] > 0) {
          p.potions[type]--;
          if (type === 'health') {
              p.hp = Math.min(p.maxHp, p.hp + POTION_CONFIG.HEALTH.restore);
              addFloatingText(`+${POTION_CONFIG.HEALTH.restore} HP`, p.pos, '#ef4444');
          } else if (type === 'mana') {
              p.mana = Math.min(p.maxMana, p.mana + POTION_CONFIG.MANA.restore);
              addFloatingText(`+${POTION_CONFIG.MANA.restore} MP`, p.pos, '#3b82f6');
          } else if (type === 'speed') {
              p.activeBuffs.speedBoost = POTION_CONFIG.SPEED.duration;
              addFloatingText(`SPEED UP!`, p.pos, '#22c55e');
          }
      } else {
          addFloatingText("Out of Potions!", p.pos, '#888');
      }
  };

  const recalculateStats = (p: Player) => {
      // Vitality = +10 HP per point
      const baseHp = PLAYER_START_HP + (p.level * 20) + (p.baseStats.vitality * BASE_STAT_CONFIG.VITALITY.hpPerPoint);
      p.maxHp = baseHp;
      if (p.hp > p.maxHp) p.hp = p.maxHp;

      let maxShield = PLAYER_START_SHIELD + (p.level * 10);
      Object.values(p.equipment).forEach(item => {
          if (item?.stats.shield) maxShield += item.stats.shield;
      });
      p.maxShield = maxShield;
      if (p.shield > maxShield) p.shield = maxShield;
  };

  // Bind actions
  useEffect(() => {
    gameActionsRef.current.upgradeTalent = (talent) => {
      const p = stateRef.current.player;
      if (p.statPoints > 0) {
        p.talents[talent]++;
        p.statPoints--;
        addFloatingText(`+ ${talent.toUpperCase()}`, p.pos, '#00ff00');
      }
    };
    gameActionsRef.current.upgradeBaseStat = (stat) => {
        const p = stateRef.current.player;
        if (p.statPoints > 0) {
            p.baseStats[stat]++;
            p.statPoints--;
            recalculateStats(p); // Update HP if Vitality changed
            addFloatingText(`+ ${stat.toUpperCase()}`, p.pos, '#00ff00');
        }
    };
    gameActionsRef.current.usePotion = consumePotion;
    gameActionsRef.current.equipItem = (item) => {
        const p = stateRef.current.player;
        const currentEquipped = p.equipment[item.slot];
        p.inventory = p.inventory.filter(i => i.id !== item.id);
        if (currentEquipped) {
            p.inventory.push(currentEquipped);
        }
        p.equipment[item.slot] = item;
        recalculateStats(p);
    };
    gameActionsRef.current.unequipItem = (slot) => {
        const p = stateRef.current.player;
        const item = p.equipment[slot];
        if (item) {
            p.equipment[slot] = null;
            p.inventory.push(item);
            recalculateStats(p);
        }
    };
  }, [gameActionsRef]);

  // Input State
  const inputRef = useRef({
    mouseScreen: { x: 0, y: 0 },
    leftMouseDown: false,
    rightMouseDown: false,
    keys: new Set<string>(),
  });

  const frameRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);

  const spawnEnemy = () => {
    if (stateRef.current.enemies.length >= MAX_ENEMIES) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 14; 
    
    const spawnX = stateRef.current.player.pos.x + Math.cos(angle) * distance;
    const spawnY = stateRef.current.player.pos.y + Math.sin(angle) * distance;

    // Adjusted for Lvl 1: ~4 hits to kill (avg 6 dmg) = 24 HP
    const baseHp = 18 + (stateRef.current.player.level * 6);
    const isCaster = stateRef.current.player.level >= 5 && Math.random() > 0.7;

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      pos: { x: spawnX, y: spawnY },
      velocity: { x: 0, y: 0 },
      radius: ENEMY_RADIUS,
      isDead: false,
      hp: isCaster ? ENEMY_CASTER_CONFIG.hp + (stateRef.current.player.level * 4) : baseHp,
      maxHp: isCaster ? ENEMY_CASTER_CONFIG.hp + (stateRef.current.player.level * 4) : baseHp,
      speed: isCaster ? ENEMY_CASTER_CONFIG.speed : (ENEMY_BASE_SPEED + (stateRef.current.player.level * 0.1)),
      damage: isCaster ? ENEMY_CASTER_CONFIG.damage : (3 + Math.floor(stateRef.current.player.level * 0.5)), // Lower dmg
      isFrozen: false,
      freezeTimer: 0,
      type: isCaster ? 'caster' : 'melee',
      attackCooldown: 0,
      stuckCheckTimer: 0,
      stuckCounter: 0,
      lastStuckPos: { x: spawnX, y: spawnY },
      isPhasing: false,
      phaseTimer: 0
    };

    stateRef.current.enemies.push(enemy);
  };

  const spawnLoot = (pos: Vector2) => {
    const coinCount = Math.floor(Math.random() * 3) + 1;
    for(let i=0; i<coinCount; i++) {
        const scatter = {
            x: pos.x + (Math.random() - 0.5) * 1.5,
            y: pos.y + (Math.random() - 0.5) * 1.5
        };
        const val = Math.floor(Math.random() * (COIN_VALUE_RANGE.max - COIN_VALUE_RANGE.min + 1)) + COIN_VALUE_RANGE.min;
        stateRef.current.loot.push({
            id: `coin_${Date.now()}_${i}`,
            pos: scatter,
            velocity: {x:0, y:0},
            radius: 0.2,
            isDead: false,
            type: 'coin',
            life: LOOT_LIFE,
            value: val
        });
    }

    const rand = Math.random();
    let type: Loot['type'] = 'bomb';
    let data: EquipmentItem | undefined = undefined;
    
    // Adjusted logic: No potions from loot
    if (rand < 0.3) { // Increased drop chance for equips/bombs
        type = 'equipment';
        data = generateEquipment(stateRef.current.player.level);
    } else {
        type = 'bomb';
    }

    if (Math.random() < LOOT_DROP_CHANCE) {
        stateRef.current.loot.push({
        id: `loot_${Date.now()}_${Math.random()}`,
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius: 0.3,
        isDead: false,
        type: type,
        life: LOOT_LIFE,
        data: data
        });
    }
  };

  const addFloatingText = (text: string, worldPos: Vector2, color: string) => {
    stateRef.current.texts.push({
      id: `txt_${Date.now()}_${Math.random()}`,
      pos: { ...worldPos },
      text,
      color,
      life: 60,
      velocity: { x: 0, y: -0.05 }
    });
  };

  const createSparkleBurst = (pos: Vector2) => {
      for(let i=0; i<10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 2;
          stateRef.current.visualEffects.push({
              id: `sparkle_${Date.now()}_${i}`,
              type: 'sparkle',
              pos: { x: pos.x + Math.cos(angle)*dist, y: pos.y + Math.sin(angle)*dist },
              life: 60 + Math.random() * 30
          });
      }
  };
  
  const createImpactPuff = (pos: Vector2, spellType: SpellType) => {
      const config = IMPACT_PUFF_CONFIG[spellType];
      if (!config) return;
      
      // Spawn a few small particles
      for(let i=0; i<3; i++) {
          stateRef.current.visualEffects.push({
              id: `puff_${Date.now()}_${Math.random()}`,
              type: 'impact_puff',
              pos: { 
                  x: pos.x + (Math.random() - 0.5) * 0.5, 
                  y: pos.y + (Math.random() - 0.5) * 0.5 
              },
              life: 15, // Short life
              data: { emoji: config.emoji, color: config.color }
          });
      }
  };

  const isPositionValid = (x: number, y: number, radius: number): boolean => {
    const checkRadius = 2;
    const minX = Math.floor(x - checkRadius);
    const maxX = Math.ceil(x + checkRadius);
    const minY = Math.floor(y - checkRadius);
    const maxY = Math.ceil(y + checkRadius);

    for (let tx = minX; tx <= maxX; tx++) {
        for (let ty = minY; ty <= maxY; ty++) {
            const tile = getTileAt(tx, ty);
            if (tile.hasTree) {
                const treePos = { x: tx + 0.5, y: ty + 0.5 };
                const dist = getDistance({ x, y }, treePos);
                if (dist < (radius + 0.75)) {
                    return false;
                }
            }
        }
    }
    return true;
  };

  const explodeBomb = (pos: Vector2) => {
      const radius = SPELL_CONFIG.BOMB.radius;
      const damage = SPELL_CONFIG.BOMB.baseDamage;
      // Add Variance to bomb too
      const variance = SPELL_CONFIG.BOMB.damageVariance || 0.2;
      const finalDmg = damage * (1 - variance + Math.random() * variance * 2);

      addFloatingText("BOOM!", pos, '#000000');
      createExplosionShrapnel(pos, damage * 0.2); 

      stateRef.current.enemies.forEach(e => {
          if (e.isDead) return;
          const dist = getDistance(pos, e.pos);
          if (dist <= radius) {
              e.hp -= finalDmg;
              addFloatingText(`${Math.round(finalDmg)}`, e.pos, '#000000');
              const pushDir = normalize({
                  x: e.pos.x - pos.x,
                  y: e.pos.y - pos.y
              });
              e.pos.x += pushDir.x * 2.0;
              e.pos.y += pushDir.y * 2.0;

              if (e.hp <= 0) {
                  e.isDead = true;
                  handleEnemyDeath(e);
              }
          }
      });
  };

  const createExplosion = (pos: Vector2, radius: number, damage: number, color: string) => {
    stateRef.current.visualEffects.push({
        id: `nova_${Date.now()}_${Math.random()}`,
        type: 'nova',
        pos: { ...pos },
        life: 20,
        data: { radius: radius }
    });

    stateRef.current.enemies.forEach(e => {
        if (e.isDead) return;
        const dist = getDistance(pos, e.pos);
        if (dist <= radius) {
            e.hp -= damage;
            addFloatingText(`${Math.round(damage)}`, e.pos, color);
            if (e.hp <= 0) {
                e.isDead = true;
                handleEnemyDeath(e);
            }
        }
    });
  };

  const checkQuestCompletion = () => {
      const state = stateRef.current;
      const quest = state.activeQuest;
      if (quest.current >= quest.target) {
          addFloatingText("QUEST COMPLETE!", state.player.pos, '#fbbf24');
          addFloatingText(`+${quest.rewardXp} XP`, {x: state.player.pos.x, y: state.player.pos.y - 1}, '#fbbf24');
          addFloatingText(`+${quest.rewardCoins} Coins`, {x: state.player.pos.x, y: state.player.pos.y - 1.5}, '#fbbf24');
          state.player.xp += quest.rewardXp;
          checkLevelUp(state.player);
          state.player.coins += quest.rewardCoins;
          state.questsCompleted++;
          state.activeQuest = generateQuest(state.questsCompleted);
      }
  };

  const checkLevelUp = (p: Player) => {
      if (p.xp >= p.toNextLevel) {
          p.level++;
          p.statPoints++; 
          p.xp -= p.toNextLevel;
          p.toNextLevel = Math.floor(p.toNextLevel * 1.5);
          recalculateStats(p); 
          // Heal on Level up
          p.hp = p.maxHp;
          addFloatingText("LEVEL UP!", p.pos, '#fbbf24');
          createSparkleBurst(p.pos);

          // Unlock New Spell every 2 levels (3, 5, 7, etc.)
          if (p.level % 2 !== 0) {
             const unlockIndex = (p.level - 3) / 2;
             if (unlockIndex >= 0 && unlockIndex < SPELL_UNLOCK_ORDER.length) {
                 const newSpellKey = SPELL_UNLOCK_ORDER[unlockIndex] as SpellType;
                 if (!p.knownSpells.includes(newSpellKey)) {
                     p.knownSpells.push(newSpellKey);
                     addFloatingText(`Learned ${SPELL_CONFIG[newSpellKey].emoji}!`, {x: p.pos.x, y: p.pos.y - 2}, '#fff');
                 }
             }
          }
      }
  };

  const handleEnemyDeath = (e: Enemy) => {
     const state = stateRef.current;
     state.score += 10;
     state.player.xp += 20;
     if (state.activeQuest.type === 'kill') {
         state.activeQuest.current++;
         checkQuestCompletion();
     }
     
     // Potion Recharge Logic
     state.player.potionKillCounter++;
     if (state.player.potionKillCounter >= KILLS_PER_CHARGE) {
         state.player.potionKillCounter = 0;
         let recharged = false;
         // Recharge HP
         if (state.player.potions.health < POTION_MAX_CHARGES) {
             state.player.potions.health++;
             recharged = true;
         }
         // Recharge Mana
         if (state.player.potions.mana < POTION_MAX_CHARGES) {
             state.player.potions.mana++;
             recharged = true;
         }
         // Recharge Speed
         if (state.player.potions.speed < POTION_MAX_CHARGES) {
             state.player.potions.speed++;
             recharged = true;
         }
         
         if (recharged) {
             addFloatingText("Flasks Recharged!", state.player.pos, '#00ff00');
         }
     }

     spawnLoot(e.pos);
     checkLevelUp(state.player);
  };

  const enemyShoot = (e: Enemy) => {
      const { player } = stateRef.current;
      const dir = normalize({
          x: player.pos.x - e.pos.x,
          y: player.pos.y - e.pos.y
      });
      stateRef.current.projectiles.push({
          id: `eproj_${Date.now()}_${Math.random()}`,
          pos: { ...e.pos },
          velocity: { x: dir.x * 0.15, y: dir.y * 0.15 },
          radius: 0.26,
          isDead: false,
          spellType: SpellType.FIRE, 
          damage: e.damage,
          duration: 120,
          hitList: [],
          isEnemy: true, 
      });
  };

  const castSpell = (targetScreen: Vector2, overrideSpellType?: SpellType) => {
    if (cooldownRef.current > 0) return;

    const { player } = stateRef.current;
    const spell = overrideSpellType || player.currentSpell;
    
    // Prevent casting unknown spells
    if (!player.knownSpells.includes(spell)) return;

    player.currentSpell = spell;
    const config = SPELL_CONFIG[spell];
    
    if (spell === SpellType.BOMB && player.bombAmmo <= 0) {
        addFloatingText("No Ammo!", player.pos, '#888');
        return;
    }

    const canvas = canvasRef.current;
    if(!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const playerScreen = toScreen(player.pos.x, player.pos.y);
    const offsetX = centerX - playerScreen.x;
    const offsetY = centerY - playerScreen.y;

    const mouseWorld = toWorld(targetScreen.x - offsetX, targetScreen.y - offsetY);

    // Apply Power (Damage) Stat
    const powerDmg = player.baseStats.power * BASE_STAT_CONFIG.POWER.dmgPerPoint;

    // --- Damage Calculation with Variance ---
    let equipDamage = 0;
    Object.values(player.equipment).forEach(item => { if(item?.stats.damage) equipDamage += item.stats.damage; });
    const rawDmg = config.baseDamage + (player.level * 0.5) + equipDamage + powerDmg; // Reduced level scaling
    const variance = config.damageVariance || 0.1;
    const finalDmg = rawDmg * (1 - variance + Math.random() * variance * 2);

    if (spell === SpellType.ARCANE_EXPLOSION) {
        const arcaneConfig = SPELL_CONFIG.ARCANE_EXPLOSION;
        const explosionRadius = arcaneConfig.radius + (player.level * arcaneConfig.radiusPerLevel);
        
        stateRef.current.visualEffects.push({
            id: `nova_${Date.now()}`,
            type: 'nova',
            pos: { ...player.pos },
            life: 20,
            data: { radius: explosionRadius }
        });

        let hitCount = 0;
        stateRef.current.enemies.forEach(e => {
            if (e.isDead) return;
            const dist = getDistance(player.pos, e.pos);
            if (dist <= explosionRadius) {
                e.hp -= finalDmg;
                addFloatingText(`${Math.round(finalDmg)}`, e.pos, config.color);
                hitCount++;
                if (e.hp <= 0) {
                    e.isDead = true;
                    handleEnemyDeath(e);
                }
            }
        });
        
        if (hitCount === 0) addFloatingText("Miss!", {x: player.pos.x, y: player.pos.y - 1}, '#fff');
    }
    else if (spell === SpellType.TELEPORT) {
      if (isPositionValid(mouseWorld.x, mouseWorld.y, player.radius)) {
          player.pos = { ...mouseWorld };
          addFloatingText("✨", player.pos, config.color);
      } else {
          addFloatingText("Blocked!", player.pos, '#ffffff');
          return;
      }
    }
    else {
        let dir = { x: 0, y: 0 };
        let finalTargetPos: Vector2 | undefined = undefined;

        if (spell === SpellType.BOMB) {
            const dist = getDistance(player.pos, mouseWorld);
            const maxDist = 6;
            const clampDist = Math.min(dist, maxDist);
            dir = normalize({ x: mouseWorld.x - player.pos.x, y: mouseWorld.y - player.pos.y });
            finalTargetPos = { x: player.pos.x + dir.x * clampDist, y: player.pos.y + dir.y * clampDist };
        } else {
            dir = normalize({ x: mouseWorld.x - player.pos.x, y: mouseWorld.y - player.pos.y });
        }

        const speedLevelBonus = (player.level * config.speedPerLevel);
        // Talent Velocity
        const velocityMultiplier = 1 + (player.talents.velocity * TALENT_CONFIG.VELOCITY.speedPerRank);
        const speedMultiplier = (config.baseSpeed + speedLevelBonus) * velocityMultiplier;
        const projectileSpeed = speedMultiplier * 0.05; 

        let projectileCount = 1;
        if (spell !== SpellType.BOMB) {
            Object.values(player.equipment).forEach(item => { if(item?.stats.projectileCount) projectileCount += item.stats.projectileCount; });
            // Talent Multishot
            if (spell === SpellType.WIND || spell === SpellType.ICE || spell === SpellType.FIRE) {
                projectileCount += (player.talents.multishot * TALENT_CONFIG.MULTISHOT.countPerRank);
            }
        }

        const baseAngle = Math.atan2(dir.y, dir.x);
        
        // Talent Pyroclasm (Explosion Radius for FIRE)
        let explosionRadius = 0;
        if (spell === SpellType.FIRE) {
             explosionRadius = player.talents.pyroclasm * TALENT_CONFIG.PYROCLASM.radiusPerRank + (player.talents.pyroclasm > 0 ? TALENT_CONFIG.PYROCLASM.baseRadius : 0);
        }

        // Talent Force (Knockback for EARTH)
        let knockback = 0;
        if (spell === SpellType.EARTH) {
             knockback = TALENT_CONFIG.FORCE.baseKnockback + (player.talents.force * TALENT_CONFIG.FORCE.knockbackPerRank);
        } else if (spell === SpellType.WIND) {
             knockback = SPELL_CONFIG.WIND.knockbackBase + (player.level * SPELL_CONFIG.WIND.knockbackPerLevel);
        }

        for(let i=0; i<projectileCount; i++) {
            const spreadStep = 0.2; 
            const offset = (i - (projectileCount - 1) / 2) * spreadStep;
            const angle = baseAngle + offset;
            
            const velX = Math.cos(angle) * projectileSpeed;
            const velY = Math.sin(angle) * projectileSpeed;

            stateRef.current.projectiles.push({
                id: `proj_${Date.now()}_${Math.random()}_${i}`,
                pos: { ...player.pos },
                velocity: { x: velX, y: velY },
                radius: 0.26, 
                isDead: false,
                spellType: spell,
                damage: finalDmg,
                duration: 180, 
                hitList: [], 
                isShrapnel: false,
                targetPos: finalTargetPos,
                isEnemy: false,
                explosionRadius: explosionRadius,
                knockback: knockback
            });
        }

        if (spell === SpellType.BOMB) player.bombAmmo--;
    }

    // Apply Haste (CDR)
    const cdrMultiplier = Math.max(0.2, 1 - (player.baseStats.haste * BASE_STAT_CONFIG.HASTE.cdrPerPoint));
    cooldownRef.current = config.cooldown * cdrMultiplier; 
  };

  const createExplosionShrapnel = (origin: Vector2, damage: number) => {
    const count = SPELL_CONFIG.FIRE.shrapnelCount;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = (SPELL_CONFIG.FIRE.baseSpeed + 2) * 0.05;
      
      stateRef.current.projectiles.push({
        id: `shrapnel_${Date.now()}_${i}`,
        pos: { ...origin },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        radius: 0.2, 
        isDead: false,
        spellType: SpellType.FIRE,
        damage: damage,
        duration: 30, 
        hitList: [],
        isShrapnel: true, 
        isEnemy: false
      });
    }
  };

  const chainLightning = (startEnemy: Enemy, damage: number, hops: number) => {
      if (hops <= 0) return;
      const { enemies } = stateRef.current;
      let closest: Enemy | null = null;
      let minDst = SPELL_CONFIG.LIGHTNING.chainRange;
      enemies.forEach(e => {
          if (e.id !== startEnemy.id && !e.isDead) {
              const d = getDistance(startEnemy.pos, e.pos);
              if (d < minDst) {
                  minDst = d;
                  closest = e;
              }
          }
      });
      if (closest) {
          const c = closest as Enemy;
          c.hp -= damage;
          addFloatingText(`${Math.round(damage)}`, c.pos, SPELL_CONFIG.LIGHTNING.color);
          stateRef.current.visualEffects.push({
              id: `lightning_${Date.now()}_${hops}`,
              type: 'lightning_chain',
              pos: { ...startEnemy.pos },
              life: 15,
              data: { targetPos: { ...c.pos } }
          });
          if (c.hp <= 0) {
              c.isDead = true;
              handleEnemyDeath(c);
          } else {
              chainLightning(c, damage, hops - 1);
          }
      }
  };

  const takePlayerDamage = (amount: number) => {
      const { player } = stateRef.current;
      player.shieldRegenTimer = SHIELD_COOLDOWN; 
      let remainingDamage = amount;
      if (player.shield > 0) {
          if (player.shield >= remainingDamage) {
              player.shield -= remainingDamage;
              remainingDamage = 0;
          } else {
              remainingDamage -= player.shield;
              player.shield = 0;
          }
      }
      if (remainingDamage > 0) {
          player.hp -= remainingDamage;
          addFloatingText(`-${Math.round(remainingDamage)}`, player.pos, '#ef4444');
          if (player.hp <= 0) stateRef.current.gameOver = true;
      }
  };

  const update = () => {
    if (isPaused) return;
    const state = stateRef.current;
    if (state.gameOver) return;

    rainRef.current.forEach(r => {
        r.y += r.speed;
        r.x -= r.speed * 0.5;
        if (r.y > window.innerHeight) {
            r.y = -20;
            r.x = Math.random() * window.innerWidth + 200; 
        }
    });

    state.player.mana = Math.min(state.player.maxMana, state.player.mana + MANA_REGEN);
    if (state.player.shieldRegenTimer > 0) {
        state.player.shieldRegenTimer--;
    } else if (state.player.shield < state.player.maxShield) {
        state.player.shield = Math.min(state.player.maxShield, state.player.shield + SHIELD_REGEN_RATE);
    }
    if (state.player.activeBuffs.speedBoost > 0) state.player.activeBuffs.speedBoost--;

    spawnTimerRef.current++;
    // Spawn Rate Scaling
    const currentSpawnRate = Math.max(40, (ENEMY_SPAWN_RATE - (state.player.level * 5)));
    if (spawnTimerRef.current >= currentSpawnRate) {
      spawnEnemy();
      spawnTimerRef.current = 0;
    }

    if (inputRef.current.leftMouseDown) {
      const canvas = canvasRef.current;
      if (canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dx = inputRef.current.mouseScreen.x - (centerX);
        const dy = inputRef.current.mouseScreen.y - (centerY);
        const screenDist = Math.sqrt(dx*dx + dy*dy);

        if (screenDist > 5) {
            // Movement Logic: Base Speed + Equipment + Buffs + Swiftness
            const mountMult = state.player.isMounted ? MOUNT_SPEED_MULT : 1;
            const potionMult = state.player.activeBuffs.speedBoost > 0 ? POTION_CONFIG.SPEED.multiplier : 1;
            
            let equipSpeed = 0;
            Object.values(state.player.equipment).forEach(item => { if(item?.stats.speed) equipSpeed += item.stats.speed; });

            // Apply Swiftness
            const swiftnessMult = 1 + (state.player.baseStats.swiftness * BASE_STAT_CONFIG.SWIFTNESS.speedPerPoint);

            const basePixelSpeed = (state.player.speed + equipSpeed) * 2.5 * mountMult * potionMult * swiftnessMult;
            
            const vX = (dx / screenDist) * basePixelSpeed;
            const vY = (dy / screenDist) * basePixelSpeed;
            const worldDelta = toWorld(vX, vY);

            const newX = state.player.pos.x + worldDelta.x;
            const newY = state.player.pos.y + worldDelta.y;

            if (isPositionValid(newX, state.player.pos.y, state.player.radius)) {
                state.player.pos.x = newX;
            }
            if (isPositionValid(state.player.pos.x, newY, state.player.radius)) {
                state.player.pos.y = newY;
            }
        }
      }
    }

    if (inputRef.current.rightMouseDown) {
       castSpell(inputRef.current.mouseScreen);
    }

    if (cooldownRef.current > 0) cooldownRef.current--;

    state.projectiles.forEach(p => {
      if (p.spellType === SpellType.BOMB && p.targetPos) {
          const distToTarget = getDistance(p.pos, p.targetPos);
          if (distToTarget < 0.2) {
              p.isDead = true;
              explodeBomb(p.pos);
              return;
          }
      }

      const nextX = p.pos.x + p.velocity.x;
      const nextY = p.pos.y + p.velocity.y;

      // Projectile Collision with Walls
      if (p.spellType !== SpellType.BOMB && !isPositionValid(nextX, nextY, p.radius)) {
          p.isDead = true;
          // Trigger explosion on wall hit for FIRE
          if (p.spellType === SpellType.FIRE && p.explosionRadius && p.explosionRadius > 0 && !p.isShrapnel && !p.isEnemy) {
               createExplosion(p.pos, p.explosionRadius, p.damage, SPELL_CONFIG.FIRE.color);
          }
           else if (state.player.level >= LEVEL_5_UNLOCK && p.spellType === SpellType.FIRE && !p.isShrapnel && !p.isEnemy) {
               createExplosionShrapnel(p.pos, SPELL_CONFIG.FIRE.shrapnelDamage + state.player.level);
          }
      } else {
          p.pos.x = nextX;
          p.pos.y = nextY;
      }
      
      p.duration--;
      if (p.duration <= 0) {
          p.isDead = true;
          if (p.spellType === SpellType.BOMB) explodeBomb(p.pos);
      }
    });

    state.enemies.forEach(e => {
        if (e.isDead) return;
        if (e.isFrozen) {
            e.freezeTimer--;
            if (e.freezeTimer <= 0) e.isFrozen = false;
        }

        const speed = e.isFrozen ? e.speed * 0.5 : e.speed;
        const distToPlayer = getDistance(e.pos, state.player.pos);

        if (e.isPhasing) {
            e.phaseTimer--;
            if (e.phaseTimer <= 0) {
                e.isPhasing = false;
            }
        }

        if (!e.stuckCheckTimer) e.stuckCheckTimer = 0;
        e.stuckCheckTimer++;
        if (e.stuckCheckTimer >= 60) {
            const distToLast = getDistance(e.pos, e.lastStuckPos || e.pos);
            if (distToLast < 0.5) {
                e.stuckCounter = (e.stuckCounter || 0) + 1;
            } else {
                e.stuckCounter = 0;
            }
            e.lastStuckPos = { ...e.pos };
            e.stuckCheckTimer = 0;

            if (e.stuckCounter && e.stuckCounter >= 3) {
                e.isPhasing = true;
                e.phaseTimer = ENEMY_PHASE_DURATION;
                e.stuckCounter = 0;
                addFloatingText("Ghosting", e.pos, '#888');
            }
        }

        if (e.type === 'caster') {
            const preferredDist = ENEMY_CASTER_CONFIG.range;
            if (distToPlayer > preferredDist) {
                const dir = normalize({ x: state.player.pos.x - e.pos.x, y: state.player.pos.y - e.pos.y });
                const moveSpeed = speed * 0.03;
                const nextX = e.pos.x + dir.x * moveSpeed;
                const nextY = e.pos.y + dir.y * moveSpeed;
                
                if (e.isPhasing) {
                    e.pos.x = nextX;
                    e.pos.y = nextY;
                } else {
                    if (isPositionValid(nextX, e.pos.y, e.radius)) e.pos.x = nextX;
                    if (isPositionValid(e.pos.x, nextY, e.radius)) e.pos.y = nextY;
                }
            } else if (distToPlayer < preferredDist - 2) {
                const dir = normalize({ x: e.pos.x - state.player.pos.x, y: e.pos.y - state.player.pos.y });
                const moveSpeed = speed * 0.02; 
                const nextX = e.pos.x + dir.x * moveSpeed;
                const nextY = e.pos.y + dir.y * moveSpeed;
                
                 if (e.isPhasing) {
                    e.pos.x = nextX;
                    e.pos.y = nextY;
                } else {
                    if (isPositionValid(nextX, e.pos.y, e.radius)) e.pos.x = nextX;
                    if (isPositionValid(e.pos.x, nextY, e.radius)) e.pos.y = nextY;
                }
            }
            if (e.attackCooldown > 0) e.attackCooldown--;
            if (distToPlayer < preferredDist + 2 && e.attackCooldown <= 0) {
                enemyShoot(e);
                e.attackCooldown = ENEMY_CASTER_CONFIG.cooldown;
            }

        } else {
            if (distToPlayer > 0.1) {
                const dx = state.player.pos.x - e.pos.x;
                const dy = state.player.pos.y - e.pos.y;
                const moveSpeed = speed * 0.03;
                
                const len = Math.sqrt(dx*dx + dy*dy);
                const ndx = dx / len;
                const ndy = dy / len;
                
                const vx = ndx * moveSpeed;
                const vy = ndy * moveSpeed;

                if (e.isPhasing) {
                    e.pos.x += vx;
                    e.pos.y += vy;
                } else {
                    let moved = false;
                    if (isPositionValid(e.pos.x + vx, e.pos.y, e.radius)) {
                        e.pos.x += vx;
                        moved = true;
                    }
                    if (isPositionValid(e.pos.x, e.pos.y + vy, e.radius)) {
                        e.pos.y += vy;
                        moved = true;
                    }

                    if (!moved) {
                        const strafeVx = -ndy * moveSpeed;
                        const strafeVy = ndx * moveSpeed;
                        if (isPositionValid(e.pos.x + strafeVx, e.pos.y + strafeVy, e.radius)) {
                            e.pos.x += strafeVx;
                            e.pos.y += strafeVy;
                        } else {
                            const strafeVx2 = ndy * moveSpeed;
                            const strafeVy2 = -ndx * moveSpeed;
                            if (isPositionValid(e.pos.x + strafeVx2, e.pos.y + strafeVy2, e.radius)) {
                                e.pos.x += strafeVx2;
                                e.pos.y += strafeVy2;
                            }
                        }
                    }
                }
            }
            if (getDistance(e.pos, state.player.pos) < (e.radius + state.player.radius)) {
                takePlayerDamage(0.5);
            }
        }
    });

    state.loot.forEach(l => {
        l.life--;
        if (l.life <= 0) l.isDead = true;
        
        let pickupDist = l.radius + state.player.radius + 0.5;
        
        if (l.type === 'coin') {
            const dist = getDistance(l.pos, state.player.pos);
            if (dist < 4) {
                const dir = normalize({ x: state.player.pos.x - l.pos.x, y: state.player.pos.y - l.pos.y });
                l.pos.x += dir.x * 0.2; 
                l.pos.y += dir.y * 0.2;
            }
        }

        const dist = getDistance(l.pos, state.player.pos);
        if (dist < pickupDist) {
            l.isDead = true;
            if (l.type === 'bomb') {
                state.player.bombAmmo += 1;
                addFloatingText("+1 💣", state.player.pos, '#fff');
            } else if (l.type === 'equipment' && l.data) {
                state.player.inventory.push(l.data);
                addFloatingText(l.data.name, state.player.pos, RARITY_COLORS[l.data.rarity]);
            } else if (l.type === 'coin') {
                const val = l.value || 1;
                state.player.coins += val;
                if (state.activeQuest.type === 'collect') {
                    state.activeQuest.current += val;
                    checkQuestCompletion();
                }
            }
        }
    });

    state.projectiles.forEach(p => {
        if (p.isDead) return;
        if (p.spellType === SpellType.BOMB) return;
        
        if (!p.isEnemy) {
            state.enemies.forEach(e => {
                if (e.isDead || p.isDead) return;
                if (p.spellType === SpellType.ICE && p.hitList.includes(e.id)) return;
                const dist = getDistance(p.pos, e.pos);
                if (dist < (p.radius + e.radius)) {
                    e.hp -= p.damage;
                    addFloatingText(`${Math.round(p.damage)}`, e.pos, SPELL_CONFIG[p.spellType].color);

                    createImpactPuff(e.pos, p.spellType);

                    // --- ELEMENTAL EFFECTS ON HIT ---
                    
                    // ICE: Slow
                    if (p.spellType === SpellType.ICE) {
                        e.isFrozen = true;
                        e.freezeTimer = SPELL_CONFIG.ICE.slowDuration || 60;
                        if (state.player.level >= LEVEL_5_UNLOCK) p.hitList.push(e.id);
                        else p.isDead = true;
                    } 
                    // FIRE: Explosion (AoE)
                    else if (p.spellType === SpellType.FIRE) {
                        p.isDead = true;
                        // Trigger AoE
                        if (p.explosionRadius && p.explosionRadius > 0) {
                            createExplosion(p.pos, p.explosionRadius, p.damage, SPELL_CONFIG.FIRE.color);
                        } else if (state.player.level >= LEVEL_5_UNLOCK && !p.isShrapnel) {
                            // Legacy Lvl 5 Shrapnel
                            createExplosionShrapnel(p.pos, SPELL_CONFIG.FIRE.shrapnelDamage + state.player.level);
                        }
                    } 
                    // LIGHTNING: Chain
                    else if (p.spellType === SpellType.LIGHTNING) {
                        p.isDead = true;
                        chainLightning(e, p.damage, SPELL_CONFIG.LIGHTNING.chainCount);
                    } 
                    // WIND / EARTH: Knockback
                    else if (p.spellType === SpellType.WIND || p.spellType === SpellType.EARTH) {
                        p.isDead = true;
                        // Use projectile knockback value or fallback
                        const kbForce = p.knockback || (SPELL_CONFIG.WIND.knockbackBase + (state.player.level * SPELL_CONFIG.WIND.knockbackPerLevel));
                        
                        const kbDir = normalize({ x: e.pos.x - p.pos.x, y: e.pos.y - p.pos.y });
                        const newX = e.pos.x + kbDir.x * kbForce;
                        const newY = e.pos.y + kbDir.y * kbForce;
                        
                        if (e.isPhasing) {
                            e.pos.x = newX;
                            e.pos.y = newY;
                        } else if (isPositionValid(newX, newY, e.radius)) {
                            e.pos.x = newX;
                            e.pos.y = newY;
                        }
                        
                        if (p.spellType === SpellType.EARTH) addFloatingText("SLAM!", e.pos, '#8b4513');
                        else addFloatingText(">>>", e.pos, '#a7f3d0');
                    }

                    if (e.hp <= 0) {
                        e.isDead = true;
                        handleEnemyDeath(e);
                    }
                }
            });
        }
        else {
             const dist = getDistance(p.pos, state.player.pos);
             if (dist < (p.radius + state.player.radius)) {
                 takePlayerDamage(p.damage);
                 p.isDead = true;
             }
        }
    });

    state.enemies = state.enemies.filter(e => !e.isDead);
    state.projectiles = state.projectiles.filter(p => !p.isDead);
    state.loot = state.loot.filter(l => !l.isDead);
    state.visualEffects = state.visualEffects.filter(v => { v.life--; return v.life > 0; });
    state.texts.forEach(t => { t.life--; t.pos.y += t.velocity.y; });
    state.texts = state.texts.filter(t => t.life > 0);
  };

  const renderMinimap = (ctx: CanvasRenderingContext2D, canvasWidth: number) => {
    const mapSize = 180; 
    const margin = 20;
    const centerX = canvasWidth - margin - mapSize / 2;
    const centerY = margin + mapSize / 2;
    const radius = mapSize / 2;
    const scale = 2; 

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

    const { enemies, loot, player } = stateRef.current;
    
    ctx.fillStyle = '#fbbf24';
    loot.forEach(l => {
        const dx = (l.pos.x - player.pos.x) * scale;
        const dy = (l.pos.y - player.pos.y) * scale;
        if (dx*dx + dy*dy < radius*radius) {
            ctx.beginPath();
            ctx.arc(centerX + dx, centerY + dy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    enemies.forEach(e => {
        const dx = (e.pos.x - player.pos.x) * scale;
        const dy = (e.pos.y - player.pos.y) * scale;
        if (dx*dx + dy*dy < radius*radius) {
            ctx.fillStyle = e.type === 'caster' ? '#a855f7' : '#ef4444';
            ctx.beginPath();
            ctx.arc(centerX + dx, centerY + dy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.restore();

    const minutes = Math.floor(sessionTimeRef.current / 60000);
    const seconds = Math.floor((sessionTimeRef.current % 60000) / 1000);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, centerX, centerY + radius + 20);
  };

  const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { player, enemies, projectiles, loot, texts, visualEffects } = stateRef.current;
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
      }

      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const playerScreen = toScreen(player.pos.x, player.pos.y);
      const offsetX = centerX - playerScreen.x;
      const offsetY = centerY - playerScreen.y;

      const range = Math.ceil(Math.max(canvas.width, canvas.height) / TILE_HEIGHT) + 15;
      
      const startX = Math.floor(player.pos.x - range);
      const endX = Math.floor(player.pos.x + range);
      const startY = Math.floor(player.pos.y - range);
      const endY = Math.floor(player.pos.y + range);

      const renderList: Renderable[] = [];

      for (let x = startX; x <= endX; x++) {
          for (let y = startY; y <= endY; y++) {
              const tile = getTileAt(x, y);
              const screenPos = toScreen(x, y);
              const drawX = screenPos.x + offsetX;
              const drawY = screenPos.y + offsetY;

              if (drawX < -TILE_WIDTH || drawX > canvas.width + TILE_WIDTH || 
                  drawY < -TILE_HEIGHT || drawY > canvas.height + TILE_HEIGHT) continue;

              ctx.beginPath();
              const overlap = 0.5;
              ctx.moveTo(drawX, drawY - TILE_HEIGHT / 2 - overlap);
              ctx.lineTo(drawX + TILE_WIDTH / 2 + overlap, drawY);
              ctx.lineTo(drawX, drawY + TILE_HEIGHT / 2 + overlap);
              ctx.lineTo(drawX - TILE_WIDTH / 2 - overlap, drawY);
              ctx.closePath();
              
              if (tile.isRoad) {
                  ctx.fillStyle = tile.roadColor || COLORS.grid;
              } else {
                  ctx.fillStyle = '#3a3a3a'; 
              }

              ctx.lineJoin = 'round';
              ctx.lineWidth = 8;
              ctx.strokeStyle = ctx.fillStyle;
              ctx.stroke();
              ctx.fill();

              if (tile.hasTree) {
                  const worldPos = { x: x + 0.5, y: y + 0.5 };
                  renderList.push({
                      type: 'tree',
                      y: worldPos.x + worldPos.y, 
                      pos: worldPos,
                      data: { variant: tile.treeVariant }
                  });
              } else if (tile.hasFoliage) {
                   const worldPos = { x: x + 0.5, y: y + 0.5 };
                   renderList.push({
                      type: 'foliage',
                      y: worldPos.x + worldPos.y - 0.5, 
                      pos: worldPos,
                      data: { variant: tile.foliageVariant }
                  });
              }
          }
      }

      renderList.push({ type: 'player', y: player.pos.x + player.pos.y, pos: player.pos });
      enemies.forEach(e => renderList.push({ type: 'enemy', y: e.pos.x + e.pos.y, pos: e.pos, data: e }));
      loot.forEach(l => renderList.push({ type: 'loot', y: l.pos.x + l.pos.y, pos: l.pos, data: l }));
      projectiles.forEach(p => renderList.push({ type: 'projectile', y: p.pos.x + p.pos.y, pos: p.pos, data: p }));
      visualEffects.forEach(v => renderList.push({ type: 'effect', y: v.pos.x + v.pos.y, pos: v.pos, data: v }));

      renderList.sort((a, b) => a.y - b.y);

      // --- LIGHTING GRADIENT OVERLAY ---
      const maxDim = Math.max(canvas.width, canvas.height);
      const gradient = ctx.createRadialGradient(centerX, centerY, 100, centerX, centerY, maxDim);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      renderList.forEach(item => {
          const screen = toScreen(item.pos.x, item.pos.y);
          const x = screen.x + offsetX;
          const y = screen.y + offsetY;

          if (item.type === 'tree') {
               ctx.font = '200px sans-serif'; 
               ctx.textAlign = 'center';
               ctx.textBaseline = 'bottom';
               ctx.fillStyle = 'rgba(0,0,0,0.3)';
               ctx.beginPath();
               ctx.ellipse(x, y, 60, 30, 0, 0, Math.PI * 2);
               ctx.fill();
               ctx.fillText(item.data.variant, x, y + 20); 
          } else if (item.type === 'foliage') {
               ctx.font = '16px sans-serif'; 
               ctx.textAlign = 'center';
               ctx.textBaseline = 'bottom';
               ctx.fillText(item.data.variant, x, y + 10); 
          } else if (item.type === 'effect') {
              const v = item.data as VisualEffect;
              if (v.type === 'sparkle') {
                  ctx.font = '20px sans-serif';
                  ctx.fillText('✨', x, y);
              } else if (v.type === 'lightning_chain') {
                  const targetPos = v.data.targetPos;
                  const targetScreen = toScreen(targetPos.x, targetPos.y);
                  const tx = targetScreen.x + offsetX;
                  const ty = targetScreen.y + offsetY;
                  ctx.strokeStyle = '#fcd34d';
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.moveTo(x, y - 20); 
                  ctx.lineTo(tx, ty - 20);
                  ctx.stroke();
              } else if (v.type === 'nova') {
                  const r = v.data.radius;
                  const lifePct = v.life / 20; 
                  ctx.save();
                  const pxRadius = r * TILE_HEIGHT;
                  ctx.beginPath();
                  ctx.ellipse(x, y, pxRadius * 1.5 * (1 - lifePct + 0.2), pxRadius * 0.75 * (1 - lifePct + 0.2), 0, 0, Math.PI*2);
                  ctx.strokeStyle = `rgba(147, 51, 234, ${lifePct})`; 
                  ctx.lineWidth = 6 * lifePct;
                  ctx.stroke();
                  ctx.fillStyle = `rgba(147, 51, 234, ${lifePct * 0.2})`;
                  ctx.fill();
                  ctx.restore();
              } else if (v.type === 'impact_puff') {
                  const lifePct = v.life / 15;
                  ctx.globalAlpha = lifePct;
                  ctx.fillStyle = v.data.color;
                  ctx.font = '17px sans-serif'; // Increased size ~40% to be safe and noticeable
                  ctx.fillText(v.data.emoji, x, y);
                  ctx.globalAlpha = 1.0;
              }
          } else if (item.type === 'loot') {
              const l = item.data as Loot;
              const floatOffset = Math.sin(Date.now() * 0.005) * 10;
              ctx.font = '32px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = 'yellow';
              ctx.shadowBlur = 10;
              let emoji = '📦';
              let label = '';
              if (l.type === 'bomb') { emoji = '💣'; label = 'Bomb'; }
              else if (l.type === 'equipment' && l.data) { emoji = l.data.icon; label = l.data.name; }
              else if (l.type === 'coin') {
                  emoji = ''; 
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath();
                  ctx.arc(x, y - 10, 4, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#d97706';
                  ctx.lineWidth = 1;
                  ctx.stroke();
              }

              if (l.type !== 'coin') {
                  ctx.fillText(emoji, x, y - 20 + floatOffset);
                  
                  ctx.font = 'bold 10px sans-serif';
                  ctx.fillStyle = '#ffffff';
                  ctx.strokeStyle = '#000000';
                  ctx.lineWidth = 2;
                  ctx.strokeText(label, x, y - 45 + floatOffset);
                  ctx.fillText(label, x, y - 45 + floatOffset);
              }
              ctx.shadowBlur = 0;
          } else if (item.type === 'player') {
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.beginPath();
              ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
              ctx.fill();
              
              // Ensure Player is Opaque (reset globalAlpha/fillStyle)
              ctx.globalAlpha = 1.0;
              ctx.fillStyle = '#ffffff'; 
              ctx.font = '40px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const sprite = player.isMounted ? '🏇' : '🧙‍♂️';
              ctx.fillText(sprite, x, y - 10);
              
              const barW = 40;
              const barH = 5;
              const hpPct = Math.max(0, player.hp / player.maxHp);
              ctx.fillStyle = '#333';
              ctx.fillRect(x - barW/2, y - 45, barW, barH);
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(x - barW/2, y - 45, barW * hpPct, barH);
              const shieldPct = Math.min(1, player.shield / player.maxShield);
              if (shieldPct > 0) {
                  ctx.fillStyle = 'cyan';
                  ctx.fillRect(x - barW/2, y - 51, barW * shieldPct, 3);
              }
          } else if (item.type === 'enemy') {
              const e = item.data as Enemy;
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.beginPath();
              ctx.ellipse(x, y, 40, 20, 0, 0, Math.PI * 2); 
              ctx.fill();
              ctx.font = '64px sans-serif'; 
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.filter = e.isFrozen ? 'hue-rotate(180deg) brightness(1.2)' : 'none';
              if (e.isPhasing) ctx.globalAlpha = 0.5;
              ctx.fillText(e.type === 'caster' ? '🧙‍♀️' : '🧟', x, y - 20);
              ctx.globalAlpha = 1.0;
              ctx.filter = 'none';

              const barW = 50;
              const barH = 6;
              const hpPct = Math.max(0, e.hp / e.maxHp);
              ctx.fillStyle = 'red';
              ctx.fillRect(x - barW/2, y - 60, barW * hpPct, barH);
          } else if (item.type === 'projectile') {
              const p = item.data as Projectile;
              const config = SPELL_CONFIG[p.spellType];
              ctx.font = p.isShrapnel ? '21px sans-serif' : '32px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              let lift = 0;
              if (p.spellType === SpellType.BOMB && p.targetPos) {
                   const currentDist = getDistance(p.pos, p.targetPos);
                   lift = Math.sin(currentDist) * 20; 
              }
              ctx.shadowColor = 'black';
              ctx.shadowBlur = 5;
              ctx.fillText(config.emoji, x, y - 10 - lift);
              ctx.shadowBlur = 0;
          }
      });
      
      texts.forEach(t => {
          const screen = toScreen(t.pos.x, t.pos.y);
          const x = screen.x + offsetX;
          const y = screen.y + offsetY;
          ctx.font = 'bold 33px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 4;
          ctx.lineJoin = 'round';
          ctx.strokeText(t.text, x, y - 30);
          ctx.fillStyle = t.color;
          ctx.fillText(t.text, x, y - 30);
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.strokeText(t.text, x, y - 30);
      });

      renderMinimap(ctx, canvas.width);

      ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      rainRef.current.forEach(r => {
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - (r.length * 0.5), r.y + r.length);
      });
      ctx.stroke();
  };

  useEffect(() => {
    lastTimeRef.current = Date.now();
    const loop = (time: number) => {
      frameRef.current = requestAnimationFrame(loop);
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!isPaused && !stateRef.current.gameOver) {
          sessionTimeRef.current += dt;
      }

      update();
      render();
      if (frameRef.current % 10 === 0) {
        onUiUpdate(stateRef.current.player, stateRef.current.score, stateRef.current.gameOver, stateRef.current.activeQuest);
      }
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [onUiUpdate, isPaused]); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      inputRef.current.keys.add(e.key.toLowerCase());
      if (isPaused) return;
      const mouse = inputRef.current.mouseScreen;
      if (e.key === '1') castSpell(mouse, SpellType.FIRE);
      if (e.key === '2') castSpell(mouse, SpellType.ICE);
      if (e.key === '3') castSpell(mouse, SpellType.LIGHTNING);
      if (e.key === '4') castSpell(mouse, SpellType.WIND);
      if (e.key === '5') castSpell(mouse, SpellType.ARCANE_EXPLOSION);
      if (e.key === '6') castSpell(mouse, SpellType.TELEPORT);
      if (e.key === '7') castSpell(mouse, SpellType.BOMB);
      if (e.key === '8') {
          const p = stateRef.current.player;
          if (p.level >= LEVEL_7_UNLOCK) {
              p.isMounted = !p.isMounted;
              const msg = p.isMounted ? "Mounted!" : "Dismounted";
              addFloatingText(msg, p.pos, '#ffffff');
          }
      }
      if (e.key === '9') castSpell(mouse, SpellType.EARTH);

      if (e.key.toLowerCase() === 'q') consumePotion('health');
      if (e.key.toLowerCase() === 'w') consumePotion('mana');
      if (e.key.toLowerCase() === 'e') consumePotion('speed');
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys.delete(e.key.toLowerCase());
    };
    const handleMouseDown = (e: MouseEvent) => {
        if (isPaused) return;
        if (e.button === 0) inputRef.current.leftMouseDown = true;
        if (e.button === 2) inputRef.current.rightMouseDown = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
        if (e.button === 0) inputRef.current.leftMouseDown = false;
        if (e.button === 2) inputRef.current.rightMouseDown = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mouseScreen = { x: e.clientX, y: e.clientY };
    };
    const handleWheel = (e: WheelEvent) => {
    };
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPaused]);

  return <canvas ref={canvasRef} className="block" />;
};