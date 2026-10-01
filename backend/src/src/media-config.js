export const CHUNK_SECONDS=600;
// Input bound, not a provider request size. Keep each Whisper request at ten minutes.
export const MAX_AUDIO_SECONDS=10*3600;
export const MAX_AUDIO_CHUNKS=Math.ceil(MAX_AUDIO_SECONDS/CHUNK_SECONDS);
export const MAX_SOURCE_BYTES=Number(process.env.MAX_MEDIA_MB??512)*1024*1024;
export function transcriptionConcurrency(){const n=Number(process.env.TRANSCRIPTION_CONCURRENCY??2);return Number.isInteger(n)?Math.min(4,Math.max(1,n)):2}
