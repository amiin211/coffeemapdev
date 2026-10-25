// CoffeeMap.dev AI gateway (Cloudflare Worker)
// - Hides the Claude API key
// - Only accepts three fixed tasks, so it can't be used as a free general chatbot
// - Daily limits for the whole site and per visitor

const TASKS = {
  // Natural language -> structured filter. The site runs the filter itself,
  // so the model never produces numbers.
  query: {
    max_tokens: 400,
    system: `You convert a user's question about a geospatial dashboard into a JSON query.
You receive the dashboard's SCHEMA (allowed fields, values and operations).
Reply with ONLY one JSON object, no prose, matching:
{"action":"filter"|"rank"|"compare"|"trend"|"unsupported",
 "filters":{...only fields from the schema...},
 "metric":"<schema metric>", "groupBy":"<schema field or null>",
 "period":{"from":"YYYY-MM","to":"YYYY-MM"} or null,
 "top":<int or null>, "flyTo":"<admin name or null>",
 "explain":"<one short sentence restating what will be shown>"}
Use only names and values that appear in the schema. If the question can't be answered from the schema, use "unsupported" and say why in "explain".`,
  },
  // Plain-language explanation of the numbers for one clicked feature.
  explain: {
    max_tokens: 350,
    system: `You are a humanitarian information management analyst.
Write a short briefing (max 80 words) about the selected area, using ONLY the numbers in DATA.
Never invent figures, causes or actors that are not in DATA. If something stands out (spike, drop, unusually high share), say so with the numbers.
Plain language, no headings. Reply in the language given in LANG.`,
  },
  // OCHA-style situation report for the current dashboard view.
  brief: {
    max_tokens: 1200,
    system: `You are a humanitarian information management officer writing a situation report.
Use ONLY the numbers in DATA. Never invent figures, locations, actors or causes.
Format in Markdown:
## Key highlights  (3-5 bullets with numbers)
## Situation overview  (one short paragraph)
## Areas of concern  (bullets: area, what changed, by how much)
## Data notes  (source, period covered, limitations)
Neutral, factual tone. Reply in the language given in LANG.`,
  },
};

const MAX_INPUT_CHARS = 20000;

function cors(origin, env) {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function bump(env, key, limit) {
  const n = parseInt((await env.USAGE.get(key)) || "0", 10);
  if (n >= limit) return false;
  await env.USAGE.put(key, String(n + 1), { expirationTtl: 60 * 60 * 26 });
  return true;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin, env);
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());

    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, headers);
    if (!allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403, headers);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400, headers); }

    const { task, project, schema, data, question, lang } = body || {};
    const cfg = TASKS[task];
    if (!cfg) return json({ error: "Unknown task" }, 400, headers);

    const userContent = [
      `PROJECT: ${String(project || "").slice(0, 80)}`,
      `LANG: ${lang === "ar" ? "Arabic" : "English"}`,
      schema ? `SCHEMA:\n${JSON.stringify(schema)}` : "",
      data ? `DATA:\n${JSON.stringify(data)}` : "",
      question ? `QUESTION: ${String(question).slice(0, 500)}` : "",
    ].filter(Boolean).join("\n\n");
    if (userContent.length > MAX_INPUT_CHARS) return json({ error: "Input too large" }, 413, headers);

    // Usage limits
    const day = new Date().toISOString().slice(0, 10);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!(await bump(env, `ip:${day}:${ip}`, parseInt(env.PER_IP_DAILY_LIMIT, 10))))
      return json({ error: "Daily limit reached for your connection. Try again tomorrow." }, 429, headers);
    if (!(await bump(env, `all:${day}`, parseInt(env.DAILY_LIMIT, 10))))
      return json({ error: "The site's AI quota for today is used up. Try again tomorrow." }, 429, headers);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.MODEL,
        max_tokens: cfg.max_tokens,
        system: cfg.system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.log("Anthropic error", r.status, detail);
      return json({ error: "AI service error" }, 502, headers);
    }
    const out = await r.json();
    const text = (out.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");

    if (task === "query") {
      try {
        const m = text.match(/\{[\s\S]*\}/);
        return json({ result: JSON.parse(m ? m[0] : text) }, 200, headers);
      } catch {
        return json({ result: { action: "unsupported", explain: "Could not understand the question." } }, 200, headers);
      }
    }
    return json({ result: text }, 200, headers);
  },
};
