import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const units=['a','b'].flatMap(part=>JSON.parse(readFileSync(`data/grammar-hsk3-${part}.json`,'utf8')));
test('HSK3 grammar contains twelve original trilingual thematic units with meaningful exercises',()=>{
 assert.equal(units.length,12);const ids=new Set();let cards=0,exercises=0;
 const unique=id=>{assert.equal(typeof id,'string');assert.ok(id.length);assert.ok(!ids.has(id),id);ids.add(id);};
 const copy=value=>{for(const locale of['en','fr','ru'])assert.ok(value[locale]?.trim());};
 for(const unit of units){unique(unit.id);copy(unit.title);assert.ok(unit.cards.length>=3);for(const card of unit.cards){cards++;unique(card.id);assert.ok(card.pattern.trim());copy(card.explanation);assert.match(card.example.hanzi,/[\u3400-\u9fff]/);assert.ok(card.example.pinyin);copy(card.example.meaning);assert.ok(card.exercises.length>=2);for(const ex of card.exercises){exercises++;unique(ex.id);copy(ex.prompt);copy(ex.explanation);assert.ok(ex.sentence.includes('___'),ex.id);assert.equal(new Set(ex.options).size,ex.options.length);assert.ok(ex.options.length>=3);assert.ok(Number.isInteger(ex.answer)&&ex.answer>=0&&ex.answer<ex.options.length);}}}
 assert.ok(cards>=36);assert.ok(exercises>=72);
});
test('Correct option positions vary and localized prompts never disappear',()=>{const positions=new Set();for(const unit of units)for(const card of unit.cards)for(const ex of card.exercises){positions.add(ex.answer);assert.equal(ex.sentence.split('___').length,2);for(const lang of['en','fr','ru'])assert.ok(ex.prompt[lang].length>5);}assert.equal(positions.size,3);});
