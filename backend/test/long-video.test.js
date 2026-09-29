import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artifactWindows} from '../src/worker.js';
import {youtubeId} from '../src/captions.js';
test('long video windows cover all chunks in order without dropping citations',()=>{
 const chunks=Array.from({length:21},(_,i)=>({id:`source-${i}`,start_ts:i*120}));
 const windows=artifactWindows(chunks,8);
 assert.deepEqual(windows.map(w=>w.length),[8,8,5]);
 assert.deepEqual(windows.flat().map(c=>c.id),chunks.map(c=>c.id));
 assert.equal(artifactWindows(chunks.slice(0,3)).length,1);
});
test('YouTube transcript fallback accepts watch, short and share URLs',()=>{
 for(const url of ['https://www.youtube.com/watch?v=abcdefghijk','https://www.youtube.com/shorts/abcdefghijk','https://youtu.be/abcdefghijk'])assert.equal(youtubeId(url),'abcdefghijk');
});

test('large course summary needs thirteen broad windows',()=>{
 const chunks=Array.from({length:395},(_,i)=>({id:`source-${i}`,start_ts:i*40}));
 const windows=artifactWindows(chunks,32);
 assert.equal(windows.length,13);
 assert.deepEqual(windows.flat().map(x=>x.id),chunks.map(x=>x.id));
});
