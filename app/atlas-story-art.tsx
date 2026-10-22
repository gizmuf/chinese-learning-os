"use client";
import { useId } from "react";
import sun from "../public/characters/日.json";
import wood from "../public/characters/木.json";
import { arc, glyphPoint, morph, resample, smooth, type XY } from "./atlas-story-motion";

const treeWorld: XY[][] = [
  [[244,150],[265,136],[290,128],[320,123],[350,128],[375,136],[396,150]],
  [[321,99],[317,144],[323,190],[318,233],[320,282]],
  [[320,265],[304,282],[277,293],[245,296]],
  [[320,265],[337,282],[365,293],[395,296]],
];
const treeSketch: XY[][] = [
  [[242,139],[280,160],[320,183],[360,160],[398,139]],
  [[320,99],[320,282]],
  [[320,251],[289,277],[252,293]],
  [[320,251],[351,277],[388,293]],
];
// The same four strands are retained through every frame. Stroke order is
// taught separately by Hanzi Writer, never inferred from this morph.
const sunWorld: XY[][] = [arc(-180,-270), arc(-180,0), [[319,195],[321,195]], arc(90,0)];
const geometry = {
  wood: { data: wood, world: treeWorld.map(p => resample(p)), sketch: treeSketch.map(p => resample(p)), final: wood.medians.map(p => resample(p.map(glyphPoint))) },
  sun: { data: sun, world: sunWorld.map(p => resample(p)), sketch: sunWorld.map(p => resample(p)), final: sun.medians.map(p => resample(p.map(glyphPoint))) },
};
export default function AtlasStoryArt({ id, progress, label, reducedMotion }: {
  id: "sun" | "wood"; progress: number; label: string; reducedMotion: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const p = reducedMotion ? (progress < 1 / 3 ? 0 : progress < 2 / 3 ? .48 : 1) : progress;
  const world = 1 - smooth((p - .12) / .28);
  const sketch = smooth((p - .12) / .30);
  const modern = smooth((p - .52) / .36);
  const ink = smooth((p - .84) / .12);
  const { data, ...paths } = geometry[id];
  return <svg className="story-canvas" viewBox="0 0 640 390" role="img" aria-label={label}>
    <defs>
      <radialGradient id={`${uid}-halo`}><stop stopColor={id === "sun" ? "#f6d98f" : "#dce8d5"} stopOpacity=".8"/><stop offset="1" stopColor="#f9f7ef" stopOpacity="0"/></radialGradient>
      <linearGradient id={`${uid}-leaf`} x2=".8" y2="1"><stop stopColor="#b4c39a"/><stop offset="1" stopColor="#658873"/></linearGradient>
      <linearGradient id={`${uid}-sun`} x2="0" y2="1"><stop stopColor="#edcf82"/><stop offset="1" stopColor="#d99d5d"/></linearGradient>
    </defs>
    <ellipse cx="320" cy="196" rx="220" ry="170" fill={`url(#${uid}-halo)`} opacity={world}/>
    <g opacity={world}>
      <path d="M0 332Q90 284 185 315T370 318T640 297V390H0Z" fill="#e7ebdf"/>
      <path d="M0 357Q123 308 261 340T490 337T640 341V390H0Z" fill="#dce4d5"/>
      <path d="M46 115H112M69 105H125M486 104H557M506 94H578" stroke="#c9d5ca" strokeWidth="2" strokeLinecap="round"/>
      {id === "wood" ? <>
        <ellipse cx="320" cy="301" rx="103" ry="9" fill="#8c9d7a" opacity=".13"/>
        <path d="M319 270C293 275 292 265 291 248L297 174L316 122L335 165L343 250Q346 272 319 270Z" fill="#8d7456"/>
        <path d="M312 217L275 180M326 205L368 161M318 166L288 131" fill="none" stroke="#8d7456" strokeWidth="10" strokeLinecap="round"/>
        <path d="M220 168C189 142 214 107 244 107C235 66 282 47 309 68C334 30 381 57 381 85C423 78 447 121 421 146C445 186 400 213 371 196C345 222 309 215 290 197C254 220 217 199 220 168Z" fill={`url(#${uid}-leaf)`}/>
        <path d="M248 118Q263 85 295 99M326 88Q357 68 375 109M365 159Q397 141 406 165" fill="none" stroke="#eff3e3" strokeWidth="3" opacity=".45" strokeLinecap="round"/>
        <g fill="#91a680" opacity=".6"><ellipse cx="229" cy="252" rx="6" ry="12" transform="rotate(-35 229 252)"/><ellipse cx="411" cy="234" rx="5" ry="11" transform="rotate(40 411 234)"/></g>
      </> : <>
        <circle cx="320" cy="195" r="73" fill={`url(#${uid}-sun)`}/>
        {Array.from({ length: 12 }, (_, i) => <path key={i} d="M320 88V76" transform={`rotate(${i * 30} 320 195)`} stroke="#d7b16e" strokeWidth="2.5" strokeLinecap="round"/>) }
        <path d="M94 320L170 263L236 320M411 323L489 266L565 323" fill="#cedaca"/>
      </>}
    </g>
    <g opacity={modern * .65} stroke="#cbd6c6" fill="none" strokeWidth="1">
      <rect x="170" y="45" width="300" height="300" rx="2"/>
      <path d="M320 45V345M170 195H470M170 45L470 345M470 45L170 345" strokeDasharray="4 7"/>
    </g>
    <g fill="none" stroke={id === "wood" ? "#456754" : "#a5753c"} strokeLinecap="round" strokeLinejoin="round" opacity={(id === "wood" ? .10 + .90 * sketch : 1) * (1 - ink)}>
      {paths.world.map((start, i) => {
        const intermediate = start.map((v, j) => [v[0] + (paths.sketch[i][j][0] - v[0]) * sketch, v[1] + (paths.sketch[i][j][1] - v[1]) * sketch] as XY);
        return <path key={i} d={morph(intermediate, paths.final[i], modern)} strokeWidth={id === "sun" && i === 2 ? 9 - modern * 2 : 5 + modern * 2} opacity={id === "sun" && i === 2 ? sketch : 1}/>;
      })}
    </g>
    <g opacity={ink} fill="#365e4e" transform="translate(170 45) scale(0.29296875) translate(0 900) scale(1 -1)">
      {data.strokes.map((d, i) => <path d={d} key={i}/>)}
    </g>
  </svg>;
}
