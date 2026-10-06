# Cloudflare feedback backend

This directory moves personal Bangkok Guide state out of GitHub. GitHub remains the source for public code, `places.json`, and `updates.json`.

The Worker exposes:

- `GET /api/health` — public health check
- `GET /api/feedback` — read personal feedback
- `PUT /api/feedback` — merge a full feedback journal using per-field timestamps

D1 is the source of truth. Writes are last-write-wins per `item_id + field`, matching the current `travel/feedback.json` semantics.

## D1 database

The free D1 database already exists and is bound as `DB` in `wrangler.jsonc`.

Apply the schema once before the first deployment:

```bash
npx wrangler@latest d1 migrations apply bangkok-feedback --remote
```

## Set the API token

Generate a long random value locally and store it only as a Worker secret:

```bash
openssl rand -hex 32
npx wrangler@latest secret put API_TOKEN
```

Do not commit the token.

## Deploy

```bash
npx wrangler@latest deploy
```

The deployment returns a `*.workers.dev` URL. The public GitHub Pages origin allowed by CORS is configured as `https://vgleb.github.io`.

## Import existing private feedback

Do not copy `travel/feedback.json` into this public repository.

Run the helper from a machine that has a temporary private copy:

```bash
FEEDBACK_API_URL=https://bangkok-feedback.<account>.workers.dev \
FEEDBACK_API_TOKEN=<secret> \
node import-feedback.mjs /path/to/travel/feedback.json
```

After migration, verify with an authorized `GET /api/feedback` before switching the browser client away from GitHub.

## Cutover plan

1. Deploy Worker + D1.
2. Import the current private `travel/feedback.json`.
3. Verify record count and several known `visited/seen/rejected` values.
4. Change Bangkok Guide client sync from GitHub Contents API to this Worker.
5. Keep the existing localStorage journal as the offline queue.
6. Remove GitHub PAT UI only after the D1 path is verified.
7. Optionally keep a read-only GitHub snapshot later for ChatGPT connector access; D1 remains authoritative.
