import {test} from 'node:test';import assert from 'node:assert/strict';import request from 'supertest';import jwt from 'jsonwebtoken';
import app,{processingProgress} from '../src/app.js';import {pool} from '../src/db.js';import {stageMessage} from '../src/processing-status.js';
const secret='test-secret-of-at-least-32-characters';process.env.JWT_SECRET=secret;
const token=jwt.sign({sub:'11111111-1111-4111-8111-111111111111'},secret);
test('owner-only status route returns real durable chunk counts and clean stage message',async()=>{
 const old=pool.query;pool.query=async sql=>sql.includes('FROM videos v JOIN notebooks')?{rows:[{id:'video',status:'transcribing',processing_stage:'transcribing_audio',completed_audio_chunks:25,total_audio_chunks:60,error:null}]}:{rows:[{artifact_count:0,has_transcript:false,has_chunks:false}]};
 try{assert.equal((await request(app).get('/videos/video/status')).status,401);const r=await request(app).get('/videos/video/status').set('Authorization',`Bearer ${token}`);assert.equal(r.status,200);assert.equal(r.body.completedChunks,25);assert.equal(r.body.totalChunks,60);assert.equal(r.body.currentStage,'transcribing_audio');assert.match(r.body.message,/25\/60/);assert.equal(r.body.progress.percent,6)}finally{pool.query=old}
});
test('partial audio checkpoints advance progress without implying finished transcript',()=>{assert.equal(processingProgress('transcribing',0,false,false,36,60).percent,10);assert.equal(stageMessage({processing_stage:'splitting_audio'}),'Splitting audio')});
