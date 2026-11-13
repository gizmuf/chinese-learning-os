"use client";
import { useId } from "react";
import moon from "../public/characters/月.json";
import water from "../public/characters/水.json";
import fire from "../public/characters/火.json";
import mountain from "../public/characters/山.json";
import type { StoryId } from "./atlas-stories";
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
function illustration(data: typeof water, world: XY[][]) {
  return { data, world: world.map(p => resample(p)), sketch: world.map(p => resample(p)), final: data.medians.map(p => resample(p.map(glyphPoint))) };
}
const geometry = {
  moon: illustration(moon, [
    [[306,96],[275,120],[258,162],[258,208],[275,250],[306,274]],
    [[306,96],[287,140],[286,190],[303,236],[337,259],[306,274]],
    [[278,163],[293,169]], [[277,205],[300,214]],
  ]),
  water: illustration(water, [
    [[238,162],[256,170],[263,187],[250,206]],
    [[320,90],[302,118],[336,155],[309,195],[330,230],[307,273],[316,305]],
    [[388,133],[377,152],[392,173]],
    [[365,208],[383,226],[375,247],[391,271]],
  ]),
  fire: illustration(fire, [
    [[245,198],[256,221],[261,238]], [[389,175],[379,199],[372,217]],
    [[328,91],[319,139],[286,179],[275,221],[286,257],[318,284]],
    [[328,91],[337,132],[321,174],[356,202],[368,244],[351,272],[318,284]],
  ]),
  mountain: illustration(mountain, [
    [[320,88],[320,278]], [[211,270],[243,157],[280,278],[320,278]], [[320,278],[358,180],[407,278]],
  ]),
  wood: { data: wood, world: treeWorld.map(p => resample(p)), sketch: treeSketch.map(p => resample(p)), final: wood.medians.map(p => resample(p.map(glyphPoint))) },
  sun: { data: sun, world: sunWorld.map(p => resample(p)), sketch: sunWorld.map(p => resample(p)), final: sun.medians.map(p => resample(p.map(glyphPoint))) },
};
export default function AtlasStoryArt({ id, progress, label, reducedMotion }: {
  id: StoryId; progress: number; label: string; reducedMotion: boolean;
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
      </> : id === "sun" ? <>
        <circle cx="320" cy="195" r="73" fill={`url(#${uid}-sun)`}/>
        {Array.from({ length: 12 }, (_, i) => <path key={i} d="M320 88V76" transform={`rotate(${i * 30} 320 195)`} stroke="#d7b16e" strokeWidth="2.5" strokeLinecap="round"/>) }
        <path d="M94 320L170 263L236 320M411 323L489 266L565 323" fill="#cedaca"/>
      </> : id === "moon" ? <>
        <path d="M306 96C237 115 238 253 306 274Q325 275 337 259C281 226 270 152 306 96Z" fill="#d6cda4"/>
        <path d="M306 96C237 115 238 253 306 274" fill="none" stroke="#c0b58c" strokeWidth="2"/>
        {[ [195,115],[440,144],[381,70],[164,228],[470,250] ].map(([x,y],i)=><path key={i} d={`M${x-4} ${y}h8M${x} ${y-4}v8`} stroke="#b8c6c3" strokeWidth="2"/>)}
      </> : id === "water" ? <>
        <path d="M303 77Q270 114 308 153T291 223T281 326H363Q339 270 361 234T350 158T340 77Z" fill="#accbca"/>
        <path d="M319 86Q288 117 324 155T309 224T312 312M337 88Q312 120 342 158" fill="none" stroke="#edf5ea" strokeWidth="3"/>
        <g fill="#b9cebf"><ellipse cx="250" cy="191" rx="25" ry="50"/><ellipse cx="384" cy="238" rx="21" ry="48"/></g>
      </> : id === "fire" ? <>
        <ellipse cx="320" cy="303" rx="87" ry="9" fill="#ceb69c" opacity=".3"/>
        <path d="M328 91C344 142 313 161 350 196C397 244 359 287 318 284C266 283 252 239 282 191C313 146 314 130 328 91Z" fill="#d49b65"/>
        <path d="M323 177C307 216 346 225 334 278C290 271 288 237 323 177Z" fill="#efd496"/>
        <path d="M245 198Q270 214 261 238Q240 223 245 198M389 175Q397 198 372 217Q375 193 389 175" fill="#ddb777"/>
      </> : <>
        <path d="M126 306L243 157L282 210L320 88L373 227L407 178L519 306Z" fill="#b6c5ab"/>
        <path d="M235 167L243 157L282 210L276 228ZM320 88L357 187L332 165L318 189L299 155Z" fill="#f3f2dd"/>
        <path d="M126 306L243 157L223 275L320 88L302 306M373 227L407 178L393 306" fill="#7e9b83" opacity=".5"/>
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
