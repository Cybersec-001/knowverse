/** Free-plan fallback for text JSON only. Never try this without an explicit key. */
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let gate=Promise.resolve(),nextAt=0;
async function pacedRequest(body,key,model){
 let release;const prior=gate;gate=new Promise(r=>release=r);await prior;
 try{
  await sleep(Math.max(0,nextAt-Date.now()));nextAt=Date.now()+2300; // <30 RPM free-model limit
  const started=Date.now();
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
   method:'POST',signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
   body:JSON.stringify({model,messages:body,temperature:0.2,response_format:{type:'json_object'},max_tokens:1800})
  });
  console.info('groq.request.done',JSON.stringify({model,elapsed_ms:Date.now()-started,status:response.status}));
  if(response.status===429){const raw=Number(response.headers.get('retry-after'));nextAt=Math.max(nextAt,Date.now()+(Number.isFinite(raw)&&raw>0?Math.min(raw*1000,90000):60000))}
  return response;
 }finally{release()}
}
export async function groqJson(system,user){
 const key=process.env.GROQ_API_KEY;
 if(!key)throw new Error('Groq fallback is not configured');
 const model=process.env.GROQ_MODEL||'openai/gpt-oss-20b';
 if(!['openai/gpt-oss-20b'].includes(model))throw new Error('Groq model is not on the approved free-plan allowlist');
 const messages=[{role:'system',content:system+' Return only a JSON object with the requested keys.'},{role:'user',content:user}];
 for(let attempt=0;attempt<2;attempt++){
  const response=await pacedRequest(messages,key,model);
  if(response.ok){const data=await response.json();const text=data.choices?.[0]?.message?.content;try{return JSON.parse(text)}catch{throw new Error('Groq returned invalid JSON')}}
  const detail=(await response.text()).slice(0,160);
  if(response.status!==429||attempt===1)throw new Error(`Groq free fallback error ${response.status}: ${detail}`);
 }
 throw new Error('Groq free fallback unavailable');
}
