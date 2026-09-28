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
const CHUNK_SECONDS=600;
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

/** Only invoked after captions fail. Bounded by verified YouTube duration (one hour). */
export async function transcribeYoutubeWithGroq(url,duration){
 if(duration!==null&&(!Number.isFinite(duration)||duration<=0||duration>3600))throw new Error('Groq audio fallback requires a YouTube video of at most 60 minutes');
 if(!process.env.GROQ_API_KEY)throw new Error('Groq Whisper is not configured');
 const id=youtubeId(url),dir=await mkdtemp(join(tmpdir(),'knowverse-audio-'));
 try{
  const input=join(dir,'source.%(ext)s');
  try{
   await exec('yt-dlp',['--js-runtimes','node','--no-playlist','--match-filter','duration <= 3600','--format','bestaudio/best','--max-filesize','200M','--output',input,`https://www.youtube.com/watch?v=${id}`],commandOptions);
  }catch(e){throw new Error(`YouTube audio unavailable: ${String(e.stderr??e.message).slice(-250)}`)}
  const sources=(await readdir(dir)).filter(x=>x.startsWith('source.'));
  if(sources.length!==1)throw new Error('YouTube audio download was incomplete');
  const source=join(dir,sources[0]);
  if((await stat(source)).size>200*1024*1024)throw new Error('YouTube audio exceeds processing limit');
  const {stdout:sourceDuration}=await exec(ffprobe.path,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',source],commandOptions);
  const verifiedDuration=Number(sourceDuration.trim());
  if(!Number.isFinite(verifiedDuration)||verifiedDuration<=0||verifiedDuration>3600)throw new Error('YouTube audio is longer than 60 minutes or its duration cannot be verified');
  // Low bitrate mono MP3 keeps each ten-minute chunk well under the free-tier limit.
  await exec(ffmpegPath,['-hide_banner','-loglevel','error','-i',source,'-vn','-ac','1','-ar','16000','-b:a','32k','-f','segment','-segment_time',String(CHUNK_SECONDS),'-reset_timestamps','1',join(dir,'chunk-%03d.mp3')],commandOptions)
   .catch(e=>{throw new Error(`Audio conversion failed: ${String(e.stderr??e.message).slice(-180)}`)});
  const files=(await readdir(dir)).filter(x=>/^chunk-\d+\.mp3$/.test(x)).sort();
  if(!files.length||files.length>7)throw new Error('Audio could not be split within the one-hour limit');
  const segments=[];let offset=0,language=null;
  for(const file of files){
   const path=join(dir,file),buffer=await readFile(path);
   const result=await transcribeAudio(buffer,file,offset);
   segments.push(...result.segments);language??=result.language;
   const {stdout}=await exec(ffprobe.path,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path],commandOptions);
   const seconds=Number(stdout.trim());
   if(!Number.isFinite(seconds)||seconds<=0)throw new Error('Audio chunk duration unavailable');
   offset+=seconds;
  }
  return {segments:validateTimedSegments(segments),language,duration:verifiedDuration};
 }finally{await rm(dir,{recursive:true,force:true})}
}
