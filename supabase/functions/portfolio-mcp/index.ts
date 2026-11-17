// Supabase Edge Function (Deno): Servidor MCP do Portfólio (Issue #20)
// Fornece transporte Stateless HTTP (JSON-RPC 2.0) para agentes AgLoop operarem o portfólio.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import { handleMcpRequest, CORS_HEADERS } from "./service.ts";

export { handleMcpRequest, CORS_HEADERS };

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(async (req) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Serviço mal configurado no servidor (chaves ausentes)." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    return await handleMcpRequest(req, supabase);
  });
}
