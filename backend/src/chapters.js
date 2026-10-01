import {createHash} from 'node:crypto';
import {stableId} from './audio-checkpoints.js';
import {sourceIds} from './retrieval.js';
import {query} from './db.js';
// Deterministic topic hints plus a bounded chapter window; heuristic, not semantic certainty.
export function detectChapters(chunks,maxChunks=8){
 const groups=[];let group=[];
 for(const c of chunks){const transition=/^(next (topic|chapter)|chapter \d|now (let['’]?s|we)|moving on|in this (section|chapter))/i.test(c.text.trim());
  if(group.length&&(group.length>=maxChunks||transition)){groups.push(group);group=[]}group.push(c);
 }
 if(group.length)groups.push(group);
 return groups.map((sources,chapterIndex)=>({chapterIndex,sources,title:sources[0].text.split(/[.!?\n]/)[0].split(/\s+/).slice(0,10).join(' ')||`Chapter ${chapterIndex+1}`,startTime:Number(sources[0].start_ts),endTime:Number(sources.at(-1).end_ts)}));
}
const fingerprint=chunks=>createHash('sha256').update(JSON.stringify(chunks.map(c=>[c.id,c.text]))).digest('hex');
function cited(items,allowed){const ids=new Set(allowed.map(c=>c.id));return (items??[]).filter(x=>sourceIds([x]).length&&sourceIds([x]).every(id=>ids.has(id)))}
export function summaryClaims(items,sources){const byId=new Map(sources.map(c=>[c.id,c]));return items.flatMap(x=>(x.bullets??[]).map(b=>({...byId.get(b.source_chunk_id),text:`${x.heading??''}: ${b.text}`.slice(0,1800)}))).filter(c=>c.id)}
export async function reduceSummaries(items,sources,generate,maxInputs=8){
 let claims=summaryClaims(items,sources),level=0;
 if(!claims.length)throw new Error('Summary lacks citations');
 while(claims.length>maxInputs){
  if(++level>12)throw new Error('Summary reduction did not converge');
  const next=[];
  for(let i=0;i<claims.length;i+=maxInputs){const window=claims.slice(i,i+maxInputs);const reduced=cited(await generate('summary',window),window);
   const extracted=summaryClaims(reduced,window).slice(0,Math.max(1,Math.floor(window.length/2)));
   if(!extracted.length)throw new Error('Summary reduction lacks citations');next.push(...extracted);
  }claims=next;
 }
 const final=cited(await generate('summary',claims),claims);
 if(!final.length)throw new Error('Final summary lacks citations');return final;
}
export async function hierarchicalSummary(videoId,chunks,p){
 const groups=detectChapters(chunks),all=[];
 for(const chapter of groups){
  const print=fingerprint(chapter.sources),id=stableId(videoId,chapter.chapterIndex,'chapter');
  const {rows:[saved]}=await query('SELECT summary,fingerprint FROM chapters WHERE video_id=$1 AND chapter_index=$2',[videoId,chapter.chapterIndex]);
  let summary=saved?.fingerprint===print?cited(saved.summary,chapter.sources):[];
  if(!summary.length){
   // Atomic cached chunk summaries are independent from audio segmentation.
   const chunkItems=[];
   for(const c of chapter.sources){const fp=fingerprint([c]);const index=chunks.indexOf(c);
    const {rows:[cache]}=await query("SELECT content,window_fingerprint FROM artifact_windows WHERE video_id=$1 AND type='summary' AND window_index=$2",[videoId,index]);
    let items=cache?.window_fingerprint===fp?cited(cache.content,[c]):[];
    if(!items.length){items=cited(await p.generate('summary',[c]),[c]);if(!items.length)throw new Error('Chunk summary lacks citations');
     await query("INSERT INTO artifact_windows(video_id,type,window_index,content,window_fingerprint) VALUES($1,'summary',$2,$3::jsonb,$4) ON CONFLICT(video_id,type,window_index) DO UPDATE SET content=EXCLUDED.content,window_fingerprint=EXCLUDED.window_fingerprint",[videoId,index,JSON.stringify(items),fp]);
    }chunkItems.push(...items);
   }
   summary=await reduceSummaries(chunkItems,chapter.sources,p.generate.bind(p));
   await query('INSERT INTO chapters(id,video_id,chapter_index,title,start_ts,end_ts,source_chunk_ids,summary,fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) ON CONFLICT(video_id,chapter_index) DO UPDATE SET title=EXCLUDED.title,start_ts=EXCLUDED.start_ts,end_ts=EXCLUDED.end_ts,source_chunk_ids=EXCLUDED.source_chunk_ids,summary=EXCLUDED.summary,fingerprint=EXCLUDED.fingerprint',[id,videoId,chapter.chapterIndex,chapter.title,chapter.startTime,chapter.endTime,chapter.sources.map(c=>c.id),JSON.stringify(summary),print]);
  }all.push(...summary);
 }
 await query('DELETE FROM chapters WHERE video_id=$1 AND chapter_index >= $2',[videoId,groups.length]);
 return groups.length===1?all:reduceSummaries(all,chunks,p.generate.bind(p));
}
