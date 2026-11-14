// Supabase Edge Function (Deno): proxies chat messages to the Google Gemini
// API and streams the response back as Server-Sent Events, so GEMINI_API_KEY
// never reaches the static GitHub Pages bundle.

const ALLOWED_ORIGIN = Deno.env.get("ASSISTANT_ALLOWED_ORIGIN") ?? "https://yuremarketing.github.io";
const PRIMARY_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";
const FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-3.8-flash"];
const CANDIDATE_MODELS = Array.from(new Set([PRIMARY_MODEL, ...FALLBACK_MODELS]));

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;

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

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("Corpo da requisição inválido.", 400);
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
          console.log(`[Assistant] Sucesso com modelo '${model}' (tentativa ${attempt + 1}) em ${Date.now() - startTime}ms`);
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
    console.error(`[Assistant] Todos os modelos falharam após ${elapsed}ms`);
    return jsonError("Não consegui falar com o assistente agora. Tenta de novo em um instante.", 502);
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
    },
  });
});
