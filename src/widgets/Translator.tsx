import { useEffect, useRef, useState } from 'react';
import { CopyBtn } from '../components/Section';
import { useT } from '../i18n';

const LANGS: [string, string][] = [
  ['auto', 'Авто'],
  ['ru', 'Русский'],
  ['en', 'English'],
  ['de', 'Deutsch'],
  ['uk', 'Українська'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['it', 'Italiano'],
  ['pl', 'Polski'],
  ['pt', 'Português'],
  ['tr', 'Türkçe'],
  ['zh-CN', '中文'],
  ['ja', '日本語'],
  ['ko', '한국어'],
  ['ar', 'العربية'],
  ['hi', 'हिन्दी'],
];

/** Переводчик через бесплатный endpoint Google Translate (без ключа). */
export function Translator() {
  const tr = useT();
  const [text, setText] = useState('');
  const [out, setOut] = useState('');
  const [from, setFrom] = useState('auto');
  const [to, setTo] = useState('en');
  const [busy, setBusy] = useState(false);
  const reqRef = useRef(0);

  const translate = async (q: string) => {
    const req = ++reqRef.current;
    if (!q.trim()) { setOut(''); setBusy(false); return; }
    setBusy(true);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(q)}`;
      const r = await fetch(url);
      const j = await r.json();
      if (req !== reqRef.current) return; // пришёл устаревший ответ
      setOut((j[0] || []).map((s: any[]) => s[0]).join(''));
    } catch {
      if (req === reqRef.current) setOut(tr('tr.err'));
    } finally {
      if (req === reqRef.current) setBusy(false);
    }
  };

  // Перевод в реальном времени: с дебаунсом при наборе / смене языков.
  useEffect(() => {
    const id = setTimeout(() => translate(text), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, from, to]);

  const swap = () => {
    setFrom(to);
    setTo(from === 'auto' ? 'ru' : from);
    setText(out);
    setOut(text);
  };

  const Sel = ({ value, onChange, withAuto }: { value: string; onChange: (v: string) => void; withAuto?: boolean }) => (
    <select className="input py-1 text-xs flex-1" value={value} onChange={(e) => onChange(e.target.value)}>
      {LANGS.filter((l) => withAuto || l[0] !== 'auto').map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Sel value={from} onChange={setFrom} withAuto />
        <button className="btn px-2 py-1" title="Поменять местами" onClick={swap}>⇄</button>
        <Sel value={to} onChange={setTo} />
      </div>
      <textarea
        className="input h-20 resize-none text-xs"
        placeholder={tr('tr.ph')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="space-y-1">
        <div className="panel-2 rounded p-2 text-xs whitespace-pre-wrap min-h-[2.5rem] max-h-40 overflow-auto relative">
          {out || <span className="muted">…</span>}
          {busy && <span className="spinner absolute top-2 right-2" />}
        </div>
        {out && <CopyBtn value={out} />}
      </div>
    </div>
  );
}
