import {transcribeAudio} from './groq-transcribe.js';
/** Provider choice is isolated here. Local models are not installed on the free worker. */
export function transcriptionProvider(){
 const kind=process.env.TRANSCRIPTION_PROVIDER??'groq';
 if(kind!=='groq')throw new Error('Unsupported TRANSCRIPTION_PROVIDER. Configure groq; local Whisper is not installed.');
 return {kind,transcribeAudio};
}
