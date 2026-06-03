import { useCallback, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { usePersisted } from '../lib/usePersisted';

const isElectron =
  typeof window !== 'undefined' &&
  (!!(window as any).neuro || /Electron/i.test(navigator.userAgent));

const READER_JS = `(()=>{let o=document.getElementById('__neuro_reader');if(o){o.remove();return 'off';}
const s=document.createElement('style');s.id='__neuro_reader';
s.textContent='html{font-size:19px!important;background:#f7f3e9!important}body{max-width:780px!important;margin:0 auto!important;padding:32px!important;line-height:1.75!important;color:#1b1b1b!important;background:#f7f3e9!important}img,video{max-width:100%!important;height:auto!important}*{font-family:Georgia,serif!important}';
document.documentElement.appendChild(s);return 'on';})()`;

interface WorkSvc { id: string; name: string; url: string; color: string }
interface Bookmark { title: string; url: string }

const BUILTIN: WorkSvc[] = [
  { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com', color: '#ea4335' },
  { id: 'yandex', name: 'Яндекс Почта', url: 'https://mail.yandex.ru', color: '#ff3333' },
  { id: 'sheets', name: 'Google Таблицы', url: 'https://docs.google.com/spreadsheets/u/0/', color: '#0f9d58' },
  { id: 'docs', name: 'Google Документы', url: 'https://docs.google.com/document/u/0/', color: '#4285f4' },
  { id: 'drive', name: 'Google Диск', url: 'https://drive.google.com', color: '#ffba00' },
];

/** Рабочее пространство: почты и офис; все функции страницы — как в ИИ. */
export function Workspace() {
  const tt = useT();
  const lang = useStore((s) => s.lang);
  const setImmersive = useStore((s) => s.setImmersive);
  const topBarOpen = useStore((s) => s.topBarOpen);
  const immersive = useStore((s) => s.immersive);
  const showBar = !immersive && topBarOpen;

  const [custom, setCustom] = usePersisted<WorkSvc[]>('neuro.workCustom', []);
  const [hidden, setHidden] = usePersisted<string[]>('neuro.workHidden', []);
  const [bookmarks, setBookmarks] = usePersisted<Bookmark[]>('neuro.workMarks', []);
  const services = [...BUILTIN.filter((s) => !hidden.includes(s.id)), ...custom];

  const [activeId, setActiveId] = useState(services[0]?.id ?? 'gmail');
  const [mounted, setMounted] = useState<string[]>([services[0]?.id ?? 'gmail']);
  const [addr, setAddr] = useState(services[0]?.url ?? '');
  const [curUrl, setCurUrl] = useState(services[0]?.url ?? '');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, any>>({});
  const trTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const trBusy = useRef(false);

  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [showMarks, setShowMarks] = useState(false);

  const active = services.find((s) => s.id === activeId) ?? services[0];

  const open = (id: string) => {
    setActiveId(id);
    setMounted((m) => (m.includes(id) ? m : [...m, id]));
    const svc = services.find((s) => s.id === id);
    if (svc) { setAddr(svc.url); setCurUrl(svc.url); }
  };

  const unload = (id: string) => {
    setMounted((m) => m.filter((x) => x !== id));
    delete refs.current[id];
    if (id === activeId) {
      const next = services.find((s) => s.id !== id);
      if (next) open(next.id);
    }
  };

  const removeSvc = (id: string) => {
    const isCustom = custom.some((c) => c.id === id);
    unload(id);
    if (isCustom) setCustom(custom.filter((c) => c.id !== id));
    else if (!hidden.includes(id)) setHidden([...hidden, id]);
  };

  const addCustom = () => {
    let u = newUrl.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    let host = u;
    try { host = new URL(u).hostname.replace('www.', ''); } catch { /* noop */ }
    const id = `c_${Date.now()}`;
    setCustom([...custom, { id, name: newName.trim() || host, url: u, color: '#7c5cff' }]);
    setNewUrl(''); setNewName(''); setAdding(false);
    setTimeout(() => open(id), 0);
  };

  const attach = useCallback(
    (id: string) => (el: any) => {
      refs.current[id] = el;
      if (!el || el.__w) return;
      el.__w = true;
      el.addEventListener('did-start-loading', () => setLoading((s) => ({ ...s, [id]: true })));
      el.addEventListener('did-stop-loading', () => setLoading((s) => ({ ...s, [id]: false })));
      const setU = (e: any) => { if (e?.url && id === activeId) { setAddr(e.url); setCurUrl(e.url); } };
      el.addEventListener('did-navigate', setU);
      el.addEventListener('did-navigate-in-page', setU);
    },
    [activeId],
  );

  const view = () => refs.current[activeId];
  const nav = (fn: 'goBack' | 'goForward' | 'reload') => {
    try { view()?.[fn]?.(); } catch { /* noop */ }
  };
  const go = (raw: string) => {
    let u = raw.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    try { view()?.loadURL(u); } catch { /* noop */ }
  };

  // ── Функции страницы (как в ИИ) ─────────────────────────────────────────
  const stopTrLoop = () => { if (trTimer.current) { clearInterval(trTimer.current); trTimer.current = null; } };
  const trSweep = async () => {
    const v = view();
    if (!v || !window.neuro?.translatePage || trBusy.current) return;
    trBusy.current = true;
    try {
      const res: { start: number; texts: string[] } = await v.executeJavaScript(
        `(()=>{const w=window;if(!w.__tset){w.__tset=new WeakSet();w.__ntr=[];w.__orig=[];}const start=w.__ntr.length;const wk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=wk.nextNode()){if(w.__tset.has(n))continue;const tx=n.nodeValue;const pn=(n.parentNode&&n.parentNode.nodeName)||'';if(tx&&tx.trim().length>1&&/[A-Za-zА-Яа-яÀ-ÿ]/.test(tx)&&!/SCRIPT|STYLE|NOSCRIPT|TEXTAREA/.test(pn)){w.__tset.add(n);w.__ntr.push(n);w.__orig.push(tx);}}return {start,texts:w.__orig.slice(start)};})()`,
      ).catch(() => ({ start: 0, texts: [] as string[] }));
      if (!res.texts.length) return;
      const translated = await window.neuro.translatePage(res.texts, lang);
      await v.executeJavaScript(
        `((start,arr)=>{const w=window;if(!w.__ntr)return;for(let i=0;i<arr.length;i++){const nd=w.__ntr[start+i];if(nd)nd.nodeValue=arr[i];}w.__neuroTr=true;return true;})(${res.start},${JSON.stringify(translated)})`,
      ).catch(() => {});
    } finally { trBusy.current = false; }
  };
  const translate = async () => {
    const v = view();
    if (!v || !window.neuro?.translatePage) return;
    const isOn = await v.executeJavaScript('!!window.__neuroTr').catch(() => false);
    if (isOn) {
      stopTrLoop();
      await v.executeJavaScript(
        `(()=>{const w=window;if(w.__ntr&&w.__orig){for(let i=0;i<w.__ntr.length;i++){if(w.__ntr[i])w.__ntr[i].nodeValue=w.__orig[i];}}w.__tset=new WeakSet();w.__ntr=[];w.__orig=[];w.__neuroTr=false;return true;})()`,
      ).catch(() => {});
      return;
    }
    await trSweep();
    stopTrLoop();
    trTimer.current = setInterval(trSweep, 2000);
  };
  const reader = () => view()?.executeJavaScript(READER_JS).catch(() => {});
  const addBookmark = () => {
    if (bookmarks.some((b) => b.url === curUrl)) return;
    setBookmarks([{ title: active?.name ?? curUrl, url: curUrl }, ...bookmarks].slice(0, 50));
  };
  const muteTab = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    const next = !muted[id];
    try { el.setAudioMuted(next); } catch { /* noop */ }
    setMuted((s) => ({ ...s, [id]: next }));
  };
  const autofill = async () => {
    const v = view();
    if (!v || !window.neuro?.vault) return;
    let host = '';
    try { host = new URL(curUrl).hostname.replace(/^www\./, ''); } catch { /* noop */ }
    const list = await window.neuro.vault.list();
    const match = list.find((e) => {
      const s = e.site.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
      return s && host && (host.includes(s) || s.includes(host));
    });
    if (!match) { alert(tt('ah.noVault')); return; }
    const js = `(()=>{function set(el,val){const p=Object.getPrototypeOf(el);const d=Object.getOwnPropertyDescriptor(p,'value');d&&d.set&&d.set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
const pw=document.querySelector('input[type=password]');
const user=document.querySelector('input[type=email],input[autocomplete=username],input[name*=email i],input[name*=login i],input[name*=user i],input[type=text]');
if(user)set(user,${JSON.stringify(match.login)});
if(pw)set(pw,${JSON.stringify(match.password)});
return !!(user||pw);})()`;
    v.executeJavaScript(js).catch(() => {});
  };
  const startVoice = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { alert(tt('ah.voiceNA')); return; }
    try {
      const r = new SR();
      r.lang = lang === 'en' ? 'en-US' : lang === 'de' ? 'de-DE' : 'ru-RU';
      r.interimResults = false;
      r.onresult = (ev: any) => {
        const text = ev.results?.[0]?.[0]?.transcript ?? '';
        if (text) {
          const js = `(()=>{const el=document.activeElement;if(el&&'value' in el){const p=Object.getPrototypeOf(el);const d=Object.getOwnPropertyDescriptor(p,'value');const nv=(el.value||'')+${JSON.stringify(' ' + text)};d&&d.set?d.set.call(el,nv):el.value=nv;el.dispatchEvent(new Event('input',{bubbles:true}));return true;}return false;})()`;
          view()?.executeJavaScript(js).catch(() => {});
        }
      };
      r.start();
    } catch { /* noop */ }
  };

  const iconBtn = 'btn px-2 py-1';
  const chipCtrl = 'w-5 h-5 rounded-full text-[11px] leading-none flex items-center justify-center hover:scale-110 transition-transform';
  const closeMore = () => setMoreOpen(false);

  return (
    <div className="h-full flex flex-col">
      {showBar && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b" style={{ borderColor: 'var(--border)' }}>
          {services.map((s) => {
            const live = mounted.includes(s.id);
            return (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-lg border pl-1 pr-1.5 py-0.5"
                style={{
                  background: activeId === s.id ? s.color : 'transparent',
                  borderColor: activeId === s.id ? s.color : 'var(--border)',
                  boxShadow: activeId === s.id ? `0 0 12px ${s.color}77` : 'none',
                }}>
                <button onClick={() => open(s.id)} className="px-2 py-1 text-sm font-medium active:scale-95"
                  style={{ color: activeId === s.id ? '#fff' : 'var(--text)' }}>
                  {live && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: muted[s.id] ? 'var(--err)' : 'var(--ok)' }} />}
                  {s.name}
                </button>
                {live && (
                  <>
                    <button className={chipCtrl} title={muted[s.id] ? tt('ah.unmuteSite') : tt('ah.muteSite')}
                      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
                      onClick={(e) => { e.stopPropagation(); muteTab(s.id); }}>{muted[s.id] ? '🔇' : '🔊'}</button>
                    <button className={chipCtrl} title={tt('ah.unloadSite')}
                      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
                      onClick={(e) => { e.stopPropagation(); unload(s.id); }}>⏏</button>
                  </>
                )}
                <button className={chipCtrl} title={custom.some((c) => c.id === s.id) ? tt('ah.deleteSite') : tt('ah.hideSite')}
                  style={{ background: 'var(--err)', color: '#fff' }}
                  onClick={(e) => { e.stopPropagation(); removeSvc(s.id); }}>✕</button>
              </span>
            );
          })}

          {adding ? (
            <span className="inline-flex items-center gap-1">
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

      {isElectron && showBar && (
        <div className="flex items-center gap-1 px-2 py-1 border-b text-sm relative" style={{ borderColor: 'var(--border)' }}>
          <button className={iconBtn} title={tt('ah.back')} onClick={() => nav('goBack')}>←</button>
          <button className={iconBtn} title={tt('ah.fwd')} onClick={() => nav('goForward')}>→</button>
          <button className={iconBtn} title={tt('ah.reload')} onClick={() => nav('reload')}>↻</button>
          <input className="input py-1 text-xs flex-1 mx-1" value={addr}
            onChange={(e) => setAddr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go(addr)} spellCheck={false} />
          {loading[activeId] && <span className="spinner mr-1" />}
          <button className={iconBtn} title={tt('ah.full')} onClick={() => setImmersive(true)}>⤢</button>
          <button className={iconBtn} title={tt('ah.more')} onClick={() => setMoreOpen((v) => !v)}
            style={moreOpen ? { borderColor: 'var(--accent)' } : undefined}>⋯</button>

          {moreOpen && (
            <div className="absolute right-2 top-full mt-1 panel z-50 p-1 anim-pop flex flex-col text-sm" onMouseLeave={closeMore}>
              <button className="btn text-left mb-0.5" onClick={() => { autofill(); closeMore(); }}>{tt('ah.autofill')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { addBookmark(); closeMore(); }}>{tt('ah.bookmarkAdd')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { setShowMarks((v) => !v); closeMore(); }}>{tt('ah.bookmarks')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { translate(); closeMore(); }}>{tt('ah.translate')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { reader(); closeMore(); }}>{tt('ah.reader')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { muteTab(activeId); closeMore(); }}>{muted[activeId] ? tt('ah.unmute') : tt('ah.mute')}</button>
              <button className="btn text-left mb-0.5" onClick={() => { startVoice(); closeMore(); }}>{tt('ah.voice')}</button>
              <button className="btn text-left" onClick={() => { unload(activeId); closeMore(); }}>{tt('ah.unload')}</button>
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

      <div className="flex-1 relative bg-white">
        {isElectron ? (
          mounted.map((id) => {
            const svc = services.find((s) => s.id === id);
            if (!svc) return null;
            return (
              <webview key={id} ref={attach(id)} src={svc.url} partition="persist:neuro"
                allowpopups={true} {...({ webpreferences: 'contextIsolation=no' } as any)}
                className="absolute inset-0 w-full h-full"
                style={{ display: id === activeId ? 'flex' : 'none' }} />
            );
          })
        ) : (
          <div className="absolute inset-0 flex items-center justify-center muted text-sm">{active?.name}</div>
        )}
      </div>
    </div>
  );
}
