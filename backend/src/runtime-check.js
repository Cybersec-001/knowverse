import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import ffmpeg from 'ffmpeg-static';import ffprobe from 'ffprobe-static';
const exec=promisify(execFile);
export async function runtimeCheck(){
 const versions={node:process.version};
 for(const [name,path,args] of [['python','python3',['--version']],['yt-dlp','yt-dlp',['--version']],['ffmpeg',ffmpeg,['-version']],['ffprobe',ffprobe.path,['-version']]]){
  try{const r=await exec(path,args,{timeout:10000,maxBuffer:10000});versions[name]=(r.stdout||r.stderr).split('\n')[0]}
  catch(error){versions[name]='unavailable';console.error('runtime.dependency.missing',{name,error:error.message})}
 }
 console.info('runtime.versions',versions);return versions;
}
if(process.argv[1]?.endsWith('/runtime-check.js'))await runtimeCheck();
