import type { FamilyStory } from "./atlas-family-stories-data";
// Original memory illustrations, not historical glyph reconstructions.
export default function MoreFamilyScene({scene,label}:{scene:FamilyStory["scene"];label:string}){
 return <svg className="workshop-stage family-story-art" viewBox="0 0 640 320" role="img" aria-label={label}>
  <path d="M65 272H575" stroke="#c8d2bd" strokeWidth="2"/>
  {scene==="grave"?<>
   <path d="M145 274Q180 246 246 271T415 268Q470 246 530 274" fill="#dae2ce"/>
   <path d="M325 268V162Q325 125 355 125Q386 125 386 162V268Z" fill="#bac6b9" stroke="#789486" strokeWidth="3"/>
   <path d="M344 160H366M344 176H366" stroke="#8ba191" strokeWidth="3" strokeLinecap="round"/>
   <g fill="#b3c7ab" stroke="#79967b" strokeWidth="3"><path d="M185 267V163"/><path d="M185 108C115 108 125 197 185 189C248 195 253 106 185 108Z"/></g>
   <g className="family-flower-arrive"><path d="M410 265L426 223M416 249Q438 232 433 253Z" stroke="#789780" fill="#adc4ab" strokeWidth="3"/><g fill="#d9c99d">{[0,72,144,216,288].map(a=><ellipse key={a} cx="426" cy="215" rx="7" ry="12" transform={`rotate(${a} 426 225)`}/>)}</g><circle cx="426" cy="225" r="5" fill="#ae8b52"/></g>
  </>:scene==="desert"?<>
   <circle cx="457" cy="91" r="31" fill="#dfc58e"/>
   <path d="M75 230Q208 102 330 213Q447 134 567 229V273H75Z" fill="#ddd1ac"/>
   <path className="family-dune-drift" d="M75 266Q239 174 359 247Q441 186 567 267V274H75Z" fill="#c6b98e"/>
   <g stroke="#759b92" strokeWidth="3"><rect x="156" y="190" width="29" height="66" rx="8" fill="#e6ece0"/><path d="M159 230Q170 224 182 231V248Q182 252 177 253H165Q159 253 159 248Z" fill="#9abeb4"/><path d="M163 183H178V192H163Z" fill="#7e9e91"/></g>
   <path className="family-sand-wind" d="M280 142Q334 121 392 144M322 163Q375 143 420 160" stroke="#b8ad85" strokeWidth="2" fill="none"/>
  </>:scene==="membrane"?<>
   <path d="M236 152H403L383 267H254Z" fill="#dce7dc" stroke="#8da89a" strokeWidth="3"/>
   <ellipse cx="319" cy="152" rx="84" ry="23" fill="#b2c9bd" stroke="#8da89a" strokeWidth="3"/>
   <g className="family-film-settle"><path d="M205 122Q320 102 433 122L411 165Q319 181 229 164Z" fill="#a9c9bd" fillOpacity=".48" stroke="#7da89a" strokeWidth="2"/><path d="M233 131Q319 116 408 132M245 148Q321 135 397 148" stroke="#f9fcf6" strokeWidth="2" fill="none"/></g>
  </>:scene==="recruit"?<>
   <rect x="272" y="84" width="115" height="132" rx="8" fill="#d9e2cd" stroke="#849c7b" strokeWidth="3"/>
   <path d="M294 110H365M294 125H344M303 183L319 198L352 161" stroke="#6b907c" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="M292 218V270M368 218V270" stroke="#9d906e" strokeWidth="5"/>
   {[150,222,460].map((x,i)=><g key={x} className="family-volunteer-arrive" style={{animationDelay:`${i*.25}s`}} fill={i===1?"#a4bca7":"#bccbb4"} stroke="#759583" strokeWidth="3"><circle cx={x} cy="191" r="15"/><path d={`M${x-20} 261V229Q${x} 204 ${x+20} 229V261Z`}/></g>)}
  </>:scene==="trace"?<>
   <rect x="184" y="73" width="228" height="196" rx="7" fill="#ded4b6" stroke="#ab9b76" strokeWidth="2"/>
   <path d="M214 226L268 146L310 204L341 161L384 226Z" stroke="#91a792" fill="#c2cdb4" strokeWidth="3"/>
   <g className="family-tracing-paper"><rect x="205" y="86" width="228" height="196" rx="7" fill="#fafcf6" fillOpacity=".6" stroke="#bdcbb6" strokeWidth="2"/><path className="family-traced-line" d="M235 239L289 159L331 217L362 174L405 239Z" fill="none" stroke="#597f6c" strokeWidth="4" pathLength="1"/></g>
   <g className="family-pencil-trace" transform="translate(376 152) rotate(30)"><path d="M0-37H13V33L6 47L0 33Z" fill="#c9b17d" stroke="#a48c5d" strokeWidth="2"/><path d="M0 33L6 47L13 33Z" fill="#557663"/></g>
  </>:<>
   {[218,419].map((x,i)=><g key={x}><circle cx={x} cy="139" r="24" fill="#c9c9ac"/><path d={`M${x-38} 269V201Q${x} 163 ${x+38} 201V269Z`} fill={i?"#a5c0ae":"#c0cdb3"}/></g>)}
   <path d="M257 205L280 215L303 205V250L280 261L257 250Z" fill="#d8c897" stroke="#a99366" strokeWidth="2"/>
   <path d="M280 217V257M263 222L274 227M287 226L297 220" stroke="#a99366" strokeWidth="2"/>
   <path d="M389 95Q370 81 366 64Q365 46 383 46Q395 46 400 57Q408 43 422 47Q443 56 431 74L400 102Z" fill="#e0e7d6" stroke="#9bb5a1" strokeWidth="2"/>
   <path className="family-admiration-heart" d="M302 125Q275 105 288 89Q301 78 314 95Q327 77 341 89Q354 105 327 125L314 137Z" fill="#c8b58a"/>
  </>}
 </svg>;
}
