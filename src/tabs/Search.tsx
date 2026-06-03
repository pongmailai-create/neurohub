import { useCallback, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

const isElectron =
  typeof window !== 'undefined' &&
  (!!(window as any).neuro || /Electron/i.test(navigator.userAgent));

const HOME = 'https://www.google.com';

/** Простой встроенный браузер с Google-поиском (отдельный долгоживущий webview). */
export function Search() {
  const tt = useT();
  const setImmersive = useStore((s) => s.setImmersive);
  const topBarOpen = useStore((s) => s.topBarOpen);
  const ref = useRef<any>(null);
  const [addr, setAddr] = useState(HOME);
  const [loading, setLoading] = useState(false);

  const attach = useCallback((el: any) => {
    ref.current = el;
    if (!el || el.__w) return;
    el.__w = true;
    el.addEventListener('did-start-loading', () => setLoading(true));
    el.addEventListener('did-stop-loading', () => setLoading(false));
    const setU = (e: any) => e?.url && setAddr(e.url);
    el.addEventListener('did-navigate', setU);
    el.addEventListener('did-navigate-in-page', setU);
  }, []);

  const nav = (fn: 'goBack' | 'goForward' | 'reload') => {
    try {
      ref.current?.[fn]?.();
    } catch {
      /* noop */
    }
  };

  const go = (raw: string) => {
    let u = raw.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u))
      u = u.includes('.') && !u.includes(' ')
        ? `https://${u}`
        : `https://www.google.com/search?q=${encodeURIComponent(u)}`;
    try {
      ref.current?.loadURL(u);
    } catch {
      /* noop */
    }
  };

  const iconBtn = 'btn px-2 py-1';

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center gap-1 px-2 py-1 border-b text-sm"
        style={{ borderColor: 'var(--border)', display: topBarOpen ? 'flex' : 'none' }}
      >
        <button className={iconBtn} title={tt('ah.back')} onClick={() => nav('goBack')}>←</button>
        <button className={iconBtn} title={tt('ah.fwd')} onClick={() => nav('goForward')}>→</button>
        <button className={iconBtn} title={tt('ah.reload')} onClick={() => nav('reload')}>↻</button>
        <button className={iconBtn} title={tt('se.home')} onClick={() => go(HOME)}>🏠</button>
        <input
          className="input py-1 text-xs flex-1 mx-1"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go(addr)}
          placeholder={tt('se.ph')}
          spellCheck={false}
        />
        {loading && <span className="spinner mr-1" />}
        <button className={iconBtn} title={tt('ah.full')} onClick={() => setImmersive(true)}>⤢</button>
      </div>
      <div className="flex-1 relative bg-white">
        {isElectron ? (
          <webview
            ref={attach}
            src={HOME}
            partition="persist:neuro"
            allowpopups={true}
            {...({ webpreferences: 'contextIsolation=no' } as any)}
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center muted text-sm">
            Доступно только в среде Electron.
          </div>
        )}
      </div>
    </div>
  );
}
