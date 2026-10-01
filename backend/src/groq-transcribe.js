import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {youtubeId} from './captions.js';
import {validateTimedSegments} from './retrieval.js';

const exec=promisify(execFile);
import {MAX_AUDIO_SECONDS,MAX_SOURCE_BYTES} from './media-config.js';
export {CHUNK_SECONDS,MAX_AUDIO_SECONDS,MAX_AUDIO_CHUNKS} from './media-config.js';
const MAX_AUDIO_BYTES=24*1024*1024; // Below Groq's 25 MB free-plan file limit.
const commandOptions={timeout:180000,maxBuffer:1000000};

export async function transcribeAudio(buffer,filename='audio.mp3',offset=0){
 const key=process.env.GROQ_API_KEY;
 if(!key)throw new Error('Groq Whisper is not configured');
 if(!buffer.length||buffer.length>MAX_AUDIO_BYTES)throw new Error('Audio exceeds Groq free-tier chunk size');
 const form=new FormData();
 form.append('file',new Blob([buffer],{type:'audio/mpeg'}),filename);
 form.append('model','whisper-large-v3');
 form.append('response_format','verbose_json');
 form.append('timestamp_granularities[]','segment');
 // No forced language: Whisper detects Tamil and other non-English speech.
 const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{
  method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(120000)
 });
 if(!response.ok){
  const detail=(await response.text()).slice(0,180);
  throw new Error(`Groq Whisper failed (${response.status}): ${detail}`);
 }
 const data=await response.json();
 const segments=(data.segments??[]).map(s=>({text:String(s.text??'').trim(),start:Number(s.start)+offset,end:Number(s.end)+offset})).filter(s=>s.text);
 return {segments:validateTimedSegments(segments),language:data.language??null};
}

/** Invoked only after public captions fail. No cookies/auth bypass. */
export async function transcribeYoutubeWithGroq(url,duration,options={}){
 if(duration!==null&&(!Number.isFinite(duration)||duration<=0||duration>MAX_AUDIO_SECONDS))throw new Error('Video exceeds the 10-hour input budget');
 if(!process.env.GROQ_API_KEY)throw new Error('Groq Whisper is not configured');
 const id=youtubeId(url),dir=await mkdtemp(join(tmpdir(),'knowverse-audio-'));
 try{
  try{
   await exec('yt-dlp',['--js-runtimes','node','--no-playlist','--retries','2','--fragment-retries','2','--retry-sleep','exp=1:4',
    '--match-filter',`duration <= ${MAX_AUDIO_SECONDS}`,'--format','bestaudio/best','--max-filesize',String(MAX_SOURCE_BYTES),
    '--output',join(dir,'source.%(ext)s'),`https://www.youtube.com/watch?v=${id}`],{...commandOptions,timeout:900000});
  }catch(e){throw new Error(`YouTube audio unavailable: ${String(e.stderr??e.message).slice(-400)}`)}
  const sources=(await readdir(dir)).filter(x=>x.startsWith('source.')&&!x.endsWith('.part'));
  if(sources.length!==1)throw new Error('YouTube audio download was incomplete');
  const source=join(dir,sources[0]);
  if((await stat(source)).size>MAX_SOURCE_BYTES)throw new Error('YouTube audio exceeds storage budget');
  const {transcribePreparedMedia}=await import('./media-pipeline.js');
  return await transcribePreparedMedia(source,options);
 }finally{await rm(dir,{recursive:true,force:true})}
}
