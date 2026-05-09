import { useCallback, useRef, useEffect } from 'react';

const DEBOUNCE_MS = 1000;

export const useNotificationSound = () => {
  const lastPlayedRef = useRef<number>(0);
  // Reuse a single AudioContext — creating one per call leaks and gets suspended
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Create AudioContext on first user gesture to comply with browser autoplay policy
  useEffect(() => {
    const initCtx = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      // Remove listeners once unlocked
      document.removeEventListener('click', initCtx);
      document.removeEventListener('keydown', initCtx);
    };
    document.addEventListener('click', initCtx);
    document.addEventListener('keydown', initCtx);
    return () => {
      document.removeEventListener('click', initCtx);
      document.removeEventListener('keydown', initCtx);
    };
  }, []);

  const playSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayedRef.current < DEBOUNCE_MS) return;
    lastPlayedRef.current = now;

    const ctx = audioCtxRef.current;
    if (!ctx) return; // user hasn't interacted yet — skip silently

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  }, []);

  return { playSound };
};
