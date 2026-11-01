# CoffeeMap.dev AI gateway (Cloudflare Worker)

A small serverless gateway between coffeemap.dev and the Claude API. It keeps the API key secret, only accepts three fixed tasks, and limits daily usage so visitors can't run up your bill.

## Tasks

| Task | What the site sends | What comes back |
|---|---|---|
| `query` | `schema` (allowed fields/values) + `question` | A JSON filter the dashboard runs itself ("Ask the map") |
| `explain` | `data` for the clicked area | A short briefing using only those numbers |
| `brief` | `data` for the current view | A Markdown situation report |

All tasks accept `project` and `lang` (`"en"` or `"ar"`).

Example call from the site:

```js
const r = await fetch("https://coffeemap-ai.<your-subdomain>.workers.dev", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ task: "explain", project: "acled", lang: "en", data: { state: "North Darfur", events: 214, fatalities: 1032 } }),
});
const { result, error } = await r.json();
```

## One-time setup (Windows, about 15 minutes)

You need Node.js installed, a Cloudflare account (you already have one) and a Claude API key from https://console.anthropic.com.

1. Put this folder anywhere on your computer (keep `src/index.js` inside a `src` folder), open a terminal in it, and log in:
   ```
   npx wrangler login
   ```
2. Create the usage counter storage:
   ```
   npx wrangler kv namespace create USAGE
   ```
   Copy the `id` it prints into `wrangler.toml`, replacing `PASTE_KV_ID_HERE`.
3. Store your API key as a secret (it is never written to any file):
   ```
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
4. Deploy:
   ```
   npx wrangler deploy
   ```
   It prints your Worker URL, e.g. `https://coffeemap-ai.<name>.workers.dev`. That URL goes into the site as `NEXT_PUBLIC_AI_URL`.

## Cost control

- `DAILY_LIMIT` (default 500) caps AI requests for the whole site per day; `PER_IP_DAILY_LIMIT` (default 40) caps each visitor.
- `MODEL` defaults to Claude Haiku, the cheapest model, which is plenty for these tasks.
- Also set a monthly spend limit in the Anthropic Console as a final safety net.

## Local testing

```
npx wrangler dev
```
Calls from `http://localhost:3000` are allowed, so it works with `npm run dev` on the site.
