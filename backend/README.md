# Knowverse API

Express 5, PostgreSQL + pgvector, Redis/BullMQ, S3-compatible storage, and a provider adapter. All study features operate on a single timestamped `chunks` table. Every endpoint except `/health` and `/auth/*` requires a Bearer token. The notebook/video owner is checked on every read and mutation.

## Start

Requirements: Node 22+, Docker Compose, and `yt-dlp` on PATH for YouTube captions and optional audio fallback. `ffmpeg` and `ffprobe` are installed via npm static packages for the audio path.

```bash
cp .env.example .env
# Edit JWT_SECRET to a fresh random value (32+ chars); do not commit .env
npm install
# from backend/:
docker compose up -d
npm run migrate
npm run worker     # separate terminal
npm run dev        # separate terminal, http://localhost:4000
```

The `mock` provider is a deterministic development stub. It can generate structured examples from a real YouTube caption track but does **not** truly reason or transcribe uploaded files. For real AI outputs, set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` (model names configurable). A separate `openai` adapter remains available. Gemini 2.5 Flash has a limited free tier, subject to project/rate limits; free-tier content may be used by Google to improve products. Gemini embeddings are requested at 1536 dimensions. Uploaded-video speech transcription uses Gemini Files API plus Gemini 2.5 Flash for supported video formats (MP4, WebM, MOV, MPEG, AVI, FLV, WMV and 3GP), asks for timestamped JSON, and deletes the Gemini file afterward. Free-tier quotas and 2GB per-file limits apply; live calls were not tested here. The OpenAI adapter also supports Whisper with its own key. S3 variables connect to local MinIO by default, but are optional for hosted demos. Never place keys in chat or commit `.env`.

Start the UI from the parent directory with `NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev`. If that variable is unset, the UI runs its original independent demo with sample content. In connected mode, signup/login, notebook creation, video submission, artifact fetch, MCQ, tutor, semantic search and exports call this API. The upload modal expects a YouTube URL or a video file; YouTube source videos use the YouTube IFrame player and timestamps seek the video. Uploaded videos still show a preview placeholder until a secure media playback endpoint is added.

## Endpoints

- `POST /auth/signup`, `POST /auth/login` return JWT.
- `GET /notebooks`, `POST /notebooks`, `GET /notebooks/:id/videos`, `GET /notebooks/:id/search?q=`
- `POST /videos`: multipart `file` or form field `youtube_url`, plus `notebook_id` and optional `title`.
- `GET /videos/:id/status`; `GET /videos/:id/events` is a legacy authenticated SSE stream; `/ws` is the new authenticated WebSocket for video and notebook status. The first socket message contains the Bearer token and subscribed scope/id, never a query-string token.
- `GET /videos/:id/summary-edit`, `PUT /videos/:id/summary-edit` persist the rich-text user-edited Summary in `summary_edits`, separate from generated source data. The PUT endpoint sanitizes HTML, allowing paragraph, break, bold, italic, underline, highlight, heading, and list tags but removing arbitrary attributes and unsafe markup.
- `GET/POST /videos/:id/notes`, `PATCH/DELETE /videos/:id/notes/:noteId` for user-authored persisted additions.
- `GET /videos/:id/artifacts/:type`, `POST /videos/:id/artifacts/:type/regenerate`
- `GET /videos/:id/search?q=`, `POST /videos/:id/explain` (`chunk_id`, optional `question`)
- `POST /videos/:id/tutor/chat` (`message`), `GET /videos/:id/export?type=summary&format=pdf|doc`

The API uses no separate vector DB. A video chunk's embedding is 1536 dimensions; keep provider embedding dimension aligned. Similarity uses pgvector cosine distance. The notebook search joins a notebook's videos and chunks and applies the same vector query. Chunking uses timestamped caption segments aggregated toward ~360 words; live semantic boundary refinement is not implemented. MCQ verification makes a second provider call and drops questions without supported answers. The mock verifier only checks source IDs and its deterministic answer index, so it is **not** content verification.

## Known limitations

- The current environment has no Docker daemon, running Postgres/Redis/MinIO, or provider credentials in the Node process, so end-to-end ingestion against real infrastructure was not run here. Core provider/chunker tests pass; API routes compile and UI build passes. Set up the services to test the full pipeline.
- YouTube caption extraction via yt-dlp depends on the video having accessible captions and on YouTube not blocking extraction. When captions fail and `GROQ_API_KEY` is set, a video with verified duration up to 60 minutes or an unknown watch-page duration triggers a Groq `whisper-large-v3` fallback. It downloads audio via yt-dlp, verifies actual audio duration before contacting Groq, converts and splits into ten-minute mono MP3 chunks below the 25 MB free-tier per-file limit, and requests timed multilingual transcription with automatic language detection. This can still fail if YouTube blocks audio downloading, audio duration cannot be verified, or Groq quota is exhausted; a timed transcript upload remains the recovery route. Uploaded videos need a configured Gemini or OpenAI provider; the mock adapter never fabricates uploaded-video speech.
- Redis Pub/Sub pushes status and artifact events via authenticated WebSockets for both video and notebook subscribers. The legacy SSE endpoint remains for compatibility.
- Exports stream PDF/Word responses rather than saving copies to S3; uploaded media is in S3-compatible storage.
- YouTube playback uses an IFrame API; source timestamps seek the embedded video, subject to the video owner allowing embedding. Uploaded video playback is not implemented. User-authored summary additions persist in `user_notes`, separate from AI-generated artifacts; editing a generated point still changes a session-local copy only.
- No OAuth is configured. Email/password auth is supported, OAuth button shows a clear limitation. Security hardening needed before public production: request throttling, refresh token flow, scoped upload scanning and URL policy review.

Run `npm test` for core tests. Never use demo JWT/S3 passwords or mock AI in production.

Without S3 configuration, uploads (up to 25 MB) are stored as PostgreSQL `bytea` in `video_uploads`; this is only for small demo files and consumes your Neon free database allowance. With S3 variables configured, MinIO/S3 is used instead. The server no longer requires S3 at startup for YouTube processing. A free Render web service must run both the API and BullMQ worker in one process; see `npm run start:all`.

For a single free Render web service, use root directory `backend`, build command `npm install && npm run migrate`, and start command `npm run start:all`. Set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (32+ random characters), `CORS_ORIGIN`, `AI_PROVIDER=gemini`, and `GEMINI_API_KEY` as host environment secrets. If S3 is omitted, video uploads are kept in Postgres and capped at 25 MB. Since free Render sleeps, the BullMQ worker also sleeps while the service is idle; queued videos may wait for a later request to wake it. The API and worker share one process, so this is a demo setup, not a reliable production worker.
