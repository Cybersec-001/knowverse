/** Free-only text generation: never silently route to a paid model. */
const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function openrouterJson(system, user) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not configured');
  if (!model.endsWith(':free') && model !== 'openrouter/free') throw new Error('OpenRouter model must be free');
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://cybersec-001.github.io/knowverse/', 'X-Title': 'Knowverse'},
      body: JSON.stringify({model, messages: [{role:'system',content:system}, {role:'user',content:user}], temperature:0.2, response_format:{type:'json_object'}, max_tokens:1800})
    });
    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenRouter returned no text');
      try { return JSON.parse(text) } catch { throw new Error('OpenRouter returned non-JSON text') }
    }
    const body = (await response.text()).slice(0,180);
    if (![429,502,503,504].includes(response.status) || attempt === 2) throw new Error(`OpenRouter provider error ${response.status}: ${body}`);
    const raw = Number(response.headers.get('retry-after'));
    await sleep(Number.isFinite(raw) && raw > 0 ? Math.min(raw * 1000, 30000) : 2000 * 2 ** attempt);
  }
}
