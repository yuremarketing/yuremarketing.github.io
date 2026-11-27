import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from './useTypewriter';

const TEXT = 'Jarvis';

function mockMatchMedia(reduced) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduced });
}

describe('useTypewriter (Issue #30 — HUD/Jarvis)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('mostra o texto completo de imediato quando prefers-reduced-motion: reduce', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useTypewriter(TEXT));

    expect(result.current.typed).toBe(TEXT);
    expect(result.current.done).toBe(true);
  });

  it('mostra o texto completo de imediato quando já foi digitado nesta sessão', () => {
    sessionStorage.setItem('hero-typed-v1', '1');

    const { result } = renderHook(() => useTypewriter(TEXT));

    expect(result.current.typed).toBe(TEXT);
    expect(result.current.done).toBe(true);
  });

  it('revela o texto progressivamente na primeira visita e marca a sessão ao concluir', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useTypewriter(TEXT, { intervalMs: 10 }));

    expect(result.current.typed).toBe('');
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.typed).toBe('J');
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10 * (TEXT.length - 1));
    });
    expect(result.current.typed).toBe(TEXT);
    expect(result.current.done).toBe(true);
    expect(sessionStorage.getItem('hero-typed-v1')).toBe('1');
  });

  it('não quebra quando window.matchMedia e sessionStorage não estão disponíveis', () => {
    const originalMatchMedia = window.matchMedia;
    const originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    // eslint-disable-next-line no-undefined
    window.matchMedia = undefined;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('sessionStorage indisponível');
      },
    });

    expect(() => renderHook(() => useTypewriter(TEXT))).not.toThrow();

    window.matchMedia = originalMatchMedia;
    if (originalSessionStorage) Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
  });
});
