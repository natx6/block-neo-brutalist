# puff-yt-worker

YouTube search/stream resolver for Puff. No auth — security relies on the
unguessable Fly URL plus the Vercel server-side proxy. Do not link to this
URL directly from the browser client.

## Deploy

```bash
cd block-app/worker && fly auth login && fly launch --no-deploy
```

Accept the generated name, or keep `puff-yt-worker` (rename in `fly.toml`
if you change it).

```bash
fly secrets set PLACEHOLDER=1  # none needed — skip unless you add secrets
fly deploy
fly status
```

Then copy `https://<app>.fly.dev` into the Vercel env `WORKER_URL`, plus
local `.env.local` for dev:

```
WORKER_URL=https://<app>.fly.dev
```

Note: the first stream after idle takes ~10-20s (Fly cold start + yt-dlp
startup). Subsequent requests on a warm machine are faster.
