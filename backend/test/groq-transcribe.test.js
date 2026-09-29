import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transcribeAudio,transcribeYoutubeWithGroq,MAX_AUDIO_SECONDS,CHUNK_SECONDS,MAX_AUDIO_CHUNKS} from '../src/groq-transcribe.js';

test('Whisper sends multilingual audio with timestamped segments and preserves Tamil',async()=>{
 const old=process.env.GROQ_API_KEY,before=global.fetch;process.env.GROQ_API_KEY='fake-test-key';let request;
 global.fetch=async(url,options)=>{request={url,options};return {ok:true,json:async()=>({language:'tamil',segments:[{text:'வணக்கம்',start:1.5,end:2.5}]})}};
 try{const result=await transcribeAudio(Buffer.from('mock audio'),'lesson.mp3',600);assert.deepEqual(result,{language:'tamil',segments:[{text:'வணக்கம்',start:601.5,end:602.5}]});assert.equal(request.url,'https://api.groq.com/openai/v1/audio/transcriptions');assert.equal(request.options.body.get('model'),'whisper-large-v3');assert.equal(request.options.body.get('response_format'),'verbose_json');assert.equal(request.options.body.get('language'),null);assert.equal(request.options.body.get('timestamp_granularities[]'),'segment')}finally{global.fetch=before;if(old)process.env.GROQ_API_KEY=old;else delete process.env.GROQ_API_KEY}
});
test('Groq fallback rejects invalid or long source duration before downloading',async()=>{
 const old=process.env.GROQ_API_KEY;process.env.GROQ_API_KEY='fake-test-key';
 try{for(const duration of [0,MAX_AUDIO_SECONDS+1])await assert.rejects(()=>transcribeYoutubeWithGroq('https://youtu.be/abcdefghijk',duration),/3 hours/)}finally{if(old)process.env.GROQ_API_KEY=old;else delete process.env.GROQ_API_KEY}
});

test('long-audio budget supports a 77-minute video in ten-minute chunks',()=>{assert.equal(CHUNK_SECONDS,600);assert.ok(MAX_AUDIO_SECONDS>=4651);assert.ok(MAX_AUDIO_CHUNKS>=8)});
