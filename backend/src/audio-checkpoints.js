import {createHash} from 'node:crypto';
import {query} from './db.js';
import {transcriptionConcurrency} from './media-config.js';
import {validateTimedSegments} from './retrieval.js';
export function stableId(videoId,index,kind='audio'){
 const h=createHash('sha256').update(`${kind}:${videoId}:${index}`).digest('hex');
 return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function checkpointStore(videoId){return {
 async init(chunks){for(const c of chunks)await query('INSERT INTO audio_chunks(id,video_id,chunk_index,start_ts,end_ts) VALUES($1,$2,$3,$4,$5) ON CONFLICT(video_id,chunk_index) DO NOTHING',[stableId(videoId,c.chunkIndex),videoId,c.chunkIndex,c.startTime,c.endTime])},
 async list(){return (await query('SELECT chunk_index AS "chunkIndex",status,segments,language,attempts FROM audio_chunks WHERE video_id=$1 ORDER BY chunk_index',[videoId])).rows},
 async attempt(index){await query("UPDATE audio_chunks SET status='processing',attempts=attempts+1,error_message=NULL,updated_at=now() WHERE video_id=$1 AND chunk_index=$2",[videoId,index])},
 async complete(index,result){await query("UPDATE audio_chunks SET status='completed',segments=$3::jsonb,text=$4,language=$5,error_message=NULL,updated_at=now() WHERE video_id=$1 AND chunk_index=$2",[videoId,index,JSON.stringify(result.segments),result.segments.map(s=>s.text).join(' '),result.language??'unknown'])},
 async fail(index){await query("UPDATE audio_chunks SET status='failed',error_message='This audio segment could not be transcribed.',updated_at=now() WHERE video_id=$1 AND chunk_index=$2",[videoId,index])}
};}
export const retryable=error=>/\b(429|500|502|503|504)\b|timed? out|network|fetch failed/i.test(String(error.message));
/** Durable completion precedes progress/file deletion. Re-extraction may repeat after restart,
 * but completed provider requests never do. Transient attempts are bounded per resume. */
export async function runAudioChunks(chunks,{store,transcribe,onProgress=async()=>{},cleanup=async()=>{},concurrency=transcriptionConcurrency(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),duration=null}={}){
 store??={async init(){},async list(){return []},async attempt(){},async complete(){},async fail(){}};
 await store.init(chunks);
 const saved=new Map((await store.list()).map(c=>[Number(c.chunkIndex),c]));
 const results=new Array(chunks.length);let complete=0,cursor=0,failure;
 for(let i=0;i<chunks.length;i++){
  const old=saved.get(chunks[i].chunkIndex);
  if(old?.status==='completed'&&Array.isArray(old.segments)&&old.segments.length){
   results[i]={segments:validateTimedSegments(old.segments,duration),language:old.language};complete++;await cleanup(chunks[i]);
  }
 }
 // Serialize progress emissions so concurrent finishes cannot regress the DB count.
 let progress=Promise.resolve();
 const report=()=>{const count=complete;progress=progress.then(()=>onProgress({stage:'transcribing_audio',currentChunk:count,totalChunks:chunks.length}));return progress};
 await report();
 async function runner(){while(!failure&&cursor<chunks.length){const i=cursor++,c=chunks[i];if(results[i])continue;
  try{
   let result;
   for(let attempt=1;attempt<=3;attempt++){
    await store.attempt(c.chunkIndex);
    try{result=await transcribe(c);result.segments=validateTimedSegments(result.segments,duration);break}
    catch(error){await store.fail(c.chunkIndex);if(!retryable(error)||attempt===3)throw error;await sleep(Math.min(30000,1000*2**(attempt-1)))}
   }
   await store.complete(c.chunkIndex,result);results[i]=result;complete++;await report();await cleanup(c);
  }catch(error){failure??=new Error(`Audio chunk ${c.chunkIndex+1}/${chunks.length} failed: ${String(error.message).slice(0,180)}`)}
 }}
 await Promise.all(Array.from({length:Math.min(chunks.length,Math.max(1,Math.min(4,concurrency)))},runner));
 await progress;if(failure)throw failure;
 return {segments:validateTimedSegments(results.flatMap(r=>r.segments),duration),language:results.find(r=>r.language)?.language??'unknown',totalChunks:chunks.length};
}
