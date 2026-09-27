# Knowverse frontend demo

A responsive Next.js 16 / React 19 / Tailwind CSS 4 prototype based on the Knowverse UI/UX brief. This is a frontend demo with sample biology data, not an authentication or AI service.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Check production build with `npm run build` and run it with `npm start`.

## Routes

- `/` - landing page
- `/login`, `/signup` - demo auth screens, email form opens dashboard, Google requires an OAuth backend
- `/dashboard` - notebooks, including an in-memory new-notebook interaction
- `/notebook/biology` - video list with a paste-link entry point; browser-only demo processing progresses through named steps without uploading or analyzing the pasted URL
- `/notebook/biology/video/cell-biology` - workspace tabs, editable and regenerable sample blocks, source timestamp seek in a **mock timeline**, MCQ with instant feedback and source links, sample tutor replies (including general-knowledge labels), transcript + notes search, Word document export and browser print-to-PDF

## Not implemented

Without the backend, no persistent data, actual media playback/upload, transcription, AI tutor, real OAuth/email auth or API calls. With backend configured, real email/password auth, notebook/video data, ingestion jobs, provider-generated study artifacts, semantic search and tutor calls use Express/Postgres/Redis/S3. A real AI key is required for non-mock generation and upload transcription. A real integration should replace demo state and example study content. Source timestamps currently seek a mock video timeline, not actual media. Study content is illustrative and not a verified transcript of an actual video.

## Stack

Next.js App Router, TypeScript, React, Tailwind CSS, lucide-react. No external assets or secrets.

## Backend integration

The `backend/` folder has the Express API, pgvector schema, BullMQ worker, S3 adapter, provider interface and Docker Compose services. See `backend/README.md`. Set `NEXT_PUBLIC_API_URL=http://localhost:4000` in `.env.local` to connect. With this unset, the existing self-contained UI demo remains available. No services or keys are bundled.

## Interactive 3D learning map

The landing page and workspace have a lightweight CSS-perspective study map showing the path from source video to timestamped transcript to a study kit. Drag or use the arrow keys to rotate, and use Reset view to return to the starting angle. It is a visual explainer, **not** actual 3D lesson content or a video player. No WebGL bundle, network texture assets, continuous rendering loop, or motion is required; reduced-motion users get transitions disabled. The three-layer layout is tested at desktop and mobile widths.

Recent changes: connected-mode summary opens an editable rich-text notepad seeded with the generated video summary; YouTube videos use IFrame playback and source links seek into them; notebook/video status uses authenticated WebSockets. Gemini adapter supports limited free-tier generation and 1536-dim embeddings when configured with a key, but uploaded-video STT still requires a separate adapter. The full pipeline has not been integration-tested here against live services.

## Video link to editable summary

In connected mode, open a notebook, select **Paste a video link**, and submit a YouTube URL. The API queues video processing. When its status is Ready, open that video and the Summary tab displays the generated summary directly in a rich-text notepad. The editor supports bold, italic, underline, highlight, heading, bullet list, undo, and redo. Choose **Save summary** to persist the edited HTML per user and video in `summary_edits`; a reload returns the saved formatting. The backend sanitizes HTML to permitted formatting tags and strips unsafe tags and attributes. Generated artifacts and timestamped source moments remain separate, so user edits are not misrepresented as verified transcript content.

Without `NEXT_PUBLIC_API_URL`, the interface uses sample biology content. A pasted URL in demo mode advances only simulated status; it does **not** ingest the pasted video or create a real summary for it. Open the sample biology lesson to inspect the notepad. Actual processing needs the running backend dependencies, caption access, and a configured provider. The full ingestion pipeline has not been tested in this environment against Postgres, Redis, S3, or a live AI API.

## Brand asset

The Knowverse K-and-play mark is an original SVG in `public/knowverse-mark.svg`. It appears in the sidebar, mobile navigation, landing page, and authentication screens; `app/icon.svg` provides the favicon. Raster logo exports can be regenerated from the SVG.
