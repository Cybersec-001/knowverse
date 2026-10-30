/** Structured study-note style shared by every text provider: a main idea,
 * numbered points with the speaker's examples, a takeaway, and one clearly
 * labelled practice section that k adds on top of the video. */
export const PRACTICE_KIND='practice';
export const PRACTICE_HEADING='प्रैक्टिस (k की तरफ से)';
export function isPracticeItem(item){return item?.kind===PRACTICE_KIND}
export function summaryLanguage(){return process.env.SUMMARY_LANGUAGE?.trim()||'Hindi in Devanagari script, keeping technical terms, names and short quotes in English'}
export function studyStylePrompt(type){
 const detail=type==='notes'?'detailed study notes covering every important point in the video\'s order':'a study summary of the central ideas';
 const count=type==='notes'?'5-10':'3-5';
 return `You are Knowverse's study-notes writer. Using ONLY the supplied transcript chunks, write ${detail} in ${summaryLanguage()}.
Structure (follow exactly):
1. First item: heading "मुख्य विचार" with one bullet giving the core message in 2-3 sentences.
2. Then ${count} items, one per key point, in the video's order: heading numbered like "1) <short title>" (keep technical terms in English). Each point has 1-3 bullets: the explanation first; when the speaker gives an example, a bullet starting with "उदाहरण:".
3. Then one item: heading "निचोड़" with a single bullet capturing the essence of the whole video.
4. Last item: heading "${PRACTICE_HEADING}", kind "${PRACTICE_KIND}", with 2-4 bullets of practice exercises. These are your own suggestions for the learner, NOT the speaker's content, so they must not carry source_chunk_id.
Every bullet outside the practice item must cite exactly one existing chunk UUID in source_chunk_id, and everything it claims must come from that chunk. Never invent content the chunks do not contain.
Return {"items":[{"heading":"...","bullets":[{"text":"...","source_chunk_id":"UUID"}],"kind":"optional"}]}.`;
}
/** Keep only items whose every bullet cites a real chunk. One clearly-labelled
 * practice item may pass without citations; its bullets are stripped of any
 * source reference so generated exercises are never shown as the speaker's words. */
export function sanitizeStudyItems(items,validIds,{allowPractice=true}={}){
 const out=[];let practiceKept=false;
 for(const raw of Array.isArray(items)?items:[]){
  if(!raw||typeof raw.heading!=='string'||!raw.heading.trim()||!Array.isArray(raw.bullets))continue;
  if(isPracticeItem(raw)){
   if(!allowPractice||practiceKept)continue;
   const bullets=raw.bullets.filter(b=>b&&typeof b.text==='string'&&b.text.trim()).slice(0,6).map(b=>({text:b.text.trim()}));
   if(!bullets.length)continue;
   practiceKept=true;
   out.push({heading:raw.heading.trim().slice(0,120),kind:PRACTICE_KIND,bullets});
   continue;
  }
  const bullets=raw.bullets.filter(b=>b&&typeof b.text==='string'&&b.text.trim());
  if(!bullets.length||!bullets.every(b=>typeof b.source_chunk_id==='string'&&validIds.has(b.source_chunk_id)))continue;
  out.push({heading:raw.heading.trim(),bullets:bullets.map(b=>({text:b.text.trim(),source_chunk_id:b.source_chunk_id}))});
 }
 return out;
}
export function hasCitedItem(items){return Array.isArray(items)&&items.some(item=>!isPracticeItem(item))}
