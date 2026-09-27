/** A fast, quotation-only fallback spanning the entire indexed timeline. */
export function extractiveMoments(chunks,count=10){
 if(!Array.isArray(chunks)||!chunks.length)return [];
 const size=Math.min(count,chunks.length);
 const output=[];
 for(let i=0;i<size;i++){
  const a=Math.floor(i*chunks.length/size),b=Math.floor((i+1)*chunks.length/size);
  let best=null;
  for(const chunk of chunks.slice(a,b)){
   const sentences=String(chunk.text??'').replace(/\s+/g,' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g)??[];
   for(const raw of sentences){const text=raw.trim();const words=text.split(/\s+/);
    if(words.length<9||words.length>27)continue;
    const score= /(?:going to|learn about|talk about|this is how|in python|we can use|the basics of|called a|what is|how to)/i.test(text)?3:0;
    const penalty=/^(?:and|but|so|right|now|okay|um|yeah|you know|here|then)\b/i.test(text)?2:0;
    const value=score-penalty-Math.abs(words.length-16)/20;
    if(!best||value>best.value)best={text,source_chunk_id:chunk.id,value};
   }
  }
  if(!best){const chunk=chunks[a];const text=String(chunk.text??'').replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/)[0];best={text:text.slice(0,180),source_chunk_id:chunk.id}}
  output.push({heading:`Moment ${i+1}`,bullets:[{text:`“${best.text}”`,source_chunk_id:best.source_chunk_id}]});
 }
 return output;
}
