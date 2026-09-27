import {query} from './db.js';import pgvector from 'pgvector';import {provider} from './provider.js';
export function chunkSegments(segments,targetWords=360){const out=[];let words=0,part=[],start=0,end=0;for(const segment of segments){const text=String(segment.text??'').trim();if(!text)continue;if(!part.length)start=Number(segment.start)||0;part.push(text);end=Number(segment.end)||start;words+=text.split(/\s+/).length;if(words>=targetWords){out.push({text:part.join(' '),start,end});part=[];words=0}}if(part.length)out.push({text:part.join(' '),start,end});return out}
export async function retrieve(videoId,text,k=5){const vector=await provider().embed(text);const {rows}=await query(`SELECT id,video_id,text,start_ts,end_ts,1-(embedding <=> $2::vector) AS similarity FROM chunks WHERE video_id=$1 ORDER BY embedding <=> $2::vector LIMIT $3`,[videoId,pgvector.toSql(vector),k]);return rows}
export async function retrieveNotebook(notebookId,userId,text,k=8){const vector=await provider().embed(text);const {rows}=await query(`SELECT c.id,c.video_id,v.title AS video_title,c.text,c.start_ts,c.end_ts,1-(c.embedding <=> $3::vector) AS similarity FROM notebooks n JOIN videos v ON v.notebook_id=n.id JOIN chunks c ON c.video_id=v.id WHERE n.id=$1 AND n.user_id=$2 ORDER BY c.embedding <=> $3::vector LIMIT $4`,[notebookId,userId,pgvector.toSql(vector),k]);return rows}
export function sourceIds(data){if(!Array.isArray(data))return [];return data.flatMap(v=>v.source_chunk_id?[v.source_chunk_id]:Array.isArray(v.bullets)?v.bullets.map(b=>b.source_chunk_id):[])}

export function validateTimedSegments(segments,duration){
 if(!Number.isFinite(duration)||duration<=0)throw new Error('Verified video duration required for timestamped citations');
 if(!Array.isArray(segments)||!segments.length)throw new Error('No timed segments');
 for(const s of segments){if(!Number.isFinite(Number(s.start))||!Number.isFinite(Number(s.end))||Number(s.start)<0||Number(s.end)<Number(s.start)||Number(s.end)>duration+1)throw new Error('Transcript timestamp exceeds verified video duration')}
 return segments.map(s=>({...s,start:Math.max(0,Number(s.start)),end:Math.min(duration,Number(s.end))}));
}
