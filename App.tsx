

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Player, SpellType, EquipmentItem } from './types';
import { PLAYER_START_HP, PLAYER_START_MANA, PLAYER_BASE_SPEED, PLAYER_START_SHIELD, QUEST_CONFIG, POTION_START_CHARGES } from './constants';

const initialPlayerState: Player = {
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
  talents: {
    pyroclasm: 0,
    multishot: 0,
    force: 0,
    velocity: 0,
  },
  baseStats: {
    vitality: 0,
    power: 0,
    haste: 0,
    swiftness: 0
  },
  potions: {
    health: POTION_START_CHARGES,
    mana: POTION_START_CHARGES,
    speed: POTION_START_CHARGES
  },
  potionKillCounter: 0,
  activeBuffs: {
    speedBoost: 0
  },
  equipment: {
      HEAD: null,
      BODY: null,
      WEAPON: null,
      ACCESSORY: null
  },
  inventory: []
};

export type GameActions = {
  upgradeTalent: (talent: 'pyroclasm' | 'multishot' | 'force' | 'velocity') => void;
  upgradeBaseStat: (stat: 'vitality' | 'power' | 'haste' | 'swiftness') => void;
  usePotion: (type: 'health' | 'mana' | 'speed') => void;
  equipItem: (item: EquipmentItem) => void;
  unequipItem: (slot: 'HEAD' | 'BODY' | 'WEAPON' | 'ACCESSORY') => void;
};

function App() {
  const [playerState, setPlayerState] = useState<Player>(initialPlayerState);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameId, setGameId] = useState(0); 
  const [isPaused, setIsPaused] = useState(false);
  
  // Quest State
  const [activeQuest, setActiveQuest] = useState({
      id: 'quest_1',
      type: 'kill' as const,
      description: `Kill ${QUEST_CONFIG.baseKillTarget} Enemies`,
      target: QUEST_CONFIG.baseKillTarget,
      current: 0,
      rewardXp: QUEST_CONFIG.baseRewardXp,
      rewardCoins: QUEST_CONFIG.baseRewardCoins
  });

  // Ref to hold actions that can be called on the running game
  const gameActionsRef = useRef<GameActions>({ 
      upgradeTalent: () => {}, 
      upgradeBaseStat: () => {},
      usePotion: () => {},
      equipItem: () => {},
      unequipItem: () => {}
  });

  const handleUiUpdate = useCallback((player: Player, score: number, isGameOver: boolean, currentQuest: any) => {
    setPlayerState({ ...player });
    setScore(score);
    setGameOver(isGameOver);
    if(currentQuest) setActiveQuest(currentQuest);
  }, []);

  const handleRestart = () => {
    setGameOver(false);
    setScore(0);
    setPlayerState(initialPlayerState);
    setGameId(prev => prev + 1);
    setIsPaused(false);
  };

  const handleUpgradeTalent = (talent: 'pyroclasm' | 'multishot' | 'force' | 'velocity') => {
    gameActionsRef.current.upgradeTalent(talent);
  };

  const handleUpgradeBaseStat = (stat: 'vitality' | 'power' | 'haste' | 'swiftness') => {
    gameActionsRef.current.upgradeBaseStat(stat);
  };

  const handleUsePotion = (type: 'health' | 'mana' | 'speed') => {
      if (!isPaused) {
        gameActionsRef.current.usePotion(type);
      }
  };

  const handleEquip = (item: EquipmentItem) => {
      gameActionsRef.current.equipItem(item);
  }

  const handleUnequip = (slot: 'HEAD' | 'BODY' | 'WEAPON' | 'ACCESSORY') => {
      gameActionsRef.current.unequipItem(slot);
  }

  // Global Pause/Escape Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key.toLowerCase() === 'p' || e.key === 'Escape') && !gameOver) {
            setIsPaused(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-900 select-none font-sans">
      <GameCanvas 
        key={gameId} 
        onUiUpdate={handleUiUpdate} 
        gameActionsRef={gameActionsRef}
        isPaused={isPaused}
      />
      <HUD 
        player={playerState} 
        score={score} 
        gameOver={gameOver} 
        onRestart={handleRestart}
        onUpgradeTalent={handleUpgradeTalent}
        onUpgradeBaseStat={handleUpgradeBaseStat}
        onUsePotion={handleUsePotion}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        isPaused={isPaused}
        activeQuest={activeQuest}
      />
      
      <div className="absolute top-2 right-2 text-white/20 text-xs pointer-events-none md:hidden">
        Desktop recommended (Mouse/Keyboard)
      </div>
    </div>
  );
}

export default App;
