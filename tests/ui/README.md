# UI regression and screenshot review

Run the existing app, not a separate demo:

```
NEXT_PUBLIC_API_URL=http://localhost:3999 npm run dev
npm run test:ui
npm run test:states
```

No server needs to listen on port 3999. The browser intercepts requests to that test API and supplies isolated responses. No request goes to a production API. Choose a different app address with REVIEW_BASE_URL; choose screenshot output with REVIEW_OUTPUT. CHROME_PATH can select the installed Chrome executable.

The fixtures cover presentation and frontend request contracts, not live account access, actual database writes, AI response quality, media transcription or the real downloadable PDF contents. API fixtures and sample credentials never enter application source.

The first script captures all routes at desktop (1440), laptop (1024), tablet (768), and phone (390) widths; checks overflow and page errors; exercises keyboard search, creation, URL submission, tutor, saved notes, MCQ feedback, export, themes and reduced motion. The second covers empty, loading, failure, processing, error, not-found and signed-out states, and verifies that raw service errors do not appear.

Backend tests remain available with `cd backend && npm test`.
