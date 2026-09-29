import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readdir,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {youtubeId} from './captions.js';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import {validateTimedSegments} from './retrieval.js';

const exec=promisify(execFile);
export const CHUNK_SECONDS=600;
// Operational bound on the free worker, not a Whisper single-file duration limit.
export const MAX_AUDIO_SECONDS=3*3600;
export const MAX_AUDIO_CHUNKS=Math.ceil(MAX_AUDIO_SECONDS/CHUNK_SECONDS);
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

/** Only invoked after captions fail. Long audio is split for the free 25 MB per-file limit. */
export async function transcribeYoutubeWithGroq(url,duration,{onProgress=async()=>{}}={}){
 const progress=onProgress;
 if(duration!==null&&(!Number.isFinite(duration)||duration<=0||duration>MAX_AUDIO_SECONDS))throw new Error('Video exceeds the free worker audio processing budget (3 hours)');
 if(!process.env.GROQ_API_KEY)throw new Error('Groq Whisper is not configured');
 const id=youtubeId(url),dir=await mkdtemp(join(tmpdir(),'knowverse-audio-'));
 try{
  const input=join(dir,'source.%(ext)s');
  try{
   await exec('yt-dlp',['--js-runtimes','node','--no-playlist','--match-filter',`duration <= ${MAX_AUDIO_SECONDS}`,'--format','bestaudio/best','--max-filesize','200M','--output',input,`https://www.youtube.com/watch?v=${id}`],commandOptions);
  }catch(e){throw new Error(`YouTube audio unavailable: ${String(e.stderr??e.message).slice(-250)}`)}
  const sources=(await readdir(dir)).filter(x=>x.startsWith('source.'));
  if(sources.length!==1)throw new Error('YouTube audio download was incomplete');
  const source=join(dir,sources[0]);
  if((await stat(source)).size>200*1024*1024)throw new Error('YouTube audio exceeds processing limit');
  const {stdout:sourceDuration}=await exec(ffprobe.path,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',source],commandOptions);
  const verifiedDuration=Number(sourceDuration.trim());
  if(!Number.isFinite(verifiedDuration)||verifiedDuration<=0||verifiedDuration>MAX_AUDIO_SECONDS)throw new Error('YouTube audio exceeds the free worker processing budget (3 hours), or duration cannot be verified');
  // Low bitrate mono MP3 keeps each ten-minute chunk well under the free-tier limit.
  await exec(ffmpegPath,['-hide_banner','-loglevel','error','-i',source,'-vn','-ac','1','-ar','16000','-b:a','32k','-f','segment','-segment_time',String(CHUNK_SECONDS),'-reset_timestamps','1',join(dir,'chunk-%03d.mp3')],commandOptions)
   .catch(e=>{throw new Error(`Audio conversion failed: ${String(e.stderr??e.message).slice(-180)}`)});
  const files=(await readdir(dir)).filter(x=>/^chunk-\d+\.mp3$/.test(x)).sort();
  if(!files.length||files.length>MAX_AUDIO_CHUNKS+1)throw new Error('Audio could not be split within the free worker budget');
  const segments=[];let offset=0,language=null;await progress({stage:'splitting_audio',currentChunk:0,totalChunks:files.length});
  for(let i=0;i<files.length;i++){const file=files[i];
   const path=join(dir,file),buffer=await readFile(path);if(buffer.length>MAX_AUDIO_BYTES)throw new Error(`Audio chunk ${i+1}/${files.length} exceeds free file size`);
   let result;for(let attempt=1;attempt<=3;attempt++){try{result=await transcribeAudio(buffer,file,offset);break}catch(e){const retryable=/\b(429|500|502|503|504)\b|timed? out|network/i.test(String(e.message));if(!retryable||attempt===3)throw new Error(`Audio chunk ${i+1}/${files.length} failed after ${attempt} attempt(s): ${String(e.message).slice(0,150)}`);await new Promise(r=>setTimeout(r,500*2**(attempt-1)))}}
   segments.push(...result.segments);language??=result.language;
   const {stdout}=await exec(ffprobe.path,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path],commandOptions);
   const seconds=Number(stdout.trim());
   if(!Number.isFinite(seconds)||seconds<=0)throw new Error('Audio chunk duration unavailable');
   offset+=seconds;await progress({stage:'transcribing_audio',currentChunk:i+1,totalChunks:files.length});
  }
  return {segments:validateTimedSegments(segments),language,duration:verifiedDuration};
 }finally{await rm(dir,{recursive:true,force:true})}
}
