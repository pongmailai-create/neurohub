import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AI_SERVICES, type AIService } from '@shared/constants';
import { usePersisted } from '../lib/usePersisted';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

const isElectron =
  typeof window !== 'undefined' &&
  (!!(window as any).neuro || /Electron/i.test(navigator.userAgent));

const IDLE_MS = 20 * 60 * 1000;
const MAX_ALIVE = 6;

// Читалка: инъекция CSS для комфортного чтения (вкл/выкл).
const READER_JS = `(()=>{let o=document.getElementById('__neuro_reader');if(o){o.remove();return 'off';}
const s=document.createElement('style');s.id='__neuro_reader';
s.textContent='html{font-size:19px!important;background:#f7f3e9!important}body{max-width:780px!important;margin:0 auto!important;padding:32px!important;line-height:1.75!important;color:#1b1b1b!important;background:#f7f3e9!important}img,video{max-width:100%!important;height:auto!important}*{font-family:Georgia,serif!important}';
document.documentElement.appendChild(s);return 'on';})()`;

interface Bookmark {
  title: string;
  url: string;
}
interface CustomSite {
  id: string;
  name: string;
  url: string;
  color: string;
}

export function AIHub() {
  const tt = useT();
  const immersive = useStore((s) => s.immersive);
  const setImmersive = useStore((s) => s.setImmersive);
  const topBarOpen = useStore((s) => s.topBarOpen);
  const lang = useStore((s) => s.lang);
  const showBars = !immersive && topBarOpen;

  const hiddenAI = useStore((s) => s.hiddenAI);
  const toggleHiddenAI = useStore((s) => s.toggleHiddenAI);
  const [custom, setCustom] = usePersisted<CustomSite[]>('ai.customSites', []);
  const services: AIService[] = useMemo(
    () => [...AI_SERVICES.filter((s) => !hiddenAI.includes(s.id)), ...custom],
    [custom, hiddenAI],
  );
  const [moreOpen, setMoreOpen] = useState(false);

  const [activeId, setActiveId] = useState(
    () => localStorage.getItem('neuro.activeAI') || AI_SERVICES[0].id,
  );
  const [mounted, setMounted] = useState<string[]>([activeId]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | undefined>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [addr, setAddr] = useState('');
  const [showMarks, setShowMarks] = useState(false);
  const [split, setSplit] = useState(false);
  const [paneB, setPaneB] = useState('');
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [findRes, setFindRes] = useState({ active: 0, total: 0 });
  const [listening, setListening] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [bookmarks, setBookmarks] = usePersisted<Bookmark[]>('ai.bookmarks', []);
  const lastSeen = useRef<Record<string, number>>({ [activeId]: Date.now() });
  const refs = useRef<Record<string, any>>({});
  const trTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const trBusy = useRef(false);

  // При смене активного ИИ или размонтировании останавливаем фоновый перевод.
  useEffect(() => {
    return () => {
      if (trTimer.current) {
        clearInterval(trTimer.current);
        trTimer.current = null;
      }
    };
  }, [activeId]);

  const active = services.find((s) => s.id === activeId) ?? services[0];
  const curUrl = urls[activeId] || active.url;
  const isLive = mounted.includes(activeId);

  useEffect(() => setAddr(curUrl), [curUrl, activeId]);

  const prune = (list: string[], keepId: string): string[] => {
    const now = Date.now();
    let keep = list.filter((id) => id === keepId || now - (lastSeen.current[id] ?? 0) < IDLE_MS);
    if (keep.length > MAX_ALIVE) {
      const others = keep
        .filter((id) => id !== keepId)
        .sort((a, b) => (lastSeen.current[b] ?? 0) - (lastSeen.current[a] ?? 0))
        .slice(0, MAX_ALIVE - 1);
      keep = [keepId, ...others];
    }
    return keep;
  };

  const open = (id: string) => {
    setActiveId(id);
    localStorage.setItem('neuro.activeAI', id);
    lastSeen.current[id] = Date.now();
    setMounted((m) => prune(m.includes(id) ? m : [...m, id], id));
  };

  // Выгрузить конкретный сайт из ОЗУ
  const unload = (id: string) => {
    setMounted((m) => m.filter((x) => x !== id));
    delete refs.current[id];
  };

  const ensureMount = (id: string) => {
    lastSeen.current[id] = Date.now();
    setMounted((m) => prune(m.includes(id) ? m : [...m, id], activeId));
  };

  const toggleSplit = () => {
    if (split) {
      setSplit(false);
      return;
    }
    const other = services.find((s) => s.id !== activeId) ?? services[0];
    setPaneB(other.id);
    ensureMount(other.id);
    setSplit(true);
  };

  // Геометрия webview для обычного/сплит режима
  const geom = (id: string): CSSProperties => {
    if (split) {
      if (id === activeId) return { display: 'flex', left: 0, width: '50%', right: 'auto' };
      if (id === paneB) return { display: 'flex', left: '50%', width: '50%', right: 'auto' };
      return { display: 'none' };
    }
    return id === activeId ? { display: 'flex', left: 0, right: 0 } : { display: 'none' };
  };

  useEffect(() => {
    const t = setInterval(() => {
      if (mounted.includes(activeId)) lastSeen.current[activeId] = Date.now();
      setMounted((m) => prune(m, activeId));
    }, 30_000);
    return () => clearInterval(t);
  }, [activeId, mounted]);

  // Поиск/сплит: из самого сайта (мост), из нашего UI и по горячим клавишам.
  useEffect(() => {
    const off = window.neuro?.find?.onOpen(() => setFindOpen(true));
    const onFind = () => setFindOpen(true);
    const onSplit = () => toggleSplit();
    window.addEventListener('neuro:hk-find', onFind);
    window.addEventListener('neuro:hk-split', onSplit);
    return () => {
      off?.();
      window.removeEventListener('neuro:hk-find', onFind);
      window.removeEventListener('neuro:hk-split', onSplit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, activeId, paneB]);

  const attach = useCallback(
    (id: string) => (el: any) => {
      refs.current[id] = el;
      if (!el || el.__wired) return;
      el.__wired = true;
      const setUrl = (e: any) => e?.url && setUrls((s) => ({ ...s, [id]: e.url }));
      el.addEventListener('did-start-loading', () => {
        setLoading((s) => ({ ...s, [id]: true }));
        setError((s) => ({ ...s, [id]: undefined }));
      });
      el.addEventListener('did-stop-loading', () => setLoading((s) => ({ ...s, [id]: false })));
      el.addEventListener('did-navigate', setUrl);
      el.addEventListener('did-navigate-in-page', setUrl);
      el.addEventListener('did-fail-load', (e: any) => {
        if (e.errorCode && e.errorCode !== -3) {
          setError((s) => ({ ...s, [id]: `${e.errorDescription} (${e.errorCode})` }));
          setLoading((s) => ({ ...s, [id]: false }));
        }
      });
      el.addEventListener('found-in-page', (e: any) => {
        if (e.result) setFindRes({ active: e.result.activeMatchOrdinal ?? 0, total: e.result.matches ?? 0 });
      });
    },
    [],
  );

  const view = () => refs.current[activeId];
  const nav = (fn: 'goBack' | 'goForward' | 'reload') => {
    try {
      view()?.[fn]?.();
    } catch {
      /* noop */
    }
  };
  const go = (raw: string) => {
    let u = raw.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u))
      u = u.includes('.') && !u.includes(' ') ? `https://${u}` : `https://www.google.com/search?q=${encodeURIComponent(u)}`;
    try {
      view()?.loadURL(u);
    } catch {
      /* noop */
    }
  };
  // Перевод страницы НА МЕСТЕ. Собираем НОВЫЕ (ещё не переведённые) текстовые
  // узлы, переводим в главном процессе (минуя CSP), подставляем обратно.
  // Уже обработанные узлы помечаются в WeakSet, поэтому фоновый цикл подхватывает
  // только свежий текст (новые сообщения чата, подгруженный контент и т.д.).
  const stopTrLoop = () => {
    if (trTimer.current) {
      clearInterval(trTimer.current);
      trTimer.current = null;
    }
  };
  // Один проход: забрать новые узлы → перевести → вставить. Возвращает true, если что-то перевёл.
  const trSweep = async () => {
    const v = view();
    if (!v || !window.neuro?.translatePage || trBusy.current) return;
    trBusy.current = true;
    try {
      const res: { start: number; texts: string[] } = await v
        .executeJavaScript(
          `(()=>{const w=window;if(!w.__tset){w.__tset=new WeakSet();w.__ntr=[];w.__orig=[];}const start=w.__ntr.length;const wk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=wk.nextNode()){if(w.__tset.has(n))continue;const tx=n.nodeValue;const pn=(n.parentNode&&n.parentNode.nodeName)||'';if(tx&&tx.trim().length>1&&/[A-Za-zА-Яа-яÀ-ÿ]/.test(tx)&&!/SCRIPT|STYLE|NOSCRIPT|TEXTAREA/.test(pn)){w.__tset.add(n);w.__ntr.push(n);w.__orig.push(tx);}}return {start,texts:w.__orig.slice(start)};})()`,
        )
        .catch(() => ({ start: 0, texts: [] as string[] }));
      if (!res.texts.length) return;
      const translated = await window.neuro.translatePage(res.texts, lang);
      await v
        .executeJavaScript(
          `((start,arr)=>{const w=window;if(!w.__ntr)return;for(let i=0;i<arr.length;i++){const nd=w.__ntr[start+i];if(nd)nd.nodeValue=arr[i];}w.__neuroTr=true;return true;})(${res.start},${JSON.stringify(translated)})`,
        )
        .catch(() => {});
    } finally {
      trBusy.current = false;
    }
  };
  const translate = async () => {
    const v = view();
    if (!v || !window.neuro?.translatePage) return;
    const isOn = await v.executeJavaScript('!!window.__neuroTr').catch(() => false);
    if (isOn) {
      stopTrLoop();
      await v
        .executeJavaScript(
          `(()=>{const w=window;if(w.__ntr&&w.__orig){for(let i=0;i<w.__ntr.length;i++){if(w.__ntr[i])w.__ntr[i].nodeValue=w.__orig[i];}}w.__tset=new WeakSet();w.__ntr=[];w.__orig=[];w.__neuroTr=false;return true;})()`,
        )
        .catch(() => {});
      return;
    }
    await trSweep();
    // Фоновый цикл: продолжаем переводить появляющийся текст, пока перевод включён.
    stopTrLoop();
    trTimer.current = setInterval(trSweep, 2000);
  };
  const reader = () => view()?.executeJavaScript(READER_JS).catch(() => {});
  const addBookmark = () => {
    if (bookmarks.some((b) => b.url === curUrl)) return;
    setBookmarks([{ title: active.name, url: curUrl }, ...bookmarks].slice(0, 50));
  };
  const autofill = async () => {
    const v = view();
    if (!v || !window.neuro?.vault) return;
    let host = '';
    try {
      host = new URL(curUrl).hostname.replace(/^www\./, '');
    } catch {
      /* noop */
    }
    const list = await window.neuro.vault.list();
    const match = list.find((e) => {
      const s = e.site.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
      return s && host && (host.includes(s) || s.includes(host));
    });
    if (!match) {
      alert(tt('ah.noVault'));
      return;
    }
    const js = `(()=>{function set(el,val){const p=Object.getPrototypeOf(el);const d=Object.getOwnPropertyDescriptor(p,'value');d&&d.set&&d.set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
const pw=document.querySelector('input[type=password]');
const user=document.querySelector('input[type=email],input[autocomplete=username],input[name*=email i],input[name*=login i],input[name*=user i],input[type=text]');
if(user)set(user,${JSON.stringify(match.login)});
if(pw)set(pw,${JSON.stringify(match.password)});
return !!(user||pw);})()`;
    v.executeJavaScript(js).catch(() => {});
  };

  // Поиск по странице
  const doFind = (text: string, opts?: { forward?: boolean; next?: boolean }) => {
    setFindText(text);
    const v = view();
    if (!v) return;
    if (!text) {
      v.stopFindInPage('clearSelection');
      setFindRes({ active: 0, total: 0 });
      return;
    }
    try {
      v.findInPage(text, { forward: opts?.forward ?? true, findNext: opts?.next ?? false });
    } catch {
      /* noop */
    }
  };
  const closeFind = () => {
    try {
      view()?.stopFindInPage('clearSelection');
    } catch {
      /* noop */
    }
    setFindOpen(false);
    setFindText('');
    setFindRes({ active: 0, total: 0 });
  };

  // Заглушить/включить звук конкретного сайта
  const muteId = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    const next = !muted[id];
    try {
      el.setAudioMuted(next);
    } catch {
      /* noop */
    }
    setMuted((s) => ({ ...s, [id]: next }));
  };
  const toggleMute = () => muteId(activeId);

  // Скрыть встроенный сайт / удалить кастомный с верхней панели
  const hideOrDelete = (id: string) => {
    const isCustom = custom.some((c) => c.id === id);
    unload(id);
    if (isCustom) setCustom(custom.filter((c) => c.id !== id));
    else toggleHiddenAI(id);
    if (activeId === id) {
      const next = services.find((s) => s.id !== id) ?? AI_SERVICES[0];
      setActiveId(next.id);
    }
  };

  // Голосовой ввод → вставка в активное поле сайта
  const startVoice = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      alert(tt('ah.voiceNA'));
      return;
    }
    try {
      const r = new SR();
      r.lang = 'ru-RU';
      r.interimResults = false;
      r.maxAlternatives = 1;
      setListening(true);
      r.onresult = (ev: any) => {
        const text = ev.results?.[0]?.[0]?.transcript ?? '';
        if (text) {
          navigator.clipboard.writeText(text).catch(() => {});
          const js = `(()=>{const el=document.activeElement;if(el&&'value' in el){const p=Object.getPrototypeOf(el);const d=Object.getOwnPropertyDescriptor(p,'value');const nv=(el.value||'')+${JSON.stringify(' ' + text)};d&&d.set?d.set.call(el,nv):el.value=nv;el.dispatchEvent(new Event('input',{bubbles:true}));return true;}return false;})()`;
          view()?.executeJavaScript(js).catch(() => {});
        }
      };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      r.start();
    } catch {
      setListening(false);
    }
  };

  const addCustom = () => {
    let url = newUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      /* noop */
    }
    const site: CustomSite = {
      id: crypto.randomUUID(),
      name: newName.trim() || host,
      url,
      color: '#64748b',
    };
    setCustom([...custom, site]);
    setNewUrl('');
    setNewName('');
    setAdding(false);
    open(site.id);
  };

  const iconBtn = 'btn px-2 py-1';
  const chipCtrl =
    'w-5 h-5 rounded-full text-[11px] leading-none flex items-center justify-center hover:scale-110 transition-transform';

  return (
    <div className="h-full flex flex-col">
      {/* Переключатель сервисов */}
      {showBars && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b" style={{ borderColor: 'var(--border)' }}>
          {services.map((s) => {
            const live = mounted.includes(s.id);
            const isCustom = custom.some((c) => c.id === s.id);
            return (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-lg border pl-1 pr-1.5 py-0.5"
                style={{
                  background: active.id === s.id ? s.color : 'transparent',
                  borderColor: active.id === s.id ? s.color : 'var(--border)',
                  boxShadow: active.id === s.id ? `0 0 12px ${s.color}77` : 'none',
                }}
              >
                <button
                  onClick={() => open(s.id)}
                  title={live ? tt('ah.inMemory') : tt('ah.willLoad')}
                  className="px-2 py-1 text-sm font-medium transition-transform duration-200 active:scale-95"
                  style={{ color: active.id === s.id ? '#fff' : 'var(--text)' }}
                >
                  {live && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: muted[s.id] ? 'var(--err)' : 'var(--ok)' }} />}
                  {s.name}
                </button>
                {/* Управление сайтом: всегда видно, кнопки в ряд */}
                {live && (
                  <>
                    <button className={chipCtrl} title={muted[s.id] ? tt('ah.unmuteSite') : tt('ah.muteSite')}
                      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
                      onClick={(e) => { e.stopPropagation(); muteId(s.id); }}>
                      {muted[s.id] ? '🔇' : '🔊'}
                    </button>
                    <button className={chipCtrl} title={tt('ah.unloadSite')}
                      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
                      onClick={(e) => { e.stopPropagation(); unload(s.id); }}>
                      ⏏
                    </button>
                  </>
                )}
                <button className={chipCtrl} title={isCustom ? tt('ah.deleteSite') : tt('ah.hideSite')}
                  style={{ background: 'var(--err)', color: '#fff' }}
                  onClick={(e) => { e.stopPropagation(); hideOrDelete(s.id); }}>
                  ✕
                </button>
              </span>
            );
          })}

          {/* Добавить свой сайт */}
          {adding ? (
            <span className="inline-flex items-center gap-1 anim-pop">
              <input className="input py-1 text-xs w-44" placeholder={tt('ah.siteAddr')} value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} autoFocus />
              <input className="input py-1 text-xs w-28" placeholder={tt('ah.siteName')} value={newName}
                onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
              <button className="btn btn-accent text-xs" onClick={addCustom}>OK</button>
              <button className="btn text-xs" onClick={() => setAdding(false)}>✕</button>
            </span>
          ) : (
            <button className="btn text-sm px-2.5 py-1.5" title={tt('ah.addSite')} onClick={() => setAdding(true)}>＋</button>
          )}
        </div>
      )}

      {/* Панель навигации */}
      {isElectron && showBars && (
        <div className="flex items-center gap-1 px-2 py-1 border-b text-sm relative" style={{ borderColor: 'var(--border)' }}>
          <button className={iconBtn} title={tt('ah.back')} onClick={() => nav('goBack')}>←</button>
          <button className={iconBtn} title={tt('ah.fwd')} onClick={() => nav('goForward')}>→</button>
          <button className={iconBtn} title={tt('ah.reload')} onClick={() => nav('reload')}>↻</button>
          <input className="input py-1 text-xs flex-1 mx-1" value={addr}
            onChange={(e) => setAddr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go(addr)}
            placeholder={tt('ah.addr')} spellCheck={false} />
          {loading[activeId] && <span className="spinner mr-1" />}
          {/* Важные — всегда видны */}
          <button className={iconBtn} title={tt('ah.find')} onClick={() => setFindOpen(true)}>🔎</button>
          <button className={iconBtn} title={tt('ah.split')} onClick={toggleSplit}
            style={split ? { background: 'var(--accent)', color: '#04121a' } : undefined}>⊟</button>
          <button className={iconBtn} title={tt('ah.full')} onClick={() => setImmersive(true)}>⤢</button>
          {/* Остальное — в меню */}
          <button className={iconBtn} title={tt('ah.more')} onClick={() => setMoreOpen((v) => !v)}
            style={moreOpen ? { borderColor: 'var(--accent)' } : undefined}>⋯</button>

          {moreOpen && (
            <div className="absolute right-2 top-full mt-1 panel z-50 p-1 anim-pop flex flex-col text-sm" onMouseLeave={() => setMoreOpen(false)}>
              <button className="btn text-left mb-0.5" onClick={() => { autofill(); setMoreOpen(false); }}>{tt('ah.autofill')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { addBookmark(); setMoreOpen(false); }}>{tt('ah.bookmarkAdd')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { setShowMarks((v) => !v); setMoreOpen(false); }}>{tt('ah.bookmarks')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { translate(); setMoreOpen(false); }}>{tt('ah.translate')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { reader(); setMoreOpen(false); }}>{tt('ah.reader')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { toggleMute(); setMoreOpen(false); }}>{muted[activeId] ? tt('ah.unmute') : tt('ah.mute')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { startVoice(); setMoreOpen(false); }}>{tt('ah.voice')}</button>
              <button className="btn text-left" onClick={() => { unload(activeId); setMoreOpen(false); }}>{tt('ah.unload')}</button>
            </div>
          )}

          {showMarks && (
            <div className="absolute right-2 top-full mt-1 w-72 max-h-72 overflow-auto panel z-50 p-1 anim-pop">
              {bookmarks.length === 0 && <div className="muted text-xs p-2">{tt('ah.noBookmarks')}</div>}
              {bookmarks.map((b) => (
                <div key={b.url} className="flex items-center gap-1 group rounded px-1 hover:bg-black/10">
                  <button className="flex-1 text-left text-xs py-1 truncate" title={b.url}
                    onClick={() => { go(b.url); setShowMarks(false); }}>
                    {b.title} <span className="muted">— {b.url}</span>
                  </button>
                  <button className="muted opacity-0 group-hover:opacity-100 px-1"
                    onClick={() => setBookmarks(bookmarks.filter((x) => x.url !== b.url))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Браузеры */}
      <div className="flex-1 relative bg-white">
        {isElectron ? (
          <>
            {mounted.map((id) => {
              const svc = services.find((s) => s.id === id);
              if (!svc) return null;
              return (
                <webview key={id} ref={attach(id)} src={svc.url} partition="persist:neuro"
                  allowpopups={true} {...({ webpreferences: 'contextIsolation=no' } as any)}
                  className="absolute top-0 bottom-0 h-full"
                  style={geom(id)} />
              );
            })}

            {/* Селекторы сайтов для панелей сплита */}
            {split && (
              <>
                <select
                  className="input absolute top-1 left-1 z-40 py-0.5 text-xs w-40"
                  value={activeId}
                  onChange={(e) => { if (e.target.value !== paneB) open(e.target.value); }}
                >
                  {services.filter((s) => s.id !== paneB).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select
                  className="input absolute top-1 z-40 py-0.5 text-xs w-40"
                  style={{ left: 'calc(50% + 4px)' }}
                  value={paneB}
                  onChange={(e) => { if (e.target.value !== activeId) { setPaneB(e.target.value); ensureMount(e.target.value); } }}
                >
                  {services.filter((s) => s.id !== activeId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="absolute top-0 bottom-0 z-30 w-px" style={{ left: '50%', background: 'var(--border)' }} />
              </>
            )}

            {findOpen && (
              <div className="absolute top-2 right-2 z-50 panel p-1.5 flex items-center gap-1 anim-pop">
                <input autoFocus className="input py-1 text-xs w-48" placeholder={tt('ah.findPh')}
                  value={findText} onChange={(e) => doFind(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doFind(findText, { forward: !e.shiftKey, next: true });
                    if (e.key === 'Escape') closeFind();
                  }} />
                <span className="muted text-xs whitespace-nowrap min-w-[34px] text-center">
                  {findRes.total ? `${findRes.active}/${findRes.total}` : '0'}
                </span>
                <button className="btn px-2 py-1" title="Назад (Shift+Enter)" onClick={() => doFind(findText, { forward: false, next: true })}>↑</button>
                <button className="btn px-2 py-1" title="Вперёд (Enter)" onClick={() => doFind(findText, { forward: true, next: true })}>↓</button>
                <button className="btn px-2 py-1" title="Закрыть (Esc)" onClick={closeFind}>✕</button>
              </div>
            )}

            {!isLive && !split && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 muted text-sm anim-fade" style={{ background: 'var(--bg)' }}>
                <div className="text-3xl">💤</div>
                <div>«{active.name}» — {tt('ah.unloaded')}</div>
                <button className="btn btn-accent" onClick={() => open(active.id)}>{tt('ah.load')}</button>
              </div>
            )}

            {immersive && (
              <button className="absolute top-3 right-3 z-50 btn anim-pop"
                style={{ background: 'var(--accent)', color: '#04121a', borderColor: 'var(--accent)' }}
                onClick={() => setImmersive(false)} title="Выйти (Esc)">⤡ Свернуть</button>
            )}

            {error[activeId] && isLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white p-8 text-center anim-fade">
                <div className="text-3xl">⚠️</div>
                <div className="text-sm">{tt('ah.failLoad')}: {active.name}</div>
                <code className="text-xs text-red-300">{error[activeId]}</code>
                <button className="btn" style={{ color: '#fff' }}
                  onClick={() => { setError((s) => ({ ...s, [activeId]: undefined })); nav('reload'); }}>{tt('ah.retry')}</button>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center muted text-sm p-8 text-center">
            {tt('ah.notElectron')}
          </div>
        )}
      </div>
    </div>
  );
}
