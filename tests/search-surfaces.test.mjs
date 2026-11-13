import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('all seven study lookup surfaces provide the same explicit language toggle',()=>{
 for(const name of ['study-app','atlas','atlas-studio','chunk-library','video-study','lesson05-writing-picker','often-confused']){
  const source=readFileSync(`app/${name}.tsx`,'utf8');
  assert.match(source,/useState<SearchMode>\('pinyin'\)/,name+' defaults to pinyin');
  assert.match(source,/<SearchModeToggle value={searchMode}/,name+' exposes mode control');
  assert.match(source,/rankSearch|searchScore/,name+' uses shared matcher');
 }
});
test('search control is keyboard accessible, labelled, and does not submit its enclosing form',()=>{
 const source=readFileSync('app/search-mode-toggle.tsx','utf8');
 assert.match(source,/role="group" aria-label="Search language"/);
 assert.match(source,/type="button"/);
 assert.match(source,/aria-pressed={value===mode}/);
 assert.match(source,/Pinyin \/ 汉字/);
});
