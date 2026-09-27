import {test} from 'node:test';import assert from 'node:assert/strict';import {groqJson} from '../src/groq.js';
test('Groq JSON fallback uses approved model and only after configured key',async()=>{
 const old=process.env.GROQ_API_KEY,before=global.fetch;delete process.env.GROQ_API_KEY;
 try{await assert.rejects(()=>groqJson('Return {"answer":"..."}','hi'),/not configured/);let sent;
 process.env.GROQ_API_KEY='test-not-real';global.fetch=async(url,opts)=>{sent={url,headers:opts.headers,body:JSON.parse(opts.body)};return {ok:true,status:200,json:async()=>({choices:[{message:{content:'{"answer":"ok"}'}}]})}};
 assert.deepEqual(await groqJson('Return {"answer":"..."}','hi'),{answer:'ok'});
 assert.equal(sent.url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(sent.body.model,'openai/gpt-oss-20b');
 }finally{global.fetch=before;if(old)process.env.GROQ_API_KEY=old;else delete process.env.GROQ_API_KEY}
});
