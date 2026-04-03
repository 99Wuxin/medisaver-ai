const DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
/** Fixed OpenRouter free-tier model for this app. */
export const OPENROUTER_MODEL_ID = "qwen/qwen3.6-plus:free";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(res) {
  const ra = res.headers.get("Retry-After");
  if (!ra) return null;
  const sec = Number(ra);
  if (!Number.isNaN(sec) && sec >= 0) return Math.min(sec * 1000, 12_000);
  const when = Date.parse(ra);
  if (!Number.isNaN(when)) return Math.min(Math.max(0, when - Date.now()), 12_000);
  return null;
}

export async function fetchWithRetry(url, init, options = {}) {
  const maxAttempts = options.maxAttempts ?? 5;
  const baseMs = options.baseMs ?? 900;
  let lastRes = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, init);
    lastRes = res;
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status === 503;
    if (!retryable || attempt === maxAttempts - 1) return res;
    const fromHeader = parseRetryAfterMs(res);
    const backoff = fromHeader ?? Math.min(baseMs * 2 ** attempt + Math.random() * 400, 10_000);
    await sleep(backoff);
  }
  return lastRes;
}

export function isOpenRouterConfigured(env) {
  return Boolean(String(env?.OPENROUTER_API_KEY || "").trim());
}

export function openRouterModel(_env) {
  return OPENROUTER_MODEL_ID;
}

export function openRouterChatUrl(env) {
  return String(env?.OPENROUTER_API_URL || DEFAULT_CHAT_URL).trim();
}

/**
 * @param {Record<string, unknown>} chatBody - OpenRouter / OpenAI-style body; `model` defaults from env.
 * @returns {Promise<{ ok: boolean, status: number, text: string | null, raw?: unknown }>}
 */
export async function openRouterChatCompletion(env, chatBody) {
  const apiKey = env?.OPENROUTER_API_KEY;
  if (!String(apiKey || "").trim()) {
    return { ok: false, status: 0, text: null, raw: null };
  }

  const url = openRouterChatUrl(env);
  const model = chatBody.model || openRouterModel(env);
  const body = { ...chatBody, model };

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env?.OPENROUTER_HTTP_REFERER || "https://statutebill.com",
      "X-Title": env?.OPENROUTER_APP_TITLE || "Statute Bill"
    },
    body: JSON.stringify(body)
  });

  let raw = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, text: null, raw };
  }

  const msg = raw?.choices?.[0]?.message;
  const content = msg?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((p) => (typeof p?.text === "string" ? p.text : typeof p === "string" ? p : ""))
            .join("")
        : content != null
          ? String(content)
          : null;

  return { ok: true, status: res.status, text, raw };
}
