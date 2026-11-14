# ImagePrompt.org reconstruction

A responsive, multi-route reconstruction based on the public page content and indexed reference screenshots available in this workspace. The current workspace does not provide a live visual browser, so a number of visual details and interaction states remain unverified; see [`REFERENCE_AUDIT.md`](./REFERENCE_AUDIT.md).

## Run locally

1. Install Node.js 20+ and (for Video to Prompt) `ffmpeg`.
2. Copy `.env.example` to `.env` and fill in the services you want to enable.
3. Install dependencies and start the client and API server:

   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```

   Vite runs on port `5173`; the Express API runs on port `3001`. The browser uses relative `/api/*` URLs and Vite proxies them to the API.

4. Build and run in production mode:

   ```bash
   npm run build
   npm start
   ```

   The production server serves `dist/` and the API from the same port.

## Custom domain: `imagepromptify.xyz`

All in-app navigation and `/api/*` requests use same-origin relative paths, so deploying the built app on `https://imagepromptify.xyz` keeps internal links on that domain without hardcoding it into each route. External asset/CDN, social, email, and provider links remain unchanged.

For production, set `APP_URL=https://imagepromptify.xyz` and (if using Google OAuth) register and set `GOOGLE_CALLBACK_URL=https://imagepromptify.xyz/api/oauth/google/callback` in both the server environment and Google Cloud Console. Configure DNS, HTTPS/TLS, and the host's reverse proxy to route the domain to this app; these infrastructure changes cannot be made from this repository. The included production Express server serves the SPA fallback for deep routes and the API on the same origin. If you deploy static files separately, configure every non-asset route to fall back to `index.html` and proxy `/api/*` to the Express server, or deep links may still return 404. For local OAuth testing, override `APP_URL` with `http://localhost:5173` and `GOOGLE_CALLBACK_URL` with `http://localhost:3001/api/oauth/google/callback` in your local `.env`.

## Optional integrations

- **AI features:** set `OPENAI_API_KEY`. Prompt and image-generation requests are sent to OpenAI from the server; no key is placed in browser code. Image generation uses `OPENAI_IMAGE_MODEL` (default `gpt-image-1`) for the GPT Image selection. Other site model labels (Flux, Imagen 4, Nano Banana) need a compatible server-side `IMAGE_GENERATION_API_URL`; its optional credential is `IMAGE_GENERATION_API_KEY`. Without that adapter the UI reports the selected model is not configured rather than returning a substitute result. The OpenAI image-edit adapter currently submits the first reference image only; use the compatible adapter if multi-reference support is required.
- **Google sign-in:** set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `APP_URL`, and a strong `SESSION_SECRET`. For production, configure a persistent session store instead of Express's in-memory development store.
- **Payments:** set `STRIPE_SECRET_KEY` and the Stripe Price IDs for the plan/pack you intend to enable. The app does not fake successful checkouts.
- **Video analysis:** install `ffmpeg` and `ffprobe` and set `FFMPEG_PATH` / `FFPROBE_PATH` if they are not on `PATH`; the server verifies the 1-minute limit, extracts representative frames, optionally transcribes audio, and sends the analysis to the configured AI model.
- **Feedback delivery:** set `CONTACT_WEBHOOK_URL` to an HTTPS endpoint you control. Without it, the form shows a configuration error rather than claiming a message was delivered.

## Verified limitations

The public site's proprietary backend, authentication database, credit ledger, payment catalog IDs, and original live CSS were not accessible from the available inspection tools. Their exact behavior cannot be claimed as reproduced. Service calls return clear configuration errors until credentials are supplied; no canned text or generated images are presented as real AI results. The mirrored public-site privacy copy is not a guarantee for this reconstruction: when AI is configured, uploaded image/video content and prompts are sent to the selected third-party provider for processing, and its retention terms apply. Do not upload sensitive material unless you have reviewed that provider's policies.

- The development API health check in this workspace reports `ffmpeg` / `ffprobe` unavailable. Install both locally to enable Video to Prompt processing.
- Responsive layout and interaction testing was not completed in a graphical browser: the available headless Chromium binary could not start because the environment is missing `libnspr4.so`. The live preview and build are available, but visual parity at 1440/768/390 px is not verified.
