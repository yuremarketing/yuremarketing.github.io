// Supabase Edge Function (Deno): troca o `code` do OAuth do LinkedIn por um
// access_token e busca o perfil via OpenID Connect userinfo, mantendo
// LINKEDIN_CLIENT_SECRET e o access_token fora do bundle estático e fora da
// resposta ao client (Turno 29, Issue #23).

const ALLOWED_ORIGIN = Deno.env.get("LINKEDIN_ALLOWED_ORIGIN") ?? "https://yuremarketing.github.io";

const DEFAULT_REDIRECT_URIS = [
  "https://yuremarketing.github.io/callback",
  "http://localhost:5173/callback",
];

const ALLOWED_REDIRECT_URIS = new Set(
  (Deno.env.get("LINKEDIN_ALLOWED_REDIRECT_URIS")?.split(",").map((u) => u.trim()).filter(Boolean)) ??
    DEFAULT_REDIRECT_URIS,
);
if (ALLOWED_REDIRECT_URIS.size === 0) {
  for (const uri of DEFAULT_REDIRECT_URIS) ALLOWED_REDIRECT_URIS.add(uri);
}

const MAX_CODE_LENGTH = 2048;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface ExchangeRequestBody {
  code?: string;
  redirect_uri?: string;
}

interface LinkedInUserInfo {
  name?: string;
  email?: string;
  picture?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonError("Método não permitido.", 405);
  }

  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    console.error("LINKEDIN_CLIENT_ID/LINKEDIN_CLIENT_SECRET não configurados nos secrets da função.");
    return jsonError("Login com LinkedIn indisponível no momento.", 500);
  }

  let body: ExchangeRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Corpo da requisição inválido.", 400);
  }

  const code = typeof body.code === "string" ? body.code : "";
  const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri : "";

  if (!code || code.length > MAX_CODE_LENGTH) {
    return jsonError("Código de autorização inválido.", 400);
  }
  // Nunca repassa um redirect_uri arbitrário vindo do client para o LinkedIn —
  // só os valores explicitamente homologados (achado do Tech Lead, Turno 29).
  if (!ALLOWED_REDIRECT_URIS.has(redirectUri)) {
    return jsonError("redirect_uri não autorizado.", 400);
  }

  let accessToken: string;
  try {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      console.warn(`[LinkedIn OAuth] Troca de token falhou com status ${tokenRes.status}`);
      return jsonError("Não foi possível concluir o login com o LinkedIn.", 502);
    }

    const tokenData = await tokenRes.json();
    if (typeof tokenData?.access_token !== "string" || !tokenData.access_token) {
      console.error("[LinkedIn OAuth] Resposta de token sem access_token.");
      return jsonError("Não foi possível concluir o login com o LinkedIn.", 502);
    }
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error("[LinkedIn OAuth] Erro ao trocar code por token:", err);
    return jsonError("Não foi possível concluir o login com o LinkedIn.", 502);
  }

  try {
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      console.warn(`[LinkedIn OAuth] userinfo falhou com status ${userInfoRes.status}`);
      return jsonError("Não foi possível obter o perfil do LinkedIn.", 502);
    }

    const userInfo = await userInfoRes.json();

    // Só repassa claims públicos do OpenID Connect — nunca access_token/id_token
    // ao client (achado do Tech Lead, Turno 29).
    const profile: LinkedInUserInfo = {};
    if (typeof userInfo?.name === "string") profile.name = userInfo.name;
    if (typeof userInfo?.email === "string") profile.email = userInfo.email;
    if (typeof userInfo?.picture === "string" && userInfo.picture.startsWith("https://")) {
      profile.picture = userInfo.picture;
    }

    if (!profile.name) {
      return jsonError("Perfil do LinkedIn incompleto.", 502);
    }

    return new Response(JSON.stringify(profile), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[LinkedIn OAuth] Erro ao buscar userinfo:", err);
    return jsonError("Não foi possível obter o perfil do LinkedIn.", 502);
  }
});
