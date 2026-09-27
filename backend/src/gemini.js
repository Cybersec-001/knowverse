import {openrouterJson} from './openrouter.js';
import {groqJson} from './groq.js';
import {youtubeId} from './captions.js';
/** Gemini provider implements the same surface as the OpenAI and mock adapters. */
const videoMime = {
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".mov": "video/quicktime",
  ".avi": "video/avi",
  ".webm": "video/webm",
  ".flv": "video/x-flv",
  ".wmv": "video/wmv",
  ".3gp": "video/3gpp",
};
function toSeconds(value) {
  if (typeof value === "number") return value;
  const parts = String(value).split(":").map(Number);
  if (parts.some((x) => !Number.isFinite(x)) || parts.length > 3) return NaN;
  return parts.reduce((n, x) => n * 60 + x, 0);
}
function parseSegments(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Gemini did not return timestamped transcript JSON");
  }
  const segments = data.segments;
  if (!Array.isArray(segments) || !segments.length)
    throw new Error("Gemini returned no timestamped transcript segments");
  return segments
    .map((s) => ({
      text: String(s.text ?? "").trim(),
      start: toSeconds(s.start),
      end: toSeconds(s.end),
    }))
    .filter(
      (s) =>
        s.text &&
        Number.isFinite(s.start) &&
        Number.isFinite(s.end) &&
        s.start >= 0 &&
        s.end >= s.start,
    )
    .sort((a, b) => a.start - b.start);
}

export function geminiProvider() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY required when AI_PROVIDER=gemini");
  const model = process.env.GEMINI_CHAT_MODEL ?? "gemini-3.8-flash",
    embedding = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
  async function call(path, body) {
    const fallback =
      process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
    const paths = [
      path,
      ...(path.includes(`models/${model}:generateContent`) && fallback !== model
        ? [
            path.replace(
              `models/${model}:generateContent`,
              `models/${fallback}:generateContent`,
            ),
          ]
        : []),
    ];
    for (const target of paths) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${target}`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(45000),
          },
        );
        if (r.ok) return r.json();
        const detail = (await r.text()).slice(0, 300);
        if (r.status !== 503)
          throw new Error(`Gemini provider error ${r.status}: ${detail}`);
        if (attempt === 2) {
          if (target === paths.at(-1))
            throw new Error(
              `Gemini provider unavailable after retries: ${detail}`,
            );
          break;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * 2 ** attempt),
        );
      }
    }
    throw new Error("Gemini provider unavailable");
  }
  async function geminiText(system,user){
    // Stable 2.5 Flash-Lite is documented on the Gemini API free tier. No paid-only model.
    const r=await call('models/gemini-2.5-flash-lite:generateContent',{
      systemInstruction:{parts:[{text:system}]},
      contents:[{role:'user',parts:[{text:user}]}],
      generationConfig:{responseMimeType:'application/json',temperature:0.2}
    });
    const text=r.candidates?.[0]?.content?.parts?.map(p=>p.text??'').join('');
    if(!text)throw new Error('Empty Gemini text response');
    return JSON.parse(text);
  }
  async function json(system, user) {
    let last;
    if (process.env.GROQ_API_KEY) try{return await groqJson(system,user)}
      catch(e){last=e;console.warn('Groq free generation unavailable:',String(e.message).slice(0,140))}
    if (process.env.OPENROUTER_API_KEY) try{return await openrouterJson(system,user)}
      catch(e){last=e;console.warn('OpenRouter free generation unavailable:',String(e.message).slice(0,140))}
    try{return await geminiText(system,user)}
    catch(e){throw new Error(`Free text providers unavailable: ${String(e.message).slice(0,220)}; prior: ${String(last?.message??'none').slice(0,100)}`)}
  }
  return {
    kind: "gemini",
    async transcribeYoutube(url) {
      const id = youtubeId(url);
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id ?? ""))
        throw new Error("Invalid YouTube URL");
      const request = {
        contents: [
          {
            role: "user",
            parts: [
              {
                file_data: {
                  file_uri: `https://www.youtube.com/watch?v=${id}`,
                },
              },
              {
                text: "Transcribe the spoken content of this public video faithfully. Return JSON with segments, each with text, start, end in seconds. Use brief timestamped segments; do not invent speech. If speech is unavailable return an empty segments array.",
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              segments: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    text: { type: "STRING" },
                    start: { type: "NUMBER" },
                    end: { type: "NUMBER" },
                  },
                  required: ["text", "start", "end"],
                },
              },
            },
            required: ["segments"],
          },
          temperature: 0.1,
        },
      };
      const response = await call(`models/${model}:generateContent`, request);
      const text = response.candidates?.[0]?.content?.parts
        ?.map((x) => x.text ?? "")
        .join("");
      if (!text) {
        const reason =
          response.candidates?.[0]?.finishReason ??
          response.promptFeedback?.blockReason ??
          "no candidate text";
        throw new Error(
          `Gemini YouTube transcription returned no text (${String(reason).slice(0, 100)})`,
        );
      }
      try {
        return parseSegments(text);
      } catch (e) {
        const diagnostic = {
          finishReason: response.candidates?.[0]?.finishReason ?? null,
          promptFeedback: response.promptFeedback?.blockReason ?? null,
          textPrefix: String(text).slice(0, 300),
        };
        console.error(
          "Gemini YouTube transcript response diagnostic:",
          JSON.stringify(diagnostic),
        );
        throw e;
      }
    },
    async embed(text) {
      const r = await call(`models/${embedding}:embedContent`, {
        model: `models/${embedding}`,
        content: { parts: [{ text }] },
        outputDimensionality: 1536,
      });
      const values = r.embedding?.values;
      if (!Array.isArray(values) || values.length !== 1536)
        throw new Error("Gemini embedding dimension mismatch");
      const norm = Math.hypot(...values) || 1;
      return values.map((x) => x / norm);
    },
    async transcribe(buffer, name) {
      const extension = String(name)
          .toLowerCase()
          .match(/\.[a-z0-9]+$/)?.[0],
        mime = videoMime[extension];
      if (!mime)
        throw new Error("Unsupported video format for Gemini transcription");
      if (!buffer?.length) throw new Error("Empty video upload");
      if (buffer.length > 2 * 1024 * 1024 * 1024)
        throw new Error("Gemini free-tier file limit is 2GB");
      const headers = { "x-goog-api-key": key };
      let fileName;
      try {
        const init = await fetch(
          "https://generativelanguage.googleapis.com/upload/v1beta/files",
          {
            method: "POST",
            headers: {
              ...headers,
              "X-Goog-Upload-Protocol": "resumable",
              "X-Goog-Upload-Command": "start",
              "X-Goog-Upload-Header-Content-Length": String(buffer.length),
              "X-Goog-Upload-Header-Content-Type": mime,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file: { display_name: "Knowverse upload" },
            }),
          },
        );
        if (!init.ok)
          throw new Error(
            `Gemini upload initialization failed (${init.status})`,
          );
        const uploadUrl = init.headers.get("x-goog-upload-url");
        if (
          !uploadUrl ||
          new URL(uploadUrl).origin !==
            "https://generativelanguage.googleapis.com"
        )
          throw new Error("Invalid Gemini upload URL");
        const uploaded = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Length": String(buffer.length),
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize",
          },
          body: buffer,
        });
        if (!uploaded.ok)
          throw new Error(`Gemini upload failed (${uploaded.status})`);
        let file = (await uploaded.json()).file;
        fileName = file?.name;
        if (!/^files\/[a-zA-Z0-9_-]+$/.test(fileName ?? ""))
          throw new Error("Invalid Gemini file response");
        for (
          let attempt = 0;
          file?.state === "PROCESSING" && attempt < 60;
          attempt++
        ) {
          await new Promise((r) => setTimeout(r, 5000));
          const status = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${fileName}`,
            { headers },
          );
          if (!status.ok)
            throw new Error(`Gemini file status failed (${status.status})`);
          file = (await status.json()).file;
        }
        if (file?.state !== "ACTIVE" || !file?.uri)
          throw new Error(
            `Gemini file not ready (${file?.state ?? "unknown"})`,
          );
        const request = {
          contents: [
            {
              role: "user",
              parts: [
                { file_data: { mime_type: mime, file_uri: file.uri } },
                {
                  text: 'Transcribe the spoken content of this video faithfully. Return JSON with segments, each with text, start, end in seconds. Use brief timestamped segments; do not invent speech. If there is no speech, return {"segments":[]}.',
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        };
        const response = await call(`models/${model}:generateContent`, request);
        const text = response.candidates?.[0]?.content?.parts
          ?.map((x) => x.text ?? "")
          .join("");
        if (!text) throw new Error("Empty Gemini transcription response");
        const segments = parseSegments(text);
        if (!segments.length)
          throw new Error("Gemini returned no valid timestamped segments");
        return segments;
      } finally {
        if (fileName)
          await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${fileName}`,
            { method: "DELETE", headers },
          ).catch(() => {});
      }
    },
    async generate(type, chunks) {
      const context = chunks
        .map((c) => `CHUNK ${c.id} [${c.start_ts}-${c.end_ts}]: ${c.text}`)
        .join("\n");
      const schema =
        type === "mcq"
          ? 'Return {"items":[{"question":"...","options":["...","...","...","..."],"correct_index":0,"source_chunk_id":"UUID","explanation":"..."}]}. Include 3-5 questions.'
          : 'Return {"items":[{"heading":"...","bullets":[{"text":"...","source_chunk_id":"UUID"}]}]}. Include 3-5 items.';
      const r = await json(
        `Generate ${type} using only supplied transcript chunks. Cite each claim with one existing chunk UUID. ${schema}`,
        context,
      );
      return r.items ?? [];
    },
    async verifyMcq(item, chunks) {
      const c = chunks.find((x) => x.id === item.source_chunk_id);
      if (
        !c ||
        !Array.isArray(item.options) ||
        !Number.isInteger(item.correct_index) ||
        item.correct_index < 0 ||
        item.correct_index >= item.options.length
      )
        return false;
      const r = await json(
        'Verify marked answer against SOURCE alone. Return {"supported":true|false}. Do not rely on outside knowledge.',
        `SOURCE: ${c.text}\nQUESTION: ${item.question}\nMARKED ANSWER: ${item.options[item.correct_index]}\nEXPLANATION: ${item.explanation}`,
      );
      return r.supported === true;
    },
    async reply(
      question,
      chunks,
      { general = false, history = [], explain = false } = {},
    ) {
      const context = chunks.map((c) => `CHUNK ${c.id}: ${c.text}`).join("\n");
      const r = await json(
        `Return {"answer":"..."}. ${general ? "This is beyond the video; if you answer from general knowledge, make the distinction clear." : "Answer only from supplied chunks; do not invent evidence."} ${explain ? "Explain the concept more deeply." : ""}`,
        `CONTEXT:\n${context}\nRECENT CHAT: ${JSON.stringify(history)}\nQUESTION: ${question}`,
      );
      return r.answer ?? "";
    },
  };
}
