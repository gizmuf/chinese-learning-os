// All story geometry shares the same coordinate system. The last frame uses
// the bundled glyph outlines; intermediate frames are a teaching illustration.
export type XY = readonly [number, number];
export const STORY_DURATION = 18000;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const stageAt = (progress: number) => Math.min(2, Math.floor(clamp(progress) * 3));
export const progressForAudio = (stage: number, time: number, duration: number) =>
  (stage + (duration > 0 ? clamp(time / duration) : 0)) / 3;

export function resample(points: readonly XY[], count = 48): XY[] {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = lengths[lengths.length - 1];
  if (!total) return Array.from({ length: count }, () => points[0]);
  return Array.from({ length: count }, (_, i) => {
    const distance = total * i / (count - 1);
    let j = 1;
    while (j < lengths.length - 1 && lengths[j] < distance) j++;
    const t = (distance - lengths[j - 1]) / (lengths[j] - lengths[j - 1] || 1);
    return [points[j - 1][0] + (points[j][0] - points[j - 1][0]) * t, points[j - 1][1] + (points[j][1] - points[j - 1][1]) * t];
  });
}
export function morph(from: readonly XY[], to: readonly XY[], t: number): string {
  return from.map((p, i) => `${i ? "L" : "M"}${(p[0] + (to[i][0] - p[0]) * t).toFixed(2)},${(p[1] + (to[i][1] - p[1]) * t).toFixed(2)}`).join(" ");
}
export const glyphPoint = (p: readonly number[]): XY => [170 + p[0] * 300 / 1024, 45 + (900 - p[1]) * 300 / 1024];
export function arc(start: number, end: number, radius = 73): XY[] {
  return Array.from({ length: 25 }, (_, i) => {
    const a = (start + (end - start) * i / 24) * Math.PI / 180;
    return [320 + radius * Math.cos(a), 195 + radius * Math.sin(a)];
  });
}
