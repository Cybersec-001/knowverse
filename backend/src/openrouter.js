/** Free-only text generation: never silently route to a paid model. */
const primary = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
const models = [primary, 'openrouter/free'].filter((x,i,a) => a.indexOf(x) === i);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function expectedShape(data,system){
 if(!data||typeof data!=='object')return false;
 if(system.includes('"items"')){
  if(!Array.isArray(data.items)||!data.items.length)return false;
  if(system.includes('"question"'))return data.items.some(x=>x&&typeof x.question==='string'&&Array.isArray(x.options)&&x.source_chunk_id);
  return data.items.some(x=>x&&typeof x.heading==='string'&&Array.isArray(x.bullets));
 }
 if(system.includes('"supported"'))return typeof data.supported==='boolean';
 if(system.includes('"answer"'))return typeof data.answer==='string';
 return true;
}
function firstJson(text) {
  const clean=String(text??'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try {const data=JSON.parse(clean);if(data&&typeof data==='object'&&!Array.isArray(data))return data}catch{}
  for(let start=0;start<clean.length;start++){
    if(clean[start]!=='{')continue;
    let depth=0,quoted=false,escaped=false;
    for(let end=start;end<clean.length;end++){
      const c=clean[end];
      if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
      if(c==='"'){quoted=true;continue}
      if(c==='{')depth++;else if(c==='}')depth--;
      if(depth===0){try{const data=JSON.parse(clean.slice(start,end+1));if(data&&typeof data==='object'&&!Array.isArray(data))return data}catch{}break}
    }
  }
  return null;
}
export async function openrouterJson(system, user) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not configured');
  if (models.some(model => !model.endsWith(':free') && model !== 'openrouter/free')) throw new Error('OpenRouter model must be free');
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const repair=attempt===2;
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: AbortSignal.timeout(45000),
        headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://cybersec-001.github.io/knowverse/', 'X-Title': 'Knowverse'},
        body: JSON.stringify({model, messages: [{role:'system',content:system+(repair?' Return ONLY valid JSON with the requested keys, no Markdown or commentary.':'')}, {role:'user',content:user}], temperature:0.2, response_format:{type:'json_object'}, max_tokens:1800})
      });
      if (response.ok) {
        const data = await response.json();
        const parsed=firstJson(data.choices?.[0]?.message?.content);
        if(expectedShape(parsed,system))return parsed;
        if(repair){if(model===models.at(-1))throw new Error('OpenRouter free models returned invalid JSON shape');break}
        // A non-JSON answer gets one repair prompt on the same free model.
        attempt=1;
        continue;
      }
      const body = (await response.text()).slice(0,180);
      if (![429,502,503,504].includes(response.status)) throw new Error(`OpenRouter provider error ${response.status}: ${body}`);
      if (attempt===1){if(model===models.at(-1))throw new Error(`OpenRouter free models unavailable (${response.status}): ${body}`);break}
      if (attempt===2){if(model===models.at(-1))throw new Error(`OpenRouter free models unavailable (${response.status}): ${body}`);break}
      const raw = Number(response.headers.get('retry-after'));
      const reset = Number(response.headers.get('x-ratelimit-reset'));
      const resetMs = Number.isFinite(reset) && reset > 0 ? (reset > 1e12 ? reset-Date.now() : reset*1000-Date.now()) : 0;
      const waitMs=Number.isFinite(raw) && raw > 0 ? raw*1000 : resetMs;
      await sleep(Math.min(75000,Math.max(2000,waitMs)));
    }
  }
  throw new Error('OpenRouter free models unavailable');
}
