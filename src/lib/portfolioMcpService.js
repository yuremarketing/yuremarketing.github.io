// Re-exporta a camada de serviço única a partir da Edge Function do MCP
// Garantindo uma única fonte de verdade entre o código de produção e a suíte de testes.
export * from '../../supabase/functions/portfolio-mcp/service.ts';
