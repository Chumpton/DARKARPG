import { TILE_WIDTH, TILE_HEIGHT } from '../constants';
import { Vector2 } from '../types';

/**
 * Converts World coordinates (Cartesian) to Screen coordinates (Isometric).
 * @param x World X
 * @param y World Y
 * @returns Screen X, Y
 */
export const toScreen = (x: number, y: number): Vector2 => {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2),
  };
};

/**
 * Converts Screen coordinates to World coordinates (Cartesian).
 * @param screenX Screen X (relative to map origin)
 * @param screenY Screen Y (relative to map origin)
 * @returns World X, Y
 */
export const toWorld = (screenX: number, screenY: number): Vector2 => {
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  
  // Algebraic inversion of the toScreen formula
  // sx = (wx - wy) * hw
  // sy = (wx + wy) * hh
  //
  // wx - wy = sx / hw
  // wx + wy = sy / hh
  // -----------------
  // 2wx = sx/hw + sy/hh
  // 2wy = sy/hh - sx/hw

  const wx = (screenX / halfW + screenY / halfH) / 2;
  const wy = (screenY / halfH - screenX / halfW) / 2;

  return { x: wx, y: wy };
};

export const getDistance = (v1: Vector2, v2: Vector2): number => {
  return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
};

export const normalize = (v: Vector2): Vector2 => {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
};