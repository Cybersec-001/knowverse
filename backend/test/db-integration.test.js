import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';import {vector} from '@electric-sql/pglite-pgvector';
import {pool} from '../src/db.js';import {redis} from '../src/queue.js';import {checkpointStore,runAudioChunks} from '../src/audio-checkpoints.js';
import {processVideo} from '../src/worker.js';import {parseVtt} from '../src/captions.js';
const user='11111111-1111-4111-8111-111111111111',book='22222222-2222-4222-8222-222222222222',video='33333333-3333-4333-8333-333333333333';
test('additive migration twice, durable resume, direct caption worker, cited hierarchy and status persistence',async()=>{
 const db=new PGlite({extensions:{vector}});const originalQuery=pool.query,originalConnect=pool.connect;let conn,oldPublish;
 const schema=(await readFile(new URL('../src/schema.sql',import.meta.url),'utf8')).replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;','');
 try{
  await db.exec(schema);await db.exec(schema);
  pool.query=(sql,args)=>db.query(sql,args);pool.connect=async()=>({query:(sql,args)=>db.query(sql,args),release(){}});
  conn=redis();oldPublish=conn.publish;conn.publish=async()=>1;
  await db.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[user,'test@example.com','test']);
  await db.query('INSERT INTO notebooks(id,user_id,title) VALUES($1,$2,$3)',[book,user,'Test']);
  await db.query('INSERT INTO videos(id,notebook_id,title,source_type,source_url,status) VALUES($1,$2,$3,$4,$5,$6)',[video,book,'Ten hours','youtube','https://youtu.be/abcdefghijk','failed']);
  const chunks=Array.from({length:60},(_,i)=>({chunkIndex:i,startTime:i*600,endTime:(i+1)*600}));
  const store=checkpointStore(video);let count=0;
  await store.init(chunks);for(let i=0;i<36;i++)await store.complete(i,{language:'tamil',segments:[{text:'saved',start:i*600+1,end:i*600+2}]});
  await runAudioChunks(chunks,{store,transcribe:async c=>{count++;return {segments:[{text:'new',start:c.startTime+1,end:c.startTime+2}]}}});assert.equal(count,24);
  assert.equal((await db.query("SELECT count(*)::int AS total FROM audio_chunks WHERE status='completed'")).rows[0].total,60);
  for(const raw of ['1\n00:00:01,000 --> 00:00:02,000\nFirst chapter\n\n2\n00:00:03,000 --> 00:00:04,000\nSecond chapter','WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nCaption'])assert.ok(parseVtt(raw).length);
  const raw='WEBVTT\n\n'+Array.from({length:90},(_,i)=>{const ts=n=>`${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}.000`;return `${ts(i*120)} --> ${ts(i*120+60)}\n${('Educational topic '+i+' ').repeat(40)}`}).join('\n\n');
  await db.query('INSERT INTO video_caption_uploads(video_id,raw_vtt) VALUES($1,$2)',[video,raw]);
  // No network/provider call is needed for direct uploaded SRT/VTT + mock generation.
  const old=global.fetch;global.fetch=async()=>{throw new Error('Unexpected external request for direct captions')};
  try{const result=await processVideo(video);assert.ok(result.chunks>=90)}finally{global.fetch=old}
  const v=(await db.query('SELECT status,transcript_indexed,processing_stage,transcript_source FROM videos WHERE id=$1',[video])).rows[0];assert.equal(v.status,'ready');assert.equal(v.transcript_indexed,true);assert.equal(v.transcript_source,'uploaded_captions');assert.equal(v.processing_stage,'ready');
  const chapters=(await db.query('SELECT * FROM chapters')).rows;assert.ok(chapters.length>1);assert.ok(chapters.every(c=>Array.isArray(c.summary)&&c.summary.length));
  assert.equal((await db.query('SELECT count(*)::int AS total FROM artifacts')).rows[0].total,4);
  assert.equal((await processVideo(video)).resumed,true);
 }finally{pool.query=originalQuery;pool.connect=originalConnect;if(conn){conn.publish=oldPublish;conn.disconnect()}await db.close()}
});
