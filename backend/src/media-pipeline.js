import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import {transcribeAudio,CHUNK_SECONDS,MAX_AUDIO_SECONDS,MAX_AUDIO_CHUNKS} from './groq-transcribe.js';
import {validateTimedSegments} from './retrieval.js';
const exec=promisify(execFile),opts={timeout:180000,maxBuffer:1_000_000};
export async function probeDuration(path){const {stdout}=await exec(ffprobe.path,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path],opts);const n=Number(stdout.trim());if(!Number.isFinite(n)||n<=0)throw new Error('Media duration unavailable');return n}
export async function withPreparedAudio(source,fn){
 const dir=await mkdtemp(join(tmpdir(),'knowverse-media-'));
 try{
  const input=join(dir,'source.media');await writeFile(input,source);
  const duration=await probeDuration(input);
  if(duration>MAX_AUDIO_SECONDS)throw new Error('Media exceeds the free worker processing budget (3 hours)');
  await exec(ffmpegPath,['-hide_banner','-loglevel','error','-i',input,'-vn','-ac','1','-ar','16000','-b:a','32k','-f','segment','-segment_time',String(CHUNK_SECONDS),'-reset_timestamps','1',join(dir,'chunk-%03d.mp3')],opts);
  const files=(await readdir(dir)).filter(x=>/^chunk-\d+\.mp3$/.test(x)).sort();
  if(!files.length||files.length>MAX_AUDIO_CHUNKS+1)throw new Error('Audio split failed within worker budget');
  return await fn({dir,files,duration});
 }finally{await rm(dir,{recursive:true,force:true})}
}
export async function transcribePreparedMedia(source,{onProgress=async()=>{}}={}){
 return withPreparedAudio(source,async({dir,files,duration})=>{
  const segments=[];let offset=0,language=null;
  for(let i=0;i<files.length;i++){
   const file=files[i],path=join(dir,file);
   const audio=await readFile(path);
   const chunkDuration=await probeDuration(path);
   let result;
   for(let attempt=1;attempt<=3;attempt++){
    try{result=await transcribeAudio(audio,file,offset);break}
    catch(error){
     const msg=String(error.message),retryable=/\b(429|500|502|503|504)\b|timed? out|network/i.test(msg);
     if(!retryable||attempt===3)throw new Error(`Audio chunk ${i+1}/${files.length} failed after ${attempt} attempt(s): ${msg.slice(0,150)}`);
     await new Promise(resolve=>setTimeout(resolve,Math.min(4000,500*2**(attempt-1))));
    }
   }
   segments.push(...result.segments);language??=result.language;
   offset+=chunkDuration;
   await onProgress({currentChunk:i+1,totalChunks:files.length});
  }
  return {segments:validateTimedSegments(segments,duration),language:language??'unknown',duration,totalChunks:files.length};
 });
}
