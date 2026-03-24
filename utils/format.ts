/**
 * utils/format.ts — Display formatting helpers
 */

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatAngle(deg: number): string {
  return `${Math.round(deg)}°`;
}

export function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return String(xp);
}

/** Returns a 0-1 ratio for a value clamped within [min, max] */
export function normalise(val: number, min: number, max: number): number {
  return Math.max(0, Math.min((val - min) / (max - min), 1));
}

/** Maps a 0-1 progress to an HP colour (green → yellow → red) */
export function hpColor(pct: number): string {
  if (pct > 0.5) return '#38D970';
  if (pct > 0.25) return '#F5C842';
  return '#E0352A';
}
