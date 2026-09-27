import 'dotenv/config';import {Worker} from 'bullmq';import pgvector from 'pgvector';import {redis} from './queue.js';import {query,pool} from './db.js';import {provider,hashVector} from './provider.js';import {chunkSegments,retrieve,sourceIds,validateTimedSegments} from './retrieval.js';import {youtubeCaptions,youtubeDuration} from './captions.js';import {load} from './storage.js';import {publishStatus,publishArtifact} from './events.js';
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
 const parts=await Promise.all(windows.map(async (window,index)=>{
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
  return items;
 }));
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
export async function processVideo(videoId){const {rows:[v]}=await query('SELECT * FROM videos WHERE id=$1',[videoId]);if(!v)throw new Error('Video missing');try{const {rows:priorChunks}=await query('SELECT id FROM chunks WHERE video_id=$1 LIMIT 1',[videoId]);if(priorChunks.length){await setStatus(videoId,'generating');await makeMissingArtifacts(videoId);await setStatus(videoId,'ready');return {videoId,resumed:true}}await setStatus(videoId,'transcribing');const p=provider();let segments;if(v.source_type==='youtube'){console.info('video.duration.start',JSON.stringify({videoId}));const duration=await youtubeDuration(v.source_url).catch(e=>{console.warn('video.duration.unverified',JSON.stringify({videoId,error:String(e.message).slice(0,180)}));return null});console.info('video.captions.start',JSON.stringify({videoId,duration}));try{segments=await youtubeCaptions(v.source_url);console.info('video.captions.done',JSON.stringify({videoId,segments:segments.length}))}catch(e){console.error('video.captions.failed',JSON.stringify({videoId,error:String(e.message).slice(0,250)}));if(p.kind==='gemini'&&(/sign in to confirm you.re not a bot|No captions available|Caption file is empty/i.test(String(e.message)))){console.info('video.transcription.fallback.start',JSON.stringify({videoId}));segments=await p.transcribeYoutube(v.source_url);console.info('video.transcription.fallback.done',JSON.stringify({videoId,segments:segments.length}))}else throw e}segments=validateTimedSegments(segments,duration);await query('UPDATE videos SET duration=$2,timestamps_verified=$3 WHERE id=$1',[videoId,duration,duration!==null])}else segments=await p.transcribe(await load(v.storage_key),v.title);if(!segments.length)throw new Error('No transcript extracted');await query('INSERT INTO transcripts(video_id,raw_text,language) VALUES($1,$2,$3) ON CONFLICT(video_id) DO UPDATE SET raw_text=EXCLUDED.raw_text,language=EXCLUDED.language',[videoId,segments.map(s=>s.text).join(' '),'en']);await setStatus(videoId,'chunking');await query('DELETE FROM artifacts WHERE video_id=$1',[videoId]);await query('UPDATE user_notes SET source_chunk_id=NULL WHERE video_id=$1',[videoId]);await query('DELETE FROM chunks WHERE video_id=$1',[videoId]);const chunks=chunkSegments(segments,120);for(const chunk of chunks){const embedding=hashVector(chunk.text);if(embedding.length!==1536)throw new Error('Embedding dimension must be 1536');await query('INSERT INTO chunks(video_id,text,start_ts,end_ts,embedding) VALUES($1,$2,$3,$4,$5::vector)',[videoId,chunk.text,chunk.start,chunk.end,pgvector.toSql(embedding)])}await setStatus(videoId,'generating');await makeMissingArtifacts(videoId);await setStatus(videoId,'ready');return {videoId,chunks:chunks.length}}catch(e){await setStatus(videoId,'failed',String(e.message).slice(0,500));throw e}}
export function startWorker(){return new Worker('video-processing',async job=>{if(job.name==='process')return processVideo(job.data.videoId);if(job.name==='regenerate')return makeArtifact(job.data.videoId,job.data.type);throw new Error('Unknown job')},{connection:redis(),concurrency:2});console.log('Knowverse worker ready')}
if(process.argv[1]?.endsWith('/worker.js')){startWorker();process.on('SIGINT',async()=>{await pool.end();await redis().quit();process.exit()})}
