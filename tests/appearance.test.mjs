import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../app/theme.css',import.meta.url),'utf8');
const theme=readFileSync(new URL('../app/theme.tsx',import.meta.url),'utf8');
const layout=readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../app/study-app.tsx',import.meta.url),'utf8');
const palette=Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/g)].map(m=>[m[1],m[2]]));
function luminance(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}

test('dark core text and muted text meet WCAG AA on core surfaces',()=>{for(const surface of ['paper','white','sage'])for(const text of ['ink','muted'])assert.ok(contrast(palette[text],palette[surface])>=4.5,`${text} on ${surface}`);assert.ok(contrast('#f3fff5','#315e46')>=4.5);});
test('appearance is persistent, system-aware and scoped outside student records',()=>{assert.match(theme,/storageKey="chinese-os-appearance"/);assert.match(theme,/defaultTheme="light" enableSystem/);assert.match(theme,/\['system', 'light', 'dark'\]/);assert.doesNotMatch(theme,/saveDraft|putEvents|fetch\(|openStore/);});
test('controls are accessible and mounted inside existing study preferences',()=>{assert.match(theme,/<fieldset/);assert.match(theme,/<legend>/);assert.match(theme,/aria-pressed=/);assert.match(theme,/disabled=\{!mounted\}/);assert.match(app,/<AppearanceControls\/>/);assert.match(layout,/<AppearanceProvider>/);assert.match(layout,/suppressHydrationWarning/);});
test('appearance does not invert teaching imagery or alter tone semantics',()=>{assert.doesNotMatch(css,/filter\s*:\s*invert/);assert.doesNotMatch(css,/canvas\s*\{|\.tone-\d/);});
