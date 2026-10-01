export function stageMessage(v){
 if(v.processing_stage==='transcribing_audio')return `Transcribing ${v.completed_audio_chunks??0}/${v.total_audio_chunks??0} audio segments`;
 return ({metadata:'Detecting video duration',selecting_transcript:'Checking public captions',preparing_audio:'Preparing audio',splitting_audio:'Splitting audio',transcript_saved:'Transcript saved',detecting_chapters:'Detecting chapters',generating:'Generating learning material',ready:'Learning material ready'})[v.processing_stage]??'Waiting for processing';
}
