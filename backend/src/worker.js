import 'dotenv/config';import {Worker} from 'bullmq';import pgvector from 'pgvector';import {redis} from './queue.js';import {query,pool} from './db.js';import {provider,hashVector} from './provider.js';import {chunkSegments,retrieve,sourceIds,validateTimedSegments} from './retrieval.js';import {youtubeCaptions,youtubeDuration,parseVtt} from './captions.js';import {load} from './storage.js';import {publishStatus,publishArtifact} from './events.js';
const steps=['summary','notes','exam_notes','mcq'];
export async function setStatus(id,status,error=null){await query('UPDATE videos SET status=$2,error=$3,updated_at=now() WHERE id=$1',[id,status,error]);await publishStatus(id,status)}
/** Cover every part of long transcripts, rather than retrieving only the first/top eight chunks. */
export function artifactWindows(chunks,size=8){
 if(chunks.length<=size)return [chunks];
 const windows=[];
 for(let i=0;i<chunks.length;i+=size)windows.push(chunks.slice(i,i+size));
 return windows;
}
export async function makeArtifact(videoId,type){
 const p=provider();
 const {rows:chunkRows}=await query('SELECT id,video_id,text,start_ts,end_ts FROM chunks WHERE video_id=$1 ORDER BY start_ts',[videoId]);
 if(!chunkRows.length)throw new Error('No transcript chunks');
 const question=({summary:'Summarize central ideas',notes:'Detailed study notes',exam_notes:'Important exam concepts and definitions',mcq:'Test understanding of key concepts'})[type];
 // Small videos retain relevance ranking; longer videos cover every time window.
 let anchors=chunkRows;
 if(chunkRows.length<=8){const retrieved=await retrieve(videoId,question,chunkRows.length);if(retrieved.length)anchors=retrieved}
 const windows=artifactWindows(anchors);
 const validIds=new Set(chunkRows.map(x=>x.id));
 const parts=[];for(let index=0;index<windows.length;index++){const window=windows[index];
  const {rows:[saved]}=await query('SELECT content FROM artifact_windows WHERE video_id=$1 AND type=$2 AND window_index=$3',[videoId,type,index]);
  if(saved&&Array.isArray(saved.content)&&saved.content.length){const windowIds=new Set(window.map(c=>c.id));if(sourceIds(saved.content).every(id=>windowIds.has(id))){parts.push(saved.content);console.info('artifact.window.resumed',JSON.stringify({videoId,type,window:index+1}));continue}}
  const started=Date.now();
  console.info('artifact.generate.start',JSON.stringify({videoId,type,window:index+1,windows:windows.length,chunks:window.length}));
  let items;
  try{items=await p.generate(type,window)}catch(e){
   console.error('artifact.generate.failed',JSON.stringify({videoId,type,window:index+1,elapsed_ms:Date.now()-started,error:String(e.message).slice(0,180)}));
   throw new Error(`${type} window ${index+1}/${windows.length} generation failed: ${String(e.message).slice(0,180)}`);
  }
  console.info('artifact.generate.done',JSON.stringify({videoId,type,window:index+1,elapsed_ms:Date.now()-started,items:items?.length}));
  if(!Array.isArray(items)||!items.length)throw new Error(`Empty ${type} output`);
  items=items.filter(item=>sourceIds([item]).length&&sourceIds([item]).every(id=>validIds.has(id)));
  if(!items.length)throw new Error(`No cited ${type} items`);
  await query('INSERT INTO artifact_windows(video_id,type,window_index,content) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(video_id,type,window_index) DO UPDATE SET content=EXCLUDED.content,created_at=now()',[videoId,type,index,JSON.stringify(items)]);
  parts.push(items);
 }
 let content=parts.flat();
 if(type==='mcq'){
  const checks=await Promise.all(content.map(async (item,index)=>{
   const started=Date.now();
   try{return await p.verifyMcq(item,chunkRows)}catch(e){
    console.error('artifact.verify.failed',JSON.stringify({videoId,type,index,elapsed_ms:Date.now()-started,error:String(e.message).slice(0,180)}));
    throw new Error(`MCQ verification ${index+1}/${content.length} failed: ${String(e.message).slice(0,180)}`);
   }
  }));
  content=content.filter((_,i)=>checks[i]);
 }
 if(!content.length)throw new Error(`No verified ${type} items`);
 await query(`INSERT INTO artifacts(video_id,type,content) VALUES($1,$2,$3::jsonb) ON CONFLICT(video_id,type) DO UPDATE SET content=EXCLUDED.content,regenerated_at=now()`,[videoId,type,JSON.stringify(content)]);
 await publishArtifact(videoId,type);
 return content;
}
export async function makePreliminarySummary(videoId){
 const {rows:chunks}=await query('SELECT id,text,start_ts,end_ts FROM chunks WHERE video_id=$1 ORDER BY start_ts LIMIT 8',[videoId]);
 const {rows:[count]}=await query('SELECT count(*)::int AS total FROM chunks WHERE video_id=$1',[videoId]);
 if(!chunks.length)throw new Error('No source chunks for preliminary summary');
 const started=Date.now();
 const p=provider();
 const items=await p.generate('summary',chunks);
 const valid=new Set(chunks.map(c=>c.id));
 const content=items.filter(item=>sourceIds([item]).length&&sourceIds([item]).every(id=>valid.has(id)));
 if(!content.length)throw new Error('Preliminary summary lacks valid source citations');
 await query('INSERT INTO preliminary_summaries(video_id,content,covered_chunks,total_chunks) VALUES($1,$2::jsonb,$3,$4) ON CONFLICT(video_id) DO UPDATE SET content=EXCLUDED.content,covered_chunks=EXCLUDED.covered_chunks,total_chunks=EXCLUDED.total_chunks,created_at=now()',[videoId,JSON.stringify(content),chunks.length,count.total]);
 await publishArtifact(videoId,'preliminary_summary');
 console.info('preliminary.summary.done',JSON.stringify({videoId,elapsed_ms:Date.now()-started,covered:chunks.length,total:count.total,items:content.length}));
 return content;
}
async function makeMissingArtifacts(videoId){
 const missing=[];
 for(const type of steps){const {rows:[already]}=await query('SELECT 1 FROM artifacts WHERE video_id=$1 AND type=$2',[videoId,type]);if(!already)missing.push(type)}
 console.info('artifact.batch.start',JSON.stringify({videoId,missing}));
 // Deliver the editable summary as soon as it is ready. Do not make the user
 // wait for notes, exam notes or MCQ verification before the first artifact.
 if(missing.includes('summary')){
  const started=Date.now();
  const result=await makeArtifact(videoId,'summary');
  console.info('artifact.batch.done',JSON.stringify({videoId,type:'summary',elapsed_ms:Date.now()-started,items:result.length}));
 }
 const results=await Promise.allSettled(missing.filter(type=>type!=='summary').map(async type=>{
  const started=Date.now();
  try{const result=await makeArtifact(videoId,type);console.info('artifact.batch.done',JSON.stringify({videoId,type,elapsed_ms:Date.now()-started,items:result.length}));return result}
  catch(e){console.error('artifact.batch.failed',JSON.stringify({videoId,type,elapsed_ms:Date.now()-started,error:String(e.message).slice(0,180)}));throw e}
 }));
 const error=results.find(result=>result.status==='rejected');
 if(error)throw error.reason;
}
export async function processVideo(videoId){const {rows:[v]}=await query('SELECT * FROM videos WHERE id=$1',[videoId]);if(!v)throw new Error('Video missing');try{const {rows:priorChunks}=await query('SELECT id FROM chunks WHERE video_id=$1 LIMIT 1',[videoId]);if(priorChunks.length){await setStatus(videoId,'generating');await makeMissingArtifacts(videoId);await setStatus(videoId,'ready');return {videoId,resumed:true}}await setStatus(videoId,'transcribing');const p=provider();let segments;if(v.source_type==='youtube'){console.info('video.duration.start',JSON.stringify({videoId}));const {rows:[uploaded]}=await query('SELECT raw_vtt FROM video_caption_uploads WHERE video_id=$1',[videoId]);const duration=await youtubeDuration(v.source_url).catch(e=>{console.warn('video.duration.unverified',JSON.stringify({videoId,error:String(e.message).slice(0,180)}));return null});console.info('video.captions.start',JSON.stringify({videoId,duration,uploaded:Boolean(uploaded)}));try{segments=uploaded?parseVtt(uploaded.raw_vtt):await youtubeCaptions(v.source_url);if(!segments.length)throw new Error('Caption file is empty');console.info('video.captions.done',JSON.stringify({videoId,segments:segments.length,uploaded:Boolean(uploaded)}))}catch(e){console.error('video.captions.failed',JSON.stringify({videoId,error:String(e.message).slice(0,250)}));if(p.kind==='gemini'&&duration!==null&&duration<=3600&&(/sign in to confirm you.re not a bot|No captions available|Caption file is empty/i.test(String(e.message)))){console.info('video.transcription.fallback.start',JSON.stringify({videoId}));segments=await p.transcribeYoutube(v.source_url);console.info('video.transcription.fallback.done',JSON.stringify({videoId,segments:segments.length}))}else throw new Error(`Captions unavailable; upload a .vtt or .srt transcript for this video. ${String(e.message).slice(0,180)}`)}segments=validateTimedSegments(segments,duration);await query('UPDATE videos SET duration=$2,timestamps_verified=$3 WHERE id=$1',[videoId,duration,duration!==null])}else segments=await p.transcribe(await load(v.storage_key),v.title);if(!segments.length)throw new Error('No transcript extracted');await query('INSERT INTO transcripts(video_id,raw_text,language) VALUES($1,$2,$3) ON CONFLICT(video_id) DO UPDATE SET raw_text=EXCLUDED.raw_text,language=EXCLUDED.language',[videoId,segments.map(s=>s.text).join(' '),'en']);await setStatus(videoId,'chunking');await query('DELETE FROM artifacts WHERE video_id=$1',[videoId]);await query('DELETE FROM artifact_windows WHERE video_id=$1',[videoId]);await query('UPDATE user_notes SET source_chunk_id=NULL WHERE video_id=$1',[videoId]);await query('DELETE FROM chunks WHERE video_id=$1',[videoId]);const chunks=chunkSegments(segments,120);for(const chunk of chunks){const embedding=hashVector(chunk.text);if(embedding.length!==1536)throw new Error('Embedding dimension must be 1536');await query('INSERT INTO chunks(video_id,text,start_ts,end_ts,embedding) VALUES($1,$2,$3,$4,$5::vector)',[videoId,chunk.text,chunk.start,chunk.end,pgvector.toSql(embedding)])}await setStatus(videoId,'generating');if(chunks.length>8)await makePreliminarySummary(videoId).catch(e=>console.error('preliminary.summary.failed',JSON.stringify({videoId,error:String(e.message).slice(0,200)})));await makeMissingArtifacts(videoId);await setStatus(videoId,'ready');return {videoId,chunks:chunks.length}}catch(e){await setStatus(videoId,'failed',String(e.message).slice(0,500));throw e}}
export function startWorker(){return new Worker('video-processing',async job=>{if(job.name==='process')return processVideo(job.data.videoId);if(job.name==='regenerate')return makeArtifact(job.data.videoId,job.data.type);throw new Error('Unknown job')},{connection:redis(),concurrency:2});console.log('Knowverse worker ready')}
if(process.argv[1]?.endsWith('/worker.js')){startWorker();process.on('SIGINT',async()=>{await pool.end();await redis().quit();process.exit()})}
