import test from 'node:test';import assert from 'node:assert/strict';
import {sanitizeStudyItems,hasCitedItem,isPracticeItem,studyStylePrompt,PRACTICE_KIND} from '../src/summary-style.js';
import {provider} from '../src/provider.js';
test('sanitizer keeps fully-cited items and drops unsourced claims',()=>{
 const items=[{heading:'मुख्य विचार',bullets:[{text:'core idea',source_chunk_id:'c1'}]},{heading:'Hallucinated',bullets:[{text:'made up'}]},{heading:'Mixed',bullets:[{text:'real',source_chunk_id:'c1'},{text:'fake',source_chunk_id:'nope'}]}];
 const out=sanitizeStudyItems(items,new Set(['c1']));
 assert.equal(out.length,1);assert.equal(out[0].heading,'मुख्य विचार');assert.equal(hasCitedItem(out),true)});
test('sanitizer keeps exactly one practice item and strips its citations',()=>{
 const items=[{heading:'1) Point',bullets:[{text:'p',source_chunk_id:'c1'}]},{heading:'प्रैक्टिस (k की तरफ से)',kind:PRACTICE_KIND,bullets:[{text:'exercise 1',source_chunk_id:'c1'},{text:'exercise 2'}]},{heading:'Extra practice',kind:PRACTICE_KIND,bullets:[{text:'ignored'}]}];
 const out=sanitizeStudyItems(items,new Set(['c1']));
 assert.equal(out.length,2);const practice=out.find(isPracticeItem);
 assert.deepEqual(practice.bullets,[{text:'exercise 1'},{text:'exercise 2'}])});
test('practice alone is never accepted as a summary',()=>{
 const out=sanitizeStudyItems([{heading:'प्रैक्टिस (k की तरफ से)',kind:PRACTICE_KIND,bullets:[{text:'only exercises'}]}],new Set());
 assert.equal(hasCitedItem(out),false)});
test('styled prompt demands structure, citations and an unsourced practice label',()=>{
 const p=studyStylePrompt('summary');
 for(const marker of ['मुख्य विचार','उदाहरण:','निचोड़','प्रैक्टिस','source_chunk_id','Devanagari'])assert.ok(p.includes(marker),marker)});
test('mock provider emits the structured Hindi format with a clean practice item',async()=>{
 const p=provider();const chunks=[{id:'chunk-a',text:'Cells are the basic units of life',start_ts:0,end_ts:10}];
 const items=await p.generate('summary',chunks);
 assert.equal(items[0].heading,'मुख्य विचार');
 assert.ok(items.some(i=>i.heading==='निचोड़'));
 const practice=items.find(isPracticeItem);assert.ok(practice);
 assert.ok(practice.bullets.every(b=>!('source_chunk_id' in b)));
 for(const item of items.filter(i=>!isPracticeItem(i)))for(const b of item.bullets)assert.equal(typeof b.source_chunk_id,'string')});
