import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import {CHUNK_SECONDS,MAX_AUDIO_SECONDS,MAX_AUDIO_CHUNKS,MAX_SOURCE_BYTES} from './media-config.js';
import {transcriptionProvider} from './transcription-provider.js';
import {runAudioChunks} from './audio-checkpoints.js';
const exec=promisify(execFile),opts={timeout:900000,maxBuffer:1_000_000};
export async function probeDuration(path){const {stdout}=await exec(ffprobe.path,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path],opts);const n=Number(stdout.trim());if(!Number.isFinite(n)||n<=0)throw new Error('Media duration unavailable');return n}
export async function withPreparedAudio(source,fn){
 const dir=await mkdtemp(join(tmpdir(),'knowverse-media-'));
 try{
  // Production receives a streamed storage/download path. Buffer support is for small callers/tests.
  const input=typeof source==='string'?source:join(dir,'source.media');
  if(typeof source!=='string')await writeFile(input,source);
  if((await stat(input)).size>MAX_SOURCE_BYTES)throw new Error('Media exceeds storage budget');
  const duration=await probeDuration(input);
  // MP3 padding may add milliseconds to exactly ten hours.
  if(duration>MAX_AUDIO_SECONDS+1)throw new Error('Media exceeds the 10-hour input budget');
  await exec(ffmpegPath,['-hide_banner','-loglevel','error','-i',input,'-vn','-ac','1','-ar','16000','-b:a','32k','-f','segment','-segment_time',String(CHUNK_SECONDS),'-reset_timestamps','1',join(dir,'chunk-%03d.mp3')],opts);
  const files=(await readdir(dir)).filter(x=>/^chunk-\d+\.mp3$/.test(x)).sort();
  if(!files.length||files.length>MAX_AUDIO_CHUNKS+1)throw new Error('Audio split failed within worker budget');
  // Use source-time boundaries, not accumulating container padding (which drifts over 60 files).
  const chunks=files.map((file,chunkIndex)=>({file,path:join(dir,file),chunkIndex,startTime:chunkIndex*CHUNK_SECONDS,endTime:Math.min(duration,(chunkIndex+1)*CHUNK_SECONDS)}));
  return await fn({dir,files,chunks,duration});
 }finally{await rm(dir,{recursive:true,force:true})}
}
export async function transcribePreparedMedia(source,options={}){
 return withPreparedAudio(source,async({chunks,duration})=>{
  await options.onProgress?.({stage:'splitting_audio',currentChunk:0,totalChunks:chunks.length});
  const p=transcriptionProvider();
  const result=await runAudioChunks(chunks,{...options,duration,cleanup:c=>rm(c.path,{force:true}),transcribe:async c=>{
   const result=await p.transcribeAudio(await readFile(c.path),c.file,0);
   result.segments=result.segments.map(s=>({...s,start:Math.min(c.endTime,s.start+c.startTime),end:Math.min(c.endTime,s.end+c.startTime)}));
   return result;
  }});
  return {...result,duration};
 });
}
