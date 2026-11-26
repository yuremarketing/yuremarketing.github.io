import { useCallback, useRef, useState } from 'react';
import {
  ASSISTANT_CONTACT_CHANNELS,
  buildOfflineFallback,
  matchAssistantFaq,
} from '../lib/assistantFaq';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/assistant-chat`;

const DEFAULT_RATE_LIMIT_MESSAGE = `Você já conversou bastante por aqui! Para continuar, fale direto com o Yure no WhatsApp (${ASSISTANT_CONTACT_CHANNELS.whatsappDisplay}) ou por e-mail (${ASSISTANT_CONTACT_CHANNELS.email}).`;

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const manualAbortRef = useRef(false);
  const sessionIdRef = useRef(null);

  if (!sessionIdRef.current) {
    sessionIdRef.current = createSessionId();
  }

  const setLastAssistantContent = useCallback((content) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { role: 'assistant', content };
      return updated;
    });
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage = { role: 'user', content: trimmed };

      // Camada determinística (FAQ): responde na hora sem chamar API nem gastar token
      const faqMatch = matchAssistantFaq(trimmed);
      if (faqMatch) {
        setMessages([...messages, userMessage, { role: 'assistant', content: faqMatch.answer }]);
        setError(null);
        return;
      }

      const historyForRequest = [...messages, userMessage];
      setMessages([...historyForRequest, { role: 'assistant', content: '' }]);
      setIsStreaming(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(FUNCTIONS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            messages: historyForRequest,
            sessionId: sessionIdRef.current,
          }),
          signal: controller.signal,
        });

        // Checar 429 ANTES do guarda genérico !response.ok para exibir a mensagem amigável na bolha
        if (response.status === 429) {
          let rateLimitMsg = DEFAULT_RATE_LIMIT_MESSAGE;
          try {
            const payload = await response.json();
            if (typeof payload?.error === 'string' && payload.error.trim()) {
              rateLimitMsg = payload.error.trim();
            }
          } catch {
            // mantém mensagem amigável padrão
          }
          setLastAssistantContent(rateLimitMsg);
          setError(null);
          return;
        }

        if (!response.ok || !response.body) {
          throw new Error('request-failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data:')) continue;
            const jsonStr = trimmedLine.slice(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.delta) {
                assistantText += parsed.delta;
                setLastAssistantContent(assistantText);
              }
            } catch {
              // ignora chunk malformado
            }
          }
        }

        if (!assistantText.trim()) {
          setLastAssistantContent(buildOfflineFallback(trimmed));
          setError(null);
        }
      } catch (err) {
        if (err?.name !== 'AbortError' || !manualAbortRef.current) {
          setLastAssistantContent(buildOfflineFallback(trimmed));
          setError(null);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsStreaming(false);
        abortRef.current = null;
        manualAbortRef.current = false;
      }
    },
    [messages, isStreaming, setLastAssistantContent]
  );

  const reset = useCallback(() => {
    manualAbortRef.current = true;
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  return { messages, sendMessage, isStreaming, error, reset };
}
