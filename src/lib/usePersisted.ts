import { useEffect, useRef, useState } from 'react';

/**
 * Persists a value to the Electron store (falls back to localStorage if the
 * bridge is unavailable, e.g. when running the renderer in a plain browser).
 * Returns [value, setValue, loaded].
 */
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const skipNextWrite = useRef(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (window.neuro?.store) {
          const v = await window.neuro.store.get<T>(key, initial);
          if (alive) setValue(v);
        } else {
          const raw = localStorage.getItem(key);
          if (alive && raw != null) setValue(JSON.parse(raw));
        }
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    if (window.neuro?.store) window.neuro.store.set(key, value);
    else localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
