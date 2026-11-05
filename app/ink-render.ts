import { getStroke } from "./vendor/perfect-freehand/getStroke";
import type { Stroke } from "./learning";
// Keep stored points unchanged: rendering is independent of grading and export.
export function writingPenWidth(width:number,height:number){
  return Math.min(5,Math.max(2.4,Math.min(width,height)*2.8/144));
}
export function inkOutline(stroke: Stroke, width: number, height: number, complete = true, lineStyle: 'brush'|'pen' = 'brush') {
  return getStroke(stroke.map(p => [p.x * width, p.y * height, p.p]), {
    size: lineStyle==='pen'?writingPenWidth(width,height):5.5, thinning: lineStyle==='pen'?0:.6, smoothing: .55, streamline: .25,
    simulatePressure: false, last: complete,
  });
}
export function paintInk(ctx: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number, complete = true, lineStyle: 'brush'|'pen' = 'brush') {
  const points = inkOutline(stroke, width, height, complete,lineStyle);
  if (!points.length) return;
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath(); ctx.fillStyle = "#254d42"; ctx.fill();
}
