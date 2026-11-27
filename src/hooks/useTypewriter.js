import { useEffect, useState } from 'react';

const SESSION_KEY = 'hero-typed-v1';

function prefersReducedMotion() {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

function hasAlreadyTyped() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markAsTyped() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // sessionStorage indisponível (modo privado, cota excedida etc.) — segue sem persistir
  }
}

export function useTypewriter(text, { intervalMs = 35 } = {}) {
  const [skipAnimation] = useState(() => prefersReducedMotion() || hasAlreadyTyped());
  const [typed, setTyped] = useState(() => (skipAnimation ? text : ''));
  const [done, setDone] = useState(skipAnimation);

  useEffect(() => {
    if (skipAnimation) return;

    let index = 0;
    const id = setInterval(() => {
      index += 1;
      setTyped(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(id);
        setDone(true);
        markAsTyped();
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [skipAnimation, text, intervalMs]);

  return { typed, done };
}
