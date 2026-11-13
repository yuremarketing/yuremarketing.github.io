import { useCallback, useRef, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/assistant-chat`;

export function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage = { role: 'user', content: trimmed };
      const historyForRequest = [...messages, userMessage];
      setMessages([...historyForRequest, { role: 'assistant', content: '' }]);
      setIsStreaming(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(FUNCTIONS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ messages: historyForRequest }),
          signal: controller.signal,
        });

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
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantText };
                  return updated;
                });
              }
            } catch {
              // ignora chunk malformado
            }
          }
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError('Não consegui falar com o assistente agora. Tenta de novo em um instante.');
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  return { messages, sendMessage, isStreaming, error, reset };
}
