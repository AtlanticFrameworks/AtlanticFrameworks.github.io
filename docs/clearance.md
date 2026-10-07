# Clearance terminal

The supplied terminal is served at `/clearance` and `/clearance/` by the security
worker, using the static `clearance.html`, compiled CSS, the page's own
`assets/css/clearance.css`, and `assets/js/clearance.js`.

The trailer fills a responsive 16:9 frame using an absolutely positioned iframe.
The original tactical styling, timed boot sequence, and glitch declassification
reveal are preserved; the header and footer adapt to small screens. Feature
panels and descriptive trailer copy are omitted to avoid revealing upcoming
content. The scanline texture is limited to the login terminal so it never
obscures the trailer. Asset version parameters refresh cached styling on deploy.

`POST /api/clearance/unlock` checks the key in the auth worker. The public page
contains neither the key nor the video ID. The endpoint returns an embed URL only
after successful verification; responses use `Cache-Control: private, no-store`.
Five attempts per IP per minute are allowed using the existing D1 `rate_limits`
table. Database failure denies access. No login cookie or browser storage is used;
disconnecting or refreshing requires the key again.

## GitHub Actions secrets

- `SECRET_TARGET_HASH`: the literal access key, matching the original terminal's
  behavior. Comparison ignores surrounding whitespace and letter case. Despite
  its name, this is not a precomputed SHA-256 digest.
- `SECRET_VIDEO_LINK`: the HTTPS YouTube embed, watch, shorts, or `youtu.be` URL.
  Use a URL, not an entire iframe element. The worker validates it and converts it
  to a `www.youtube-nocookie.com` embed.

The existing auth deployment workflow uploads both values as Cloudflare Worker
secrets. They must never be substituted into HTML, JS, CSS, or a Pages artifact.
Pushing the changed worker and security worker files to `main` runs both deploy
workflows. Both workflows also support manual dispatch. GitHub Pages publishes
the static page using the repository's existing Pages configuration.

The security worker permits `https://www.youtube-nocookie.com` in `frame-src`.
Deploy this header change along with the auth worker before using the page.

## Verification

```sh
npm run build:css
cd worker
node --test tests/clearance.test.cjs
```

After deployment, open `/clearance`, try an invalid key, then a valid key. Confirm
that no YouTube request occurs until the valid key succeeds and the trailer plays.

An authorized viewer can inspect the embed URL and share it. Unlisted YouTube
videos can be watched by anyone who already has their link; this gate prevents
unauthenticated discovery through this site's source and endpoint.
