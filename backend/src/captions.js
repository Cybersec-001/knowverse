import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const exec=promisify(execFile);export function youtubeId(url){const u=new URL(url);if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be'].includes(u.hostname))throw new Error('Only YouTube URLs are allowed');const id=u.hostname.includes('youtu.be')?u.pathname.slice(1):u.pathname.startsWith('/shorts/')?u.pathname.split('/')[2]:u.searchParams.get('v');if(!/^[a-zA-Z0-9_-]{11}$/.test(id??''))throw new Error('Invalid YouTube URL');return id}
export function parseVtt(source){
 const blocks=String(source).replace(/\r/g,'').replace(/^\uFEFF/,'').split(/\n\s*\n/),cues=[];
 const time=s=>{const parts=s.replace(',','.').split(':').map(Number);if(parts.length<2||parts.length>3||parts.some(n=>!Number.isFinite(n)))return NaN;return parts.reduce((a,b)=>a*60+b,0)};
 for(const block of blocks){const lines=block.split('\n');const at=lines.findIndex(line=>line.includes('-->'));if(at<0)continue;
  const [first,last]=lines[at].split('-->');if(!last)continue;const start=time(first.trim().split(/\s+/)[0]),end=time(last.trim().split(/\s+/)[0]);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)continue;
  const text=lines.slice(at+1).join(' ').replace(/<[^>]+>/g,'').trim();
  if(text&&text!==cues.at(-1)?.text)cues.push({start,end,text});
 }
 return cues;
}
export async function youtubeCaptions(url){const id=youtubeId(url);const dir=await mkdtemp(join(tmpdir(),'knowverse-caption-'));try{await exec('yt-dlp',['--js-runtimes','node','--retries','2','--fragment-retries','2','--retry-sleep','exp=1:4','--skip-download','--write-subs','--write-auto-subs','--sub-langs',process.env.CAPTION_LANGUAGES??'en.*,hi.*,ta.*','--sub-format','vtt','--no-playlist','--output',join(dir,'%(id)s.%(ext)s'),`https://www.youtube.com/watch?v=${id}`],{timeout:150000,maxBuffer:1_000_000}).catch(e=>{throw new Error(`YouTube captions failed: ${String(e.stderr??e.message).slice(-420)}`)});const files=(await readdir(dir)).filter(f=>f.endsWith('.vtt'));if(!files.length)throw new Error('No captions available for this YouTube video');const cues=parseVtt(await readFile(join(dir,files[0]),'utf8'));if(!cues.length)throw new Error('Caption file is empty');return cues}finally{await rm(dir,{recursive:true,force:true})}}

/** Public watch-page metadata is best effort; never infer duration from generated transcript. */
export async function youtubeDuration(url){
 const id=youtubeId(url);
 const response=await fetch(`https://www.youtube.com/watch?v=${id}`,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Mozilla/5.0'}});
 if(!response.ok)throw new Error(`YouTube duration metadata unavailable (${response.status})`);
 const html=await response.text();
 const match=html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
 const duration=Number(match?.[1]);
 if(!Number.isInteger(duration)||duration<=0||duration>43200)throw new Error('YouTube duration metadata unavailable');
 return duration;
}
