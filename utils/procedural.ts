

import { ROAD_COLORS, FOLIAGE_VARIANTS } from '../constants';

// Simple deterministic pseudo-random number generator
export function pseudoRandom(x: number, y: number): number {
    const vector = { x: x + 0.123, y: y + 0.456 };
    let n = Math.sin(vector.x * 12.9898 + vector.y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

// 2D Noise function for larger features (like road paths)
function noise(x: number, y: number): number {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const u = x - i;
    const v = y - j;

    const n00 = pseudoRandom(i, j);
    const n01 = pseudoRandom(i, j + 1);
    const n10 = pseudoRandom(i + 1, j);
    const n11 = pseudoRandom(i + 1, j + 1);

    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;

    return nx0 * (1 - v) + nx1 * v;
}

export interface TileData {
    x: number;
    y: number;
    isRoad: boolean;
    roadColor?: string;
    hasTree: boolean;
    treeVariant: string; // Emoji
    hasFoliage: boolean;
    foliageVariant: string;
}

export const getTileAt = (x: number, y: number): TileData => {
    // Road Generation
    const scale = 0.08;
    const n = Math.sin(x * scale) + Math.cos(y * scale);
    const isRoad = Math.abs(n) < 0.15; // Thin threshold for roads

    let roadColor = undefined;
    if (isRoad) {
        const regionNoise = noise(x * 0.02, y * 0.02);
        const colorIdx = Math.floor(regionNoise * ROAD_COLORS.length);
        roadColor = ROAD_COLORS[Math.min(colorIdx, ROAD_COLORS.length - 1)];
    }

    // TREE GENERATION (Grid Based for Spacing)
    // We divide the world into chunks of 5x5.
    // In each chunk, we pick ONE tile to have a tree.
    // This guarantees trees are roughly spaced out by at least a few tiles.
    const GRID_SIZE = 5;
    const chunkX = Math.floor(x / GRID_SIZE);
    const chunkY = Math.floor(y / GRID_SIZE);
    
    // Hash the chunk coordinates to get a deterministic random position within the chunk
    const chunkHash = pseudoRandom(chunkX, chunkY);
    const offsetX = Math.floor(chunkHash * GRID_SIZE);
    // Use a slightly different seed for Y
    const chunkHashY = pseudoRandom(chunkX + 123, chunkY + 456);
    const offsetY = Math.floor(chunkHashY * GRID_SIZE);

    const targetX = chunkX * GRID_SIZE + offsetX;
    const targetY = chunkY * GRID_SIZE + offsetY;

    const isTargetTile = x === targetX && y === targetY;
    
    // Tree variant based on tile coord
    const treeVariant = pseudoRandom(x, y) > 0.5 ? '🌲' : '🌳';
    
    // Density check: 
    // Was 75% spawn rate (> 0.25). 
    // We want half the trees, so we target ~35-40%. 
    const treeDensityCheck = pseudoRandom(chunkX * 0.7, chunkY * 1.3);
    const shouldSpawnChunkTree = treeDensityCheck > 0.65; // ~35% chance

    // Trees cannot spawn on roads
    const hasTree = isTargetTile && !isRoad && shouldSpawnChunkTree;

    // FOLIAGE GENERATION
    // Can appear anywhere except roads and trees
    let hasFoliage = false;
    let foliageVariant = '';
    
    if (!isRoad && !hasTree) {
        const foliageRng = pseudoRandom(x * 1.5, y * 1.5);
        // Reduced chance from 30% to 15% (must be > 0.85)
        if (foliageRng > 0.85) { 
            hasFoliage = true;
            const fIdx = Math.floor(foliageRng * 100) % FOLIAGE_VARIANTS.length;
            foliageVariant = FOLIAGE_VARIANTS[fIdx];
        }
    }

    return {
        x,
        y,
        isRoad,
        roadColor,
        hasTree,
        treeVariant,
        hasFoliage,
        foliageVariant
    };
};
