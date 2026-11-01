// Client for the CoffeeMap AI gateway (workers/ai-gateway). The Worker URL is
// baked in at build time from NEXT_PUBLIC_AI_URL; without it the AI features
// show as unavailable and everything else on the dashboards still works.

export const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? '';
export const aiEnabled = AI_URL.length > 0;

export type AiTask = 'query' | 'explain' | 'brief';

export interface AiQueryResult {
  action: 'filter' | 'rank' | 'compare' | 'trend' | 'unsupported';
  filters?: Record<string, unknown>;
  metric?: string | null;
  groupBy?: string | null;
  period?: { from?: string | null; to?: string | null } | null;
  top?: number | null;
  flyTo?: string | null;
  overlay?: string | null;
  explain?: string;
}

export async function askAi<T = string>(body: {
  task: AiTask;
  project: string;
  lang: 'en' | 'ar';
  schema?: unknown;
  data?: unknown;
  question?: string;
}): Promise<T> {
  if (!aiEnabled) throw new Error('AI is not configured for this site.');
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let payload: { result?: T; error?: string } = {};
  try {
    payload = await res.json();
  } catch {
    // fall through to the error below
  }
  if (!res.ok || payload.result === undefined) throw new Error(payload.error || `AI service error (${res.status})`);
  return payload.result;
}
