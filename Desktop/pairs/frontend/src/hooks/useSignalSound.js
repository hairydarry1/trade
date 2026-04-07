import { useEffect, useRef, useCallback } from "react";

const SIGNAL_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAAAD";

export function useSignalSound(enabled = true) {
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(SIGNAL_SOUND);
    audioRef.current.volume = 0.3;
  }, []);

  const playSound = useCallback(() => {
    if (!enabled || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [enabled]);

  return { playSound };
}
