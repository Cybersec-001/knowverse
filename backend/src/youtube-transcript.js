// YouTube transcript acquisition. Policy: only official/supported routes.
//  1. Timed captions supplied by the user (uploaded or pasted in the browser).
//  2. Official YouTube Data API v3 (videos.list) for existence, privacy, duration and title. Needs YOUTUBE_API_KEY (free quota).
//  3. Gemini API with the public YouTube URL as input (a supported Google feature, free tier).
//  4. Optional, OFF by default: server-side yt-dlp (ENABLE_SERVER_YTDLP=true). Datacenter IPs are usually blocked by YouTube,
//     and this code never adds cookies, proxies or spoofed headers.
// Nothing here tries to defeat a YouTube access control. When no route works the user gets a clear coded error.
import {parseVtt,youtubeId,youtubeCaptions} from './captions.js';
import {validateTimedSegments} from './retrieval.js';

export class TranscriptError extends Error{constructor(code,message){super(message);this.code=code;this.name='TranscriptError'}}

export function parseIsoDuration(iso){const m=/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso??'');if(!m)return null;const [d,h,mi,s]=m.slice(1).map(x=>Number(x??0));const total=((d*24+h)*60+mi)*60+s;return total>0?total:null}

/** Official Data API lookup. Returns null when no key is configured; throws TranscriptError for definite problems. */
export async function youtubeVideoInfo(url,{fetchImpl=fetch,apiKey=process.env.YOUTUBE_API_KEY}={}){
 const id=youtubeId(url);
 if(!apiKey)return null;
 const endpoint=new URL('https://www.googleapis.com/youtube/v3/videos');
 endpoint.search=new URLSearchParams({part:'snippet,contentDetails,status',id,key:apiKey}).toString();
 let response;
 try{response=await fetchImpl(endpoint,{signal:AbortSignal.timeout(10000)})}catch{return null}
 if(response.status===403||response.status===400||response.status===429)return null; // quota or key problem: degrade, do not block the user
 if(!response.ok)return null;
 const item=(await response.json()).items?.[0];
 if(!item)throw new TranscriptError('video_unavailable','This YouTube video is private, deleted or does not exist.');
 if(item.status?.privacyStatus==='private')throw new TranscriptError('video_private','This YouTube video is private.');
 if(item.snippet?.liveBroadcastContent&&item.snippet.liveBroadcastContent!=='none')throw new TranscriptError('video_live','Live or upcoming streams are not supported. Try again after the stream ends.');
 return {id,title:item.snippet?.title??null,duration:parseIsoDuration(item.contentDetails?.duration),embeddable:item.status?.embeddable!==false};
}

const MAX_AUTO_SECONDS=3600;

/**
 * Returns {segments,language,duration,source}. Throws TranscriptError with a stable code the UI can map to a message.
 * `uploadedVtt` wins over every automatic route.
 */
export async function getYoutubeSegments({url,uploadedVtt,provider,info,log=()=>{}}){
 const duration=info?.duration??null;
 if(uploadedVtt){
  const segments=validateTimedSegments(parseVtt(uploadedVtt),duration);
  if(!segments.length)throw new TranscriptError('captions_empty','The caption file has no usable timed text.');
  return {segments,language:'en',duration,source:'uploaded_captions'};
 }
 if(duration!==null&&duration>MAX_AUTO_SECONDS)throw new TranscriptError('too_long',`This video is ${Math.ceil(duration/60)} minutes. Automatic transcripts are limited to 60 minutes on the free setup. Upload timed captions (.vtt or .srt) instead.`);
 if(process.env.ENABLE_SERVER_YTDLP==='true'){
  try{const cues=await youtubeCaptions(url);if(cues.length)return {segments:validateTimedSegments(cues,duration),language:'en',duration,source:'server_ytdlp'}}
  catch(e){log('video.captions.server.failed',String(e.message).slice(0,200))}
 }
 if(provider?.kind==='gemini'&&typeof provider.transcribeYoutube==='function'){
  try{
   log('video.gemini.youtube.start',{duration});
   const segments=validateTimedSegments(await provider.transcribeYoutube(url),duration);
   if(segments.length)return {segments,language:'unknown',duration,source:'gemini_youtube_url'};
  }catch(e){log('video.gemini.youtube.failed',String(e.message).slice(0,200))}
 }
 throw new TranscriptError('captions_needed','Transcript could not be fetched automatically. The video may have no captions or speech, may be restricted, or YouTube may limit server access. Upload its timed captions (.vtt or .srt) or paste them, and processing will continue.');
}
