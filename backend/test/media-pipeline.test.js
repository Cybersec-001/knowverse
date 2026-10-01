import {test} from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import {parseVtt} from '../src/captions.js';
import {withPreparedAudio,probeDuration} from '../src/media-pipeline.js';
import {classifyProcessingError} from '../src/media-errors.js';
import {validateTimedSegments,chunkSegments} from '../src/retrieval.js';

test('SRT and VTT preserve source timestamps',()=>{
 assert.deepEqual(parseVtt('1\n00:00:01,000 --> 00:00:02,500\nनमस्ते\n\n2\n00:00:03,000 --> 00:00:04,000\nவணக்கம்').map(x=>[x.start,x.end]),[[1,2.5],[3,4]]);
 assert.equal(parseVtt('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHi')[0].text,'Hi');
});
test('YouTube block is categorized without revealing stderr',()=>{const err=classifyProcessingError(new Error('Sign in to confirm you are not a bot. Use cookies-from-browser'));assert.equal(err.code,'YOUTUBE_BOT_BLOCK');assert.doesNotMatch(err.message,/cookies-from-browser/)});
test('synthetic 77-minute audio splits into eight chunks, keeps offsets, cleans temporary directory',async()=>{
 const audio=execFileSync(ffmpegPath,['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','4651','-acodec','libmp3lame','-b:a','8k','-f','mp3','pipe:1'],{timeout:30000,maxBuffer:8_000_000});
 let dirName,filesCount,offset=0,segments=[];
 await withPreparedAudio(audio,async({dir,files,duration})=>{dirName=dir;filesCount=files.length;assert.ok(duration>4650&&duration<4653);for(const file of files){const localDuration=await probeDuration(`${dir}/${file}`);segments.push({start:offset,end:offset+Math.min(1,localDuration),text:`chunk ${segments.length+1}`});offset+=localDuration}validateTimedSegments(segments,duration);return null});
 assert.equal(filesCount,8);assert.ok(segments.at(-1).start>=4200);assert.equal(chunkSegments(segments,2).length,8);
 await assert.rejects(import('node:fs/promises').then(fs=>fs.access(dirName)),/ENOENT/);
});
test('cleanup on failure',async()=>{const audio=execFileSync(ffmpegPath,['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','2','-f','mp3','pipe:1']);let dirName;await assert.rejects(()=>withPreparedAudio(audio,async({dir})=>{dirName=dir;throw new Error('synthetic failure')}),/synthetic failure/);await assert.rejects(import('node:fs/promises').then(fs=>fs.access(dirName)),/ENOENT/)});
test('77-minute synthetic media transcribes each of eight chunks independently with offsets',async()=>{
 const old=process.env.GROQ_API_KEY,prior=global.fetch;process.env.GROQ_API_KEY='test-only';let calls=0;
 global.fetch=async()=>({ok:true,json:async()=>({language:'tamil',segments:[{start:1,end:2,text:`வணக்கம் ${++calls}`}]})});
 try{const {transcribePreparedMedia}=await import('../src/media-pipeline.js');const audio=execFileSync(ffmpegPath,['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','4651','-acodec','libmp3lame','-b:a','8k','-f','mp3','pipe:1'],{timeout:30000,maxBuffer:8_000_000});const progress=[];const r=await transcribePreparedMedia(audio,{onProgress:x=>progress.push(x)});assert.equal(calls,8);assert.equal(r.totalChunks,8);assert.equal(r.language,'tamil');assert.ok(r.segments[7].start>4200);assert.equal(progress.at(-1).currentChunk,8)}finally{global.fetch=prior;if(old)process.env.GROQ_API_KEY=old;else delete process.env.GROQ_API_KEY}
});
test('ten-hour synthetic audio is disk-based, splits to about 60 chunks and cleans up',async()=>{
 const {mkdtemp,rm,access}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const outer=await mkdtemp(join(tmpdir(),'knowverse-ten-hour-test-')),path=join(outer,'ten-hours.mp3');let dirName;
 try{
  execFileSync(ffmpegPath,['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','36000','-acodec','libmp3lame','-b:a','8k',path],{timeout:120000});
  await withPreparedAudio(path,async({dir,chunks,duration})=>{dirName=dir;assert.ok(chunks.length>=60&&chunks.length<=61);assert.equal(chunks[59].startTime,35400);assert.ok(duration>=36000&&duration<36001);assert.ok(chunks.every(c=>c.endTime-c.startTime<=600))});
  await assert.rejects(()=>access(dirName),/ENOENT/);
 }finally{await rm(outer,{recursive:true,force:true})}
});
