import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const result=await build({entryPoints:['app/reference-time-model.ts'],bundle:true,platform:'node',format:'esm',write:false});const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('the eight source clocks retain their exact minute values and conventional forms',()=>{
 assert.deepEqual([...m.referenceClockPresets],[420,485,495,510,520,525,610,870]);
 assert.equal(m.referenceClockCaption(485).hanzi,'上午八点零五分');assert.equal(m.referenceClockCaption(495).hanzi,'上午八点一刻');assert.equal(m.referenceClockCaption(510).hanzi,'上午八点半');assert.equal(m.referenceClockCaption(525).hanzi,'上午八点三刻');assert.equal(m.referenceClockCaption(870).hanzi,'下午两点半');assert.equal(m.referenceClockCaption(870,true).hanzi,'十四点三十分');
 for(let n=0;n<1440;n++){const value=m.referenceClockCaption(n);assert.ok(value.hanzi&&value.pinyin&&/^\d\d:\d\d$/.test(value.en));}
});
test('the static source date is Tuesday and navigation clamps dates across leap/year/month boundaries',()=>{
 const value=m.referenceCalendarCaption('2026-11-03');assert.equal(value.hanzi,'今天是二零二六年十一月三号，星期二。');assert.ok(value.pinyin.includes('èr líng èr liù'));assert.ok(value.en.includes('Tuesday'));
 assert.equal(m.referenceCalendarMonth('2026-01-31',1),'2026-02-28');assert.equal(m.referenceCalendarMonth('2024-01-31',1),'2024-02-29');assert.equal(m.referenceCalendarMonth('2026-12-03',1),'2027-01-03');assert.throws(()=>m.referenceCalendarCaption('2026-02-30'));
});
