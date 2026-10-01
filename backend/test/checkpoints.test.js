import {test} from 'node:test';import assert from 'node:assert/strict';
import {runAudioChunks,stableId} from '../src/audio-checkpoints.js';
import {detectChapters,reduceSummaries} from '../src/chapters.js';
import {chunkSegments} from '../src/retrieval.js';
function memoryStore(){const rows=new Map();return {rows,async init(chunks){for(const c of chunks)if(!rows.has(c.chunkIndex))rows.set(c.chunkIndex,{...c,status:'pending',attempts:0})},async list(){return [...rows.values()]},async attempt(i){rows.get(i).attempts++},async complete(i,r){Object.assign(rows.get(i),r,{status:'completed'})},async fail(i){rows.get(i).status='failed'}}}
const chunks=n=>Array.from({length:n},(_,i)=>({chunkIndex:i,startTime:i*600,endTime:(i+1)*600}));
const result=c=>({language:'tamil',segments:[{text:`chunk ${c.chunkIndex}`,start:c.startTime+1,end:c.startTime+2}]});
test('10-hour checkpoint scheduler handles 60 chunks, concurrency 2, ordered offsets',async()=>{
 const store=memoryStore();let active=0,max=0,calls=0;const progress=[];
 const r=await runAudioChunks(chunks(60),{store,concurrency:2,duration:36000,onProgress:x=>progress.push(x.currentChunk),transcribe:async c=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,1));active--;return result(c)}});
 assert.equal(calls,60);assert.equal(max,2);assert.equal(r.segments.at(-1).start,35401);assert.equal(r.totalChunks,60);assert.equal(store.rows.get(59).status,'completed');assert.equal(progress.at(-1),60);assert.deepEqual(progress,[...progress].sort((a,b)=>a-b));
});
test('only failing chunk retries, successful chunks are not repeated',async()=>{
 const store=memoryStore(),calls=new Map();await runAudioChunks(chunks(8),{store,concurrency:2,sleep:async()=>{},transcribe:async c=>{calls.set(c.chunkIndex,(calls.get(c.chunkIndex)??0)+1);if(c.chunkIndex===3&&calls.get(3)<3)throw new Error('429 rate limit');return result(c)}});
 assert.equal(calls.get(3),3);assert.equal(store.rows.get(3).attempts,3);assert.equal(calls.get(2),1);assert.equal(calls.get(4),1);
});
test('worker restart at chunk 37 never repeats completed provider calls',async()=>{
 const store=memoryStore(),source=chunks(60);await store.init(source);for(let i=0;i<36;i++)await store.complete(i,result(source[i]));const calls=[];
 const r=await runAudioChunks(source,{store,concurrency:2,transcribe:async c=>{calls.push(c.chunkIndex);return result(c)}});
 assert.equal(calls.length,24);assert.equal(Math.min(...calls),36);assert.equal(r.segments.length,60);assert.equal(r.segments[36].start,21601);
});
test('permanent failure retains previous checkpoints and later resume uses them',async()=>{
 const store=memoryStore();await assert.rejects(()=>runAudioChunks(chunks(8),{store,concurrency:1,transcribe:async c=>{if(c.chunkIndex===3)throw new Error('invalid provider input');return result(c)}}),/chunk 4\/8/);
 assert.equal(store.rows.get(2).status,'completed');assert.equal(store.rows.get(3).status,'failed');const calls=[];
 await runAudioChunks(chunks(8),{store,concurrency:1,transcribe:async c=>{calls.push(c.chunkIndex);return result(c)}});assert.deepEqual(calls,[3,4,5,6,7]);
});
test('stable IDs repeat only for same video and chunk',()=>{assert.equal(stableId('video',37),stableId('video',37));assert.notEqual(stableId('video',37),stableId('other',37));assert.notEqual(stableId('video',37),stableId('video',37,'text'))});
test('one oversized caption becomes bounded semantic text windows with no loss',()=>{
 const text=Array.from({length:10000},(_,i)=>`word${i}`).join(' ');const r=chunkSegments([{text,start:0,end:36000}],120);assert.ok(r.every(c=>c.text.split(' ').length<=120));assert.equal(r.map(c=>c.text).join(' '),text);assert.equal(r.at(-1).end,36000);
});
test('topic/chapter hierarchy and global summary never send all claims in one prompt',async()=>{
 const source=Array.from({length:600},(_,i)=>({id:`id-${i}`,text:`Topic ${i}`,start_ts:i*60,end_ts:(i+1)*60}));
 const groups=detectChapters(source);assert.equal(groups.length,75);assert.ok(groups.every(c=>c.sources.length<=8));
 const items=source.map(c=>({heading:'Claim',bullets:[{text:c.text,source_chunk_id:c.id}]}));let max=0,calls=0;
 const generate=async(type,window)=>{calls++;max=Math.max(max,window.length);return window.slice(0,3).map(c=>({heading:'Reduced',bullets:[{text:c.text,source_chunk_id:c.id}]}))};
 const r=await reduceSummaries(items,source,generate);assert.ok(r.length);assert.ok(calls>75);assert.ok(max<=8);
});
