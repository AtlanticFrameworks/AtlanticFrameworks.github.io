# BWRP Website — Claude Code Instructions

At the start of every session, read `.claude/SECURITY.md` before making any changes
to workers, HTML files, CSP headers, auth flows, or CSS builds.

## Quick Reference

- **Domain:** bwrp.net (GitHub Pages + Cloudflare proxy)
- **Repo:** AtlanticFrameworks/AtlanticFrameworks.github.io
- **Security worker:** `security-worker/` — deploy with `cd security-worker && npx wrangler deploy`
- **Auth worker:** `worker/` — deploy with `cd worker && npx wrangler deploy`
- **CSS build:** `npm run build:css` (must run after Tailwind class changes)

## Rules

1. Always use absolute paths (`/assets/images/...`) in Tailwind `bg-[url(...)]` classes — never relative.
2. After editing any HTML files that add new external resources, update the CSP in `security-worker/worker.js` and redeploy.
3. Never commit `.claude/` contents — it is gitignored.
4. After CSS changes, rebuild with `npm run build:css` and commit `assets/css/main.css`.
