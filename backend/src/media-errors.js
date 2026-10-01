/** Public codes and text are deliberately separate from provider stderr. */
export function classifyProcessingError(error){
 const text=String(error?.message??error).toLowerCase();
 if(/sign in to confirm.*bot|cookies.*authentication|captcha/.test(text))return {code:'YOUTUBE_BOT_BLOCK',message:'YouTube did not allow automatic access. Upload the video/audio file or timed SRT/VTT captions.'};
 if(/private video|private and unavailable/.test(text))return {code:'YOUTUBE_PRIVATE',message:'This video is private. Upload a video/audio file or timed captions you are allowed to use.'};
 if(/geo.?restricted|not available in your country/.test(text))return {code:'YOUTUBE_GEO_RESTRICTED',message:'This video is unavailable in this region. Upload a video/audio file or timed captions you are allowed to use.'};
 if(/login|required sign.?in|members only/.test(text))return {code:'YOUTUBE_LOGIN_REQUIRED',message:'This video requires a login. Upload a video/audio file or timed captions you are allowed to use.'};
 if(/429|quota|rate.limit/.test(text))return {code:'RATE_LIMITED',message:'The free transcription service is at its limit. Try again later or upload timed captions.'};
 if(/10.hour|worker budget|storage budget|exceeds.*duration/.test(text))return {code:'VIDEO_RESOURCE_LIMIT',message:'This video exceeds the free worker processing budget. Upload timed SRT/VTT captions instead.'};
 if(/requested format.*not available|format unavailable/.test(text))return {code:'YOUTUBE_FORMAT_UNAVAILABLE',message:'No supported public audio format was available. Upload the media or timed captions.'};
 if(/chunk \d+\//.test(text))return {code:'WHISPER_FAILED',message:'One audio segment could not be transcribed. Try again later or upload timed captions.'};
 if(/audio unavailable|audio download|audio extraction/.test(text))return {code:'AUDIO_EXTRACTION_FAILED',message:'We could not retrieve this video\'s audio. Upload a video/audio file or timed captions.'};
 if(/caption|transcript/.test(text))return {code:'TRANSCRIPT_UNAVAILABLE',message:'No transcript was available automatically. Upload the video/audio file or timed SRT/VTT captions.'};
 if(/video unavailable|removed|does not exist/.test(text))return {code:'YOUTUBE_UNAVAILABLE',message:'This video is unavailable. Check the link or upload a file.'};
 return {code:'UNKNOWN_ERROR',message:'Video processing stopped. Try again, or upload the media or timed captions.'};
}
