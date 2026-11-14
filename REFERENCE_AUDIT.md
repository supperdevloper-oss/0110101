# Reference inspection notes

## Inspection method

The live site was fetched as page text for the home page, tools index, pricing, tool pages, tutorials, inspiration, API, support, account login, affiliate, and legal URLs. Indexed third-party screenshots were also viewed for the home page, Image to Prompt, and AI Image Generator. I attempted a session-local Playwright/Chromium run to inspect the local clone at 1440, 768, and 390 px, but Chromium could not start because this environment lacks `libnspr4.so`; no local screenshots or direct visual comparison were produced. The live CSS, exact dimensions, hover/focus/loading/error states, mobile/tablet layouts, and in-page dropdown behavior therefore remain unverified. Search-index screenshots may be stale and are not treated as proof of the current appearance.

## Routes confirmed from the public site

- `/` — home
- `/tools` — tools index
- `/image-to-prompt`
- `/batch-image-to-prompt`
- `/image-prompt-generator` — Magic Enhance, Edit with AI, Translate
- `/describe-image`
- `/batch-ai-image-describer`
- `/ai-image-generator`
- `/image-to-image`
- `/video-prompt-generator`
- `/image-to-video-prompt`
- `/video-to-prompt`
- `/inspiration` and style routes under `/inspiration/:category/:style`
- `/tutorials` and article routes under `/tutorials/:slug`
- `/pricing`
- `/contact-us`
- `/about-us`
- `/developer/api`
- `/affiliate-program`
- `/auth/login`
- `/legal/privacy-policy`
- `/legal/terms`
- `/legal/refund-policy`

## UI facts visible in the page text

- Image tools accept PNG/JPG/WEBP up to 4 MB. Batch tools state a 20-image maximum and are described as registered-user features.
- Video to Prompt accepts MP4/MOV up to 50 MB and 1 minute; language selection is available.
- Image to Video Prompt exposes camera choices: Auto, Static shot, Subject Tracking, Handheld, Push in, Pull out, Zoom in, Zoom out.
- Prompt-language choices include English, Spanish, French, German, Simplified/Traditional Chinese, Korean, Russian, Japanese, Italian, Portuguese, Arabic, Hindi, Turkish, Vietnamese, and Indonesian.
- The home-page text lists tool cards, Inspiration, user reviews, and FAQs. The tools and pricing page content is described in the README and implemented in the route data.
- Pricing page text lists Free, Standard Monthly, Pro Monthly, Ultimate Monthly, Ultimate Annual, Image Generation Credit packs, and a Prompt Credits Power Pack.

## Known unverified details

- The exact current design system, font files, CSS measurements, breakpoint behavior, all page screenshots, actual authentication/session data, account balances, checkout IDs, and real AI output formatting are not available from the inspected material.
- Some media URLs are linked from the public site's CDN and require those public assets to remain reachable.
- Google OAuth, Stripe, OpenAI, feedback delivery, and video processing require the environment variables and external services documented in `.env.example`.
