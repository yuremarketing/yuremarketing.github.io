import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssistantChat } from './useAssistantChat';
import { ASSISTANT_CONTACT_CHANNELS } from '../lib/assistantFaq';

function createSseResponse(chunks) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('useAssistantChat (Issue #35)', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responde perguntas de FAQ instantaneamente sem chamar fetch (zero token)', async () => {
    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Como falo com ele diretamente?');
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({
      role: 'user',
      content: 'Como falo com ele diretamente?',
    });
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toContain(ASSISTANT_CONTACT_CHANNELS.whatsappDisplay);
  });

  it('envia pergunta aberta para a Edge Function com sessionId e processa SSE normalmente', async () => {
    fetchSpy.mockResolvedValueOnce(
      createSseResponse([
        'data: {"delta":"O Yure lançou "}\n\n',
        'data: {"delta":"projetos de IA e web."}\n\n',
        'data: [DONE]\n\n',
      ])
    );

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Quais projetos ele já lançou?');
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.messages).toEqual([{ role: 'user', content: 'Quais projetos ele já lançou?' }]);
    expect(typeof parsedBody.sessionId).toBe('string');
    expect(parsedBody.sessionId.length).toBeGreaterThan(0);

    expect(result.current.error).toBeNull();
    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Quais projetos ele já lançou?' },
      { role: 'assistant', content: 'O Yure lançou projetos de IA e web.' },
    ]);
  });

  it('exibe mensagem amigável de rate limit (429) direto na bolha sem deixar bolha vazia nem error', async () => {
    const customMsg = 'Limite atingido! Fale direto no WhatsApp +55 61 99408-5093.';
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'RATE_LIMITED', error: customMsg, retryAfterSeconds: 45 }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '45' },
      })
    );

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Quais projetos ele já lançou?');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: customMsg });
  });

  it('cai para fallback útil sem LLM na bolha quando a API retorna 502 ou falha de rede', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'LLM_UNAVAILABLE', error: 'indisponível' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Quais projetos ele já lançou?');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toContain(ASSISTANT_CONTACT_CHANNELS.whatsappDisplay);
    expect(result.current.messages[1].content).toContain(ASSISTANT_CONTACT_CHANNELS.email);
  });

  it('não exibe fallback nem erro quando reset() cancela manualmente uma requisição em andamento', async () => {
    fetchSpy.mockImplementationOnce((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const abortErr = new Error('Aborted');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      });
    });

    const { result } = renderHook(() => useAssistantChat());

    let pendingPromise;
    act(() => {
      pendingPromise = result.current.sendMessage('Quais projetos ele já lançou?');
    });

    act(() => {
      result.current.reset();
    });

    await act(async () => {
      await pendingPromise;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isStreaming).toBe(false);
  });
});
