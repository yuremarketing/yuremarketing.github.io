// Supabase Edge Function (Deno): proxies chat messages to the Google Gemini
// API and streams the response back as Server-Sent Events, so GEMINI_API_KEY
// never reaches the static GitHub Pages bundle.
// Includes in-memory sliding-window rate limiting (hashed key, zero PII)
// and structured cost/health observability logs without conversation content.

const ALLOWED_ORIGIN = Deno.env.get("ASSISTANT_ALLOWED_ORIGIN") ?? "https://yuremarketing.github.io";
const PRIMARY_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";
const FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-3.8-flash"];
const CANDIDATE_MODELS = Array.from(new Set([PRIMARY_MODEL, ...FALLBACK_MODELS]));

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const RATE_LIMIT_PER_MINUTE = parsePositiveInt(Deno.env.get("ASSISTANT_RATE_LIMIT_MINUTE"), 8);
const RATE_LIMIT_PER_HOUR = parsePositiveInt(Deno.env.get("ASSISTANT_RATE_LIMIT_HOUR"), 30);
const MINUTE_WINDOW_MS = 60_000;
const HOUR_WINDOW_MS = 3_600_000;
const MAX_TRACKED_KEYS = 1000;

const RATE_LIMIT_MESSAGE =
  "Você já conversou bastante por aqui! Para continuar, fale direto com o Yure no WhatsApp (+55 61 99408-5093) ou por e-mail (yure.mark@gmail.com).";

const SYSTEM_PROMPT = `Você é o assistente do portfólio online do Yure Mark, um engenheiro de software.
Responda apenas perguntas sobre o Yure, sua trajetória, seus projetos e como entrar em contato com ele.
Se não souber a resposta, diga isso com honestidade e sugira que o visitante deixe contato para o Yure responder depois.
Nunca invente informações sobre o Yure. Seja breve, direto e cordial. Responda em português do Brasil, a menos que o visitante escreva em outro idioma.`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

interface ChatMessage {
  role: string;
  content: string;
}

interface RateLimitResult {
  allowed: boolean;
  window?: "minute" | "hour";
  retryAfterSeconds?: number;
}

const rateLimitStore = new Map<string, number[]>();

function logEvent(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ source: "assistant-chat", ...payload }));
}

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extraHeaders },
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractClientKeyRaw(req: Request, sessionId?: unknown): string {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return `ip:${cfIp}`;

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return `ip:${firstIp}`;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;

  if (typeof sessionId === "string" && sessionId.trim().length > 0 && sessionId.length <= 128) {
    return `sid:${sessionId.trim()}`;
  }

  return "anonymous";
}

async function hashIdentifier(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pruneRateLimitStore(now: number) {
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const fresh = timestamps.filter((t) => now - t < HOUR_WINDOW_MS);
    if (fresh.length === 0) {
      rateLimitStore.delete(key);
    } else if (fresh.length !== timestamps.length) {
      rateLimitStore.set(key, fresh);
    }
  }

  while (rateLimitStore.size > MAX_TRACKED_KEYS) {
    const oldestKey = rateLimitStore.keys().next().value;
    if (!oldestKey) break;
    rateLimitStore.delete(oldestKey);
  }
}

function checkRateLimit(keyHash: string, now: number): RateLimitResult {
  const existing = rateLimitStore.get(keyHash) ?? [];
  const timestamps = existing.filter((t) => now - t < HOUR_WINDOW_MS);

  if (timestamps.length >= RATE_LIMIT_PER_HOUR) {
    const retryAfterSeconds = Math.max(1, Math.ceil((timestamps[0] + HOUR_WINDOW_MS - now) / 1000));
    rateLimitStore.set(keyHash, timestamps);
    return { allowed: false, window: "hour", retryAfterSeconds };
  }

  const recentMinute = timestamps.filter((t) => now - t < MINUTE_WINDOW_MS);
  if (recentMinute.length >= RATE_LIMIT_PER_MINUTE) {
    const retryAfterSeconds = Math.max(1, Math.ceil((recentMinute[0] + MINUTE_WINDOW_MS - now) / 1000));
    rateLimitStore.set(keyHash, timestamps);
    return { allowed: false, window: "minute", retryAfterSeconds };
  }

  timestamps.push(now);
  rateLimitStore.delete(keyHash);
  rateLimitStore.set(keyHash, timestamps);

  if (rateLimitStore.size > MAX_TRACKED_KEYS) {
    pruneRateLimitStore(now);
  }

  return { allowed: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonError("Método não permitido.", 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("GEMINI_API_KEY não configurada nos secrets da função.");
    return jsonError("Assistente indisponível no momento.", 500);
  }

  let body: { messages?: ChatMessage[]; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Corpo da requisição inválido.", 400);
  }

  const keyHash = await hashIdentifier(extractClientKeyRaw(req, body?.sessionId));
  const rateCheck = checkRateLimit(keyHash, Date.now());
  if (!rateCheck.allowed) {
    const retryAfterSeconds = rateCheck.retryAfterSeconds ?? 60;
    logEvent({
      event: "rate_limited",
      window: rateCheck.window,
      keyHash,
      retryAfterSeconds,
    });
    return jsonError(
      RATE_LIMIT_MESSAGE,
      429,
      { code: "RATE_LIMITED", retryAfterSeconds },
      { "Retry-After": String(retryAfterSeconds) }
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return jsonError("Número de mensagens inválido.", 400);
  }
  for (const m of messages) {
    if (typeof m?.content !== "string" || m.content.length === 0 || m.content.length > MAX_MESSAGE_LENGTH) {
      return jsonError("Mensagem inválida.", 400);
    }
  }

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const GLOBAL_DEADLINE_MS = 16000;
  const ATTEMPT_TIMEOUT_MS = 6000;
  const startTime = Date.now();

  let activeResponse: Response | null = null;
  let chosenModel = "";

  for (const model of CANDIDATE_MODELS) {
    if (Date.now() - startTime >= GLOBAL_DEADLINE_MS) break;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() - startTime >= GLOBAL_DEADLINE_MS) break;

      const remainingTime = Math.max(1000, GLOBAL_DEADLINE_MS - (Date.now() - startTime));
      const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remainingTime);

      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), timeoutMs);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

      try {
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
          }),
          signal: controller.signal,
        });

        if (res.ok && res.body) {
          activeResponse = res;
          chosenModel = model;
          logEvent({
            event: "llm_success",
            model,
            attempt: attempt + 1,
            latencyMs: Date.now() - startTime,
            messageCount: messages.length,
            keyHash,
          });
          break;
        }

        const errText = await res.text().catch(() => "");
        console.warn(`[Assistant] Modelo '${model}' falhou com status ${res.status}: ${errText.slice(0, 150)}`);

        // Se for erro transitório (503 alta demanda ou 429 rate limit) e primeira tentativa, espera backoff
        if ((res.status === 503 || res.status === 429) && attempt === 0) {
          await delay(500);
          continue;
        }
        // Se for 404 (modelo inexistente) ou outro erro não transitório, não faz retry nesse modelo
        break;
      } catch (err) {
        console.warn(`[Assistant] Erro ou timeout ao chamar '${model}' (tentativa ${attempt + 1}):`, err);
        if (attempt === 0) {
          await delay(400);
          continue;
        }
      } finally {
        clearTimeout(tId);
      }
    }

    if (activeResponse) break;
  }

  if (!activeResponse || !activeResponse.body) {
    const elapsed = Date.now() - startTime;
    logEvent({
      event: "llm_all_failed",
      modelsTried: CANDIDATE_MODELS,
      latencyMs: elapsed,
      messageCount: messages.length,
      keyHash,
    });
    return jsonError(
      "Não consegui falar com o assistente agora. Tenta de novo em um instante.",
      502,
      { code: "LLM_UNAVAILABLE" }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = activeResponse!.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch (err) {
              console.error("Falha ao interpretar chunk do Gemini", err);
            }
          }
        }
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Assistant-Model": chosenModel,
    },
  });
});
