

import React, { useState, useEffect, useRef } from 'react';
import { Player, SpellType, EquipmentItem, EquipmentSlot, Quest } from '../types';
import { SPELL_CONFIG, LEVEL_7_UNLOCK, POTION_CONFIG, RARITY_COLORS, TALENT_CONFIG, BASE_STAT_CONFIG } from '../constants';

interface HUDProps {
  player: Player;
  score: number;
  gameOver: boolean;
  onRestart: () => void;
  onUpgradeTalent: (talent: 'pyroclasm' | 'multishot' | 'force' | 'velocity') => void;
  onUpgradeBaseStat: (stat: 'vitality' | 'power' | 'haste' | 'swiftness') => void;
  onUsePotion: (type: 'health' | 'mana' | 'speed') => void;
  onEquip: (item: EquipmentItem) => void;
  onUnequip: (slot: EquipmentSlot) => void;
  isPaused: boolean;
  activeQuest: Quest;
}

const DraggableItem: React.FC<{
    id: string;
    position: { x: number, y: number, scale: number };
    onMove: (id: string, dx: number, dy: number) => void;
    onScale: (id: string, delta: number) => void;
    isLocked: boolean;
    className?: string;
    children: React.ReactNode;
}> = ({ id, position, onMove, onScale, isLocked, className, children }) => {
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isLocked) return;
        isDragging.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        e.stopPropagation();
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (isLocked) return;
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        onScale(id, delta);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;
            startPos.current = { x: e.clientX, y: e.clientY };
            onMove(id, dx, dy);
        };
        const handleMouseUp = () => {
            isDragging.current = false;
        };
        if (!isLocked) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [id, onMove, isLocked]);

    return (
        <div 
            className={`${className} ${!isLocked ? 'ring-2 ring-yellow-400 cursor-move bg-black/20 hover:bg-black/40' : ''}`}
            style={{ 
                position: 'absolute', 
                left: position.x, 
                top: position.y,
                transform: `scale(${position.scale})`,
                transformOrigin: 'top left',
                transition: isDragging.current ? 'none' : 'transform 0.1s' 
            }}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
            {children}
            {!isLocked && <div className="absolute -top-4 left-0 text-[10px] bg-yellow-400 text-black px-1 font-bold whitespace-nowrap">{id} (Scroll to Resize)</div>}
        </div>
    );
};


export const HUD: React.FC<HUDProps> = ({ player, score, gameOver, onRestart, onUpgradeTalent, onUpgradeBaseStat, onUsePotion, onEquip, onUnequip, isPaused, activeQuest }) => {
  const [showSpells, setShowSpells] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [hoveredItem, setHoveredItem] = useState<{item: EquipmentItem, x: number, y: number} | null>(null);

  const [positions, setPositions] = useState<{ [key: string]: { x: number, y: number, scale: number } }>({
      healthOrb: { x: 20, y: window.innerHeight - 180, scale: 1.35 }, 
      potionBar: { x: 190, y: window.innerHeight - 155, scale: 0.85 }, 
      manaOrb: { x: window.innerWidth - 180, y: window.innerHeight - 180, scale: 1.35 }, 
      actionDock: { x: window.innerWidth - 450, y: window.innerHeight - 200, scale: 0.9 }, 
      xpBar: { x: 260, y: window.innerHeight - 45, scale: 1 }, 
      quest: { x: 30, y: 30, scale: 1 } 
  });

  useEffect(() => {
    if (isPaused) {
        setShowSpells(true);
        setShowStats(true);
        setShowInventory(true);
    } else {
        setShowSpells(false);
        setShowStats(false);
        setShowInventory(false);
    }
  }, [isPaused]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key.toLowerCase() === 'm') {
              setIsEditMode(prev => !prev);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMove = (id: string, dx: number, dy: number) => {
      setPositions(prev => ({
          ...prev,
          [id]: { ...prev[id], x: prev[id].x + dx, y: prev[id].y + dy }
      }));
  };

  const handleScale = (id: string, delta: number) => {
    setPositions(prev => ({
        ...prev,
        [id]: { ...prev[id], scale: Math.max(0.5, Math.min(2.0, prev[id].scale + delta)) }
    }));
  };

  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const manaPercent = Math.max(0, (player.mana / player.maxMana) * 100);
  const xpPercent = Math.max(0, (player.xp / player.toNextLevel) * 100);
  const shieldPercent = Math.max(0, (player.shield / player.maxShield));
  const questPercent = Math.min(100, Math.max(0, (activeQuest.current / activeQuest.target) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
           <h1 className="text-8xl font-black text-yellow-500 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] tracking-[1rem] opacity-80" style={{ WebkitTextStroke: '2px black'}}>
             PAUSED
           </h1>
        </div>
      )}

      {isEditMode && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-2 font-bold z-50 animate-pulse border-2 border-white pointer-events-auto text-center shadow-lg rounded">
              <div>UI UNLOCKED - DRAG TO MOVE - SCROLL TO RESIZE</div>
              <div className="text-sm font-normal">PRESS M TO LOCK</div>
          </div>
      )}

      {/* Spell Mastery Modal */}
      {showSpells && (
          <div className="absolute top-10 right-10 pointer-events-auto z-40">
              <div className="bg-neutral-900/95 border-4 border-double border-yellow-700 p-6 rounded-2xl w-[400px] shadow-2xl relative">
                  {!isPaused && (
                      <button onClick={() => setShowSpells(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold">✕</button>
                  )}
                  <h2 className="text-3xl text-yellow-500 font-black mb-4 text-center border-b-2 border-yellow-900 pb-2 uppercase tracking-widest">Spell Mastery</h2>
                  
                  <div className="mb-4 text-center text-gray-300">
                      Points Available: <span className="text-yellow-400 font-bold text-2xl ml-2">{player.statPoints}</span>
                  </div>

                  <div className="space-y-4">
                      {/* Pyroclasm */}
                      <div className="flex justify-between items-center bg-red-950/40 p-3 rounded border border-red-900">
                          <div>
                              <div className="text-red-400 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">🔥</span> Pyroclasm</div>
                              <div className="text-xs text-gray-400 ml-8">Adds Explosive AoE. Rank {player.talents.pyroclasm}</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeTalent('pyroclasm')}
                             className="bg-red-800 disabled:bg-gray-700 disabled:text-gray-500 hover:bg-red-700 text-white w-8 h-8 rounded border border-red-600 font-bold shadow"
                          >
                              +
                          </button>
                      </div>

                      {/* Multishot */}
                      <div className="flex justify-between items-center bg-teal-950/40 p-3 rounded border border-teal-900">
                          <div>
                              <div className="text-teal-400 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">🏹</span> Multishot</div>
                              <div className="text-xs text-gray-400 ml-8">Adds Projectiles. Rank {player.talents.multishot}</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeTalent('multishot')}
                             className="bg-teal-800 disabled:bg-gray-700 disabled:text-gray-500 hover:bg-teal-700 text-white w-8 h-8 rounded border border-teal-600 font-bold shadow"
                          >
                              +
                          </button>
                      </div>

                       {/* Force */}
                       <div className="flex justify-between items-center bg-orange-950/40 p-3 rounded border border-orange-900">
                          <div>
                              <div className="text-orange-400 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">🪨</span> Force</div>
                              <div className="text-xs text-gray-400 ml-8">Adds Knockback. Rank {player.talents.force}</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeTalent('force')}
                             className="bg-orange-800 disabled:bg-gray-700 disabled:text-gray-500 hover:bg-orange-700 text-white w-8 h-8 rounded border border-orange-600 font-bold shadow"
                          >
                              +
                          </button>
                      </div>

                      {/* Velocity */}
                      <div className="flex justify-between items-center bg-blue-950/40 p-3 rounded border border-blue-900">
                          <div>
                              <div className="text-blue-400 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">💨</span> Velocity</div>
                              <div className="text-xs text-gray-400 ml-8">Proj Speed +{Math.round(player.talents.velocity * TALENT_CONFIG.VELOCITY.speedPerRank * 100)}%</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeTalent('velocity')}
                             className="bg-blue-800 disabled:bg-gray-700 disabled:text-gray-500 hover:bg-blue-700 text-white w-8 h-8 rounded border border-blue-600 font-bold shadow"
                          >
                              +
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Base Attributes Modal */}
      {showStats && (
          <div className="absolute top-10 right-[420px] pointer-events-auto z-40">
              <div className="bg-neutral-900/95 border-4 border-double border-gray-600 p-6 rounded-2xl w-[350px] shadow-2xl relative">
                  {!isPaused && (
                      <button onClick={() => setShowStats(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold">✕</button>
                  )}
                  <h2 className="text-3xl text-gray-300 font-black mb-4 text-center border-b-2 border-gray-700 pb-2 uppercase tracking-widest">Base Attributes</h2>
                  
                  <div className="mb-4 text-center text-gray-300">
                      Points Available: <span className="text-yellow-400 font-bold text-2xl ml-2">{player.statPoints}</span>
                  </div>

                  <div className="space-y-4">
                      {/* Vitality */}
                      <div className="flex justify-between items-center bg-gray-800/40 p-3 rounded border border-gray-700">
                          <div>
                              <div className="text-red-300 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">❤️</span> Vitality</div>
                              <div className="text-xs text-gray-400 ml-8">Max HP +10. Rank {player.baseStats.vitality}</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeBaseStat('vitality')}
                             className="bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 hover:bg-gray-600 text-white w-8 h-8 rounded border border-gray-500 font-bold shadow"
                          >
                              +
                          </button>
                      </div>

                      {/* Power */}
                      <div className="flex justify-between items-center bg-gray-800/40 p-3 rounded border border-gray-700">
                          <div>
                              <div className="text-purple-300 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">⚔️</span> Power</div>
                              <div className="text-xs text-gray-400 ml-8">Base Dmg +2. Rank {player.baseStats.power}</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeBaseStat('power')}
                             className="bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 hover:bg-gray-600 text-white w-8 h-8 rounded border border-gray-500 font-bold shadow"
                          >
                              +
                          </button>
                      </div>

                      {/* Haste */}
                      <div className="flex justify-between items-center bg-gray-800/40 p-3 rounded border border-gray-700">
                          <div>
                              <div className="text-yellow-300 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">⚡</span> Haste</div>
                              <div className="text-xs text-gray-400 ml-8">Cooldown -2%. Rank {player.baseStats.haste}</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeBaseStat('haste')}
                             className="bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 hover:bg-gray-600 text-white w-8 h-8 rounded border border-gray-500 font-bold shadow"
                          >
                              +
                          </button>
                      </div>

                      {/* Swiftness */}
                      <div className="flex justify-between items-center bg-gray-800/40 p-3 rounded border border-gray-700">
                          <div>
                              <div className="text-green-300 font-bold uppercase tracking-wide text-sm flex items-center gap-2"><span className="text-2xl">👢</span> Swiftness</div>
                              <div className="text-xs text-gray-400 ml-8">Speed +2%. Rank {player.baseStats.swiftness}</div>
                          </div>
                          <button 
                             disabled={player.statPoints === 0}
                             onClick={() => onUpgradeBaseStat('swiftness')}
                             className="bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 hover:bg-gray-600 text-white w-8 h-8 rounded border border-gray-500 font-bold shadow"
                          >
                              +
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}


      {/* Character / Inventory Modal */}
      {showInventory && (
          <div className="absolute top-10 left-10 pointer-events-auto z-40">
              <div className="bg-neutral-900/95 border-4 border-double border-gray-500 p-4 rounded-2xl w-[500px] shadow-2xl relative flex gap-4">
                   {!isPaused && (
                      <button onClick={() => setShowInventory(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold">✕</button>
                  )}
                  
                  {/* Left Column: Equipment */}
                  <div className="w-1/3 flex flex-col items-center gap-4 border-r border-gray-700 pr-4">
                      <h2 className="text-xl text-gray-300 font-black uppercase tracking-widest mb-2">Equipped</h2>
                      
                      {/* Slots */}
                      {(['HEAD', 'BODY', 'WEAPON', 'ACCESSORY'] as EquipmentSlot[]).map(slot => {
                          const item = player.equipment[slot];
                          return (
                              <div 
                                key={slot}
                                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-4xl bg-black/60 cursor-pointer relative group ${item ? '' : 'border-dashed border-gray-700'}`}
                                style={{ borderColor: item ? RARITY_COLORS[item.rarity] : undefined }}
                                onClick={() => onUnequip(slot)}
                                onMouseEnter={(e) => {
                                    if(item) setHoveredItem({ item, x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredItem(null)}
                              >
                                  {item ? item.icon : <span className="text-xs text-gray-600">{slot}</span>}
                              </div>
                          );
                      })}
                  </div>

                  {/* Right Column: Inventory Grid */}
                  <div className="w-2/3">
                      <h2 className="text-xl text-gray-300 font-black uppercase tracking-widest mb-4">Inventory</h2>
                      <div className="grid grid-cols-4 gap-2 h-[300px] overflow-y-auto content-start">
                          {/* Potions */}
                          <div className="w-12 h-16 bg-black/40 rounded-xl border border-gray-700 flex items-center justify-center relative">
                              <span className="text-3xl">{POTION_CONFIG.HEALTH.emoji}</span> <span className="absolute bottom-0 right-1 text-[10px] font-bold">{player.potions.health}</span>
                          </div>
                          <div className="w-12 h-16 bg-black/40 rounded-xl border border-gray-700 flex items-center justify-center relative">
                              <span className="text-3xl">{POTION_CONFIG.MANA.emoji}</span> <span className="absolute bottom-0 right-1 text-[10px] font-bold">{player.potions.mana}</span>
                          </div>
                          <div className="w-12 h-16 bg-black/40 rounded-xl border border-gray-700 flex items-center justify-center relative">
                              <span className="text-3xl">{POTION_CONFIG.SPEED.emoji}</span> <span className="absolute bottom-0 right-1 text-[10px] font-bold">{player.potions.speed}</span>
                          </div>
                          <div className="w-12 h-16 bg-black/40 rounded-xl border border-gray-700 flex items-center justify-center relative">
                              <span className="text-3xl">💣</span> <span className="absolute bottom-0 right-1 text-[10px] font-bold">{player.bombAmmo}</span>
                          </div>

                          {/* Equipment Items */}
                          {player.inventory.map(item => (
                              <div 
                                key={item.id}
                                className="w-12 h-16 bg-black/40 rounded-xl border flex items-center justify-center text-3xl cursor-pointer hover:bg-white/10 group relative"
                                style={{ borderColor: RARITY_COLORS[item.rarity] }}
                                onClick={() => onEquip(item)}
                                onMouseEnter={(e) => setHoveredItem({ item, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredItem(null)}
                              >
                                  {item.icon}
                              </div>
                          ))}

                          {/* Empty Slots Filler */}
                          {[...Array(Math.max(0, 16 - player.inventory.length - 4))].map((_, i) => (
                              <div key={i} className="w-12 h-16 bg-black/20 rounded-xl border border-gray-800"></div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Fixed Tooltip Render (Above all else) */}
      {hoveredItem && (
        <div 
            className="fixed pointer-events-none z-[60] bg-black border border-gray-600 p-2 rounded w-48 shadow-xl"
            style={{ left: hoveredItem.x + 15, top: hoveredItem.y + 15 }}
        >
            <div className="font-bold text-sm mb-1" style={{ color: RARITY_COLORS[hoveredItem.item.rarity] }}>{hoveredItem.item.name}</div>
            <div className="text-[10px] text-gray-400">
                {Object.entries(hoveredItem.item.stats).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                        <span className="capitalize">{k}:</span>
                        <span className="text-white">+{k === 'speed' ? Math.round(v*100)+'%' : v}</span>
                    </div>
                ))}
                <div className="text-green-500 mt-1 italic">Click to Equip/Unequip</div>
            </div>
        </div>
      )}
        
      {/* QUEST PANEL (Moved top left) */}
      <DraggableItem id="quest" position={positions.quest} onMove={handleMove} onScale={handleScale} isLocked={!isEditMode}>
        <div className="bg-black/80 border border-yellow-700/50 p-2 rounded pointer-events-auto w-64 shadow-lg">
            <h3 className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-1">Current Quest</h3>
            <div className="text-white font-bold text-sm mb-1">{activeQuest.description}</div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-yellow-500" style={{ width: `${questPercent}%` }}></div>
            </div>
            <div className="text-[10px] text-gray-400 text-right">{activeQuest.current} / {activeQuest.target}</div>
        </div>
      </DraggableItem>

      {/* HEALTH ORB */}
      <DraggableItem id="healthOrb" position={positions.healthOrb} onMove={handleMove} onScale={handleScale} isLocked={!isEditMode}>
        <div className="relative w-32 h-32 z-20 pointer-events-auto group">
            <div className="w-full h-full rounded-full bg-black border-[6px] border-[#2a2a2a] overflow-visible relative shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center box-border ring-1 ring-gray-600">
                <div className="absolute inset-0 rounded-full border-4 border-black/50 pointer-events-none z-10"></div>
                <div className="w-full h-full rounded-full overflow-hidden relative">
                    <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-950 via-red-600 to-red-500 transition-all duration-300 ease-out"
                        style={{ height: `${hpPercent}%` }}
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/40 pointer-events-none"></div>
                    <div className="absolute top-3 left-6 w-10 h-6 bg-white/10 rounded-full blur-sm transform -rotate-45"></div>
                </div>

                {shieldPercent > 0 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100">
                        <path 
                            d="M 50,5 A 45,45 0 0 1 50,95" 
                            fill="none" 
                            stroke="#000" 
                            strokeWidth="4" 
                            strokeOpacity="0.5"
                            className="drop-shadow-sm"
                        />
                        <path 
                            d="M 50,5 A 45,45 0 0 1 50,95" 
                            fill="none" 
                            stroke="cyan" 
                            strokeWidth="3" 
                            strokeLinecap="round"
                            strokeDasharray={`${shieldPercent * 142} 200`} 
                            className="filter drop-shadow-[0_0_2px_cyan]"
                        />
                    </svg>
                )}

                <div className="absolute z-30 text-white font-black text-3xl drop-shadow-[0_3px_3px_rgba(0,0,0,1)] pointer-events-none" style={{ WebkitTextStroke: '1px black' }}>
                   {Math.ceil(player.hp)}
                </div>
            </div>
        </div>
      </DraggableItem>

      {/* POTION BAR */}
      <DraggableItem id="potionBar" position={positions.potionBar} onMove={handleMove} onScale={handleScale} isLocked={!isEditMode}>
        <div className="flex flex-col gap-2 pointer-events-auto">
            <div 
                className={`relative w-12 h-12 rounded border-2 flex items-center justify-center text-2xl bg-black/80 shadow-lg cursor-pointer hover:bg-gray-800 transition-all ${player.potions.health > 0 ? 'border-red-900/50 opacity-100' : 'border-gray-800 opacity-50 grayscale'}`}
                onClick={() => onUsePotion('health')}
            >
                {POTION_CONFIG.HEALTH.emoji}
                <span className="absolute -top-2 -left-2 bg-gray-900 border border-gray-600 text-gray-300 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-mono">Q</span>
                <span className="absolute bottom-0 right-0 text-white text-xs font-bold px-1 bg-red-950/80 rounded-tl shadow-sm">{player.potions.health}</span>
            </div>
            <div 
                className={`relative w-12 h-12 rounded border-2 flex items-center justify-center text-2xl bg-black/80 shadow-lg cursor-pointer hover:bg-gray-800 transition-all ${player.potions.mana > 0 ? 'border-blue-900/50 opacity-100' : 'border-gray-800 opacity-50 grayscale'}`}
                onClick={() => onUsePotion('mana')}
            >
                {POTION_CONFIG.MANA.emoji}
                <span className="absolute -top-2 -left-2 bg-gray-900 border border-gray-600 text-gray-300 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-mono">W</span>
                <span className="absolute bottom-0 right-0 text-white text-xs font-bold px-1 bg-blue-950/80 rounded-tl shadow-sm">{player.potions.mana}</span>
            </div>
             <div 
                className={`relative w-12 h-12 rounded border-2 flex items-center justify-center text-2xl bg-black/80 shadow-lg cursor-pointer hover:bg-gray-800 transition-all ${player.potions.speed > 0 ? 'border-green-900/50 opacity-100' : 'border-gray-800 opacity-50 grayscale'}`}
                onClick={() => onUsePotion('speed')}
            >
                {POTION_CONFIG.SPEED.emoji}
                <span className="absolute -top-2 -left-2 bg-gray-900 border border-gray-600 text-gray-300 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-mono">E</span>
                <span className="absolute bottom-0 right-0 text-white text-xs font-bold px-1 bg-green-950/80 rounded-tl shadow-sm">{player.potions.speed}</span>
            </div>
        </div>
      </DraggableItem>

      {/* MANA ORB */}
      <DraggableItem id="manaOrb" position={positions.manaOrb} onMove={handleMove} onScale={handleScale} isLocked={!isEditMode}>
        <div className="relative w-32 h-32 z-20 pointer-events-auto group">
             <div className="w-full h-full rounded-full bg-black border-[6px] border-[#2a2a2a] overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center box-border ring-1 ring-gray-600">
                <div className="absolute inset-0 rounded-full border-4 border-black/50 pointer-events-none z-10"></div>
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-950 via-blue-600 to-blue-500 transition-all duration-300 ease-out"
                    style={{ height: `${manaPercent}%` }}
                />
                 <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/40 pointer-events-none"></div>
                 <div className="absolute top-3 left-6 w-10 h-6 bg-white/10 rounded-full blur-sm transform -rotate-45"></div>

                 <div className="absolute z-30 text-white font-black text-3xl drop-shadow-[0_3px_3px_rgba(0,0,0,1)] pointer-events-none" style={{ WebkitTextStroke: '1px black' }}>
                   {Math.floor(player.mana)}
                </div>
            </div>
        </div>
      </DraggableItem>

      {/* ACTION DOCK (SPELL BAR + TALENTS + BAG) */}
      <DraggableItem id="actionDock" position={positions.actionDock} onMove={handleMove} onScale={handleScale} isLocked={!isEditMode}>
            <div className="flex flex-col items-end gap-1">
                {/* Top Row: Talents (Left) | Bag+Coins (Right) */}
                <div className="flex items-end gap-2 pointer-events-auto mb-1 w-full justify-between">
                    {/* Talents + Stats (Swapped to Left) */}
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setShowSpells(!showSpells)}
                            className={`flex flex-col items-center justify-center p-1 rounded font-bold shadow-lg border transition-all transform hover:scale-105 text-xs w-16 h-12 ${player.statPoints > 0 ? 'bg-yellow-900/80 border-yellow-500 animate-pulse text-white' : 'bg-gray-800/90 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        >
                            <span className="text-lg leading-none mb-1">📜</span>
                            <span className="text-[9px] uppercase">Spells</span>
                        </button>
                        <button 
                            onClick={() => setShowStats(!showStats)}
                            className={`flex flex-col items-center justify-center p-1 rounded font-bold shadow-lg border transition-all transform hover:scale-105 text-xs w-16 h-12 ${player.statPoints > 0 ? 'bg-blue-900/80 border-blue-500 animate-pulse text-white' : 'bg-gray-800/90 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        >
                            <span className="text-lg leading-none mb-1">📊</span>
                            <span className="text-[9px] uppercase">Stats</span>
                        </button>
                    </div>

                    {/* Coins + Bag (Right Column) */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded border border-gray-700 text-yellow-400 font-bold text-lg w-full justify-center"> {/* w-full justify-center */}
                            <div className="w-4 h-4 rounded-full bg-yellow-500 border border-yellow-300"></div>
                            {player.coins}
                        </div>
                        <button 
                            onClick={() => setShowInventory(!showInventory)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded font-bold shadow-lg border transition-all transform hover:scale-105 bg-gray-800/90 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 text-xs w-full justify-center"
                        >
                            <span className="text-base">🎒</span>
                            <span className="">Bag</span>
                        </button>
                    </div>
                </div>

                {/* Spell Grid */}
                <div className="bg-black/80 p-2 rounded border border-gray-700 grid grid-cols-4 gap-2 pointer-events-auto shadow-2xl backdrop-blur-sm ring-1 ring-black">
                {/* Row 1 */}
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.FIRE) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.FIRE ? 'border-yellow-600 bg-red-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.FIRE) ? '🔥' : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">1</div>
                </div>
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.ICE) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.ICE ? 'border-blue-500 bg-blue-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.ICE) ? '❄️' : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">2</div>
                </div>
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.LIGHTNING) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.LIGHTNING ? 'border-yellow-500 bg-yellow-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.LIGHTNING) ? '⚡' : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">3</div>
                </div>
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.WIND) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.WIND ? 'border-teal-500 bg-teal-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.WIND) ? '💨' : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">4</div>
                </div>
                {/* Row 2 */}
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.ARCANE_EXPLOSION) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.ARCANE_EXPLOSION ? 'border-purple-600 bg-purple-900 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.ARCANE_EXPLOSION) ? '💥' : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">5</div>
                </div>
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.TELEPORT) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.TELEPORT ? 'border-purple-400 bg-purple-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.TELEPORT) ? '✨' : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">6</div>
                </div>
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.BOMB) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.BOMB ? 'border-orange-600 bg-orange-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.BOMB) ? (player.bombAmmo > 0 ? '💣' : <span className="opacity-30 grayscale">💣</span>) : '🔒'}
                        {player.knownSpells.includes(SpellType.BOMB) && <div className="absolute bottom-0 right-0 bg-red-700 text-white text-[10px] font-bold px-1 rounded-tl shadow">{player.bombAmmo}</div>}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">7</div>
                </div>
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${player.isMounted ? 'border-green-600 bg-green-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                    {player.level >= LEVEL_7_UNLOCK ? (player.isMounted ? '🏇' : '🐎') : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">8</div>
                </div>
                {/* Row 3 - New Earth Spell */}
                <div className="flex flex-col items-center group cursor-pointer relative">
                    <div className={`w-14 h-14 rounded border-2 flex items-center justify-center text-3xl transition-all relative overflow-hidden ${!player.knownSpells.includes(SpellType.EARTH) ? 'bg-gray-900 border-gray-700 opacity-50 grayscale' : player.currentSpell === SpellType.EARTH ? 'border-orange-900 bg-orange-950 shadow-inner' : 'border-gray-800 bg-black/60 opacity-60 hover:opacity-100 hover:border-gray-500'}`}>
                        {player.knownSpells.includes(SpellType.EARTH) ? '🪨' : '🔒'}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">9</div>
                </div>
                </div>
            </div>
      </DraggableItem>

      {/* XP BAR */}
      <DraggableItem id="xpBar" position={positions.xpBar} onMove={handleMove} onScale={handleScale} isLocked={!isEditMode}>
        <div className="flex flex-col items-center justify-end w-[600px] relative z-10 pointer-events-auto">
            <div className="absolute -top-8 flex items-center justify-center pointer-events-none z-30">
                 <div className="text-yellow-500 font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase tracking-[0.2em]">
                     LEVEL {player.level}
                 </div>
            </div>
            <div className="w-full h-8 bg-black border border-gray-800 relative overflow-hidden shadow-lg group">
                <div 
                    className="h-full bg-gradient-to-r from-yellow-900 via-yellow-600 to-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all duration-300"
                    style={{ width: `${xpPercent}%` }}
                />
                <div className="absolute inset-0 grid grid-cols-10 pointer-events-none opacity-20">
                    {[...Array(9)].map((_, i) => <div key={i} className="border-r border-black h-full"></div>)}
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-widest uppercase">
                    {Math.floor(player.xp)} / {player.toNextLevel} XP
                </div>
            </div>
        </div>
      </DraggableItem>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-neutral-800 p-8 rounded-lg border-2 border-red-900 text-center max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.5)]">
            <h2 className="text-6xl mb-4">💀</h2>
            <h1 className="text-4xl font-black text-red-600 mb-4 tracking-widest uppercase">YOU DIED</h1>
            <p className="text-gray-300 mb-8 text-lg">
                Survived until level <span className="text-white font-bold">{player.level}</span><br/>
            </p>
            <button 
              onClick={onRestart}
              className="px-8 py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded shadow-lg transition-all transform hover:scale-105 uppercase tracking-widest border border-red-600"
            >
              Resurrect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
