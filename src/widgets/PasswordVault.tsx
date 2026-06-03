import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

interface Entry {
  id: string;
  site: string;
  login: string;
  password: string;
}

/**
 * Зашифрованный сейф паролей. Шифрование — через системное хранилище ОС
 * (Windows DPAPI), ключ привязан к твоей учётной записи. Импорт — из CSV,
 * который умеет экспортировать Chrome/Edge (Настройки → Пароли → Экспорт).
 */
export function PasswordVault() {
  const tr = useT();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [available, setAvailable] = useState(true);
  const [site, setSite] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => window.neuro?.vault?.list().then(setEntries);

  useEffect(() => {
    if (!window.neuro?.vault) return;
    window.neuro.vault.available().then(setAvailable);
    refresh();
  }, []);

  if (!window.neuro?.vault) {
    return <p className="muted text-xs">{tr('v.unavailable')}</p>;
  }

  const add = async () => {
    if (!site.trim() && !login.trim()) return;
    await window.neuro.vault.set({ site: site.trim(), login: login.trim(), password });
    setSite('');
    setLogin('');
    setPassword('');
    refresh();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const res = await window.neuro.vault.importCsv(text);
    setStatus(`Импортировано: ${res.imported}. Всего: ${res.total}`);
    refresh();
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {!available && (
        <p className="text-[10px]" style={{ color: 'var(--err)' }}>{tr('v.noenc')}</p>
      )}

      <div className="grid grid-cols-1 gap-1.5">
        <input className="input py-1 text-xs" placeholder={tr('v.site')} value={site} onChange={(e) => setSite(e.target.value)} />
        <input className="input py-1 text-xs" placeholder={tr('v.login')} value={login} onChange={(e) => setLogin(e.target.value)} />
        <div className="flex gap-1.5">
          <input className="input py-1 text-xs" type="password" placeholder={tr('v.password')} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-accent text-xs" onClick={add}>{tr('v.add')}</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn text-xs" onClick={() => fileRef.current?.click()}>
          {tr('v.import')}
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
      </div>
      {status && <p className="muted text-[10px]">{status}</p>}

      <ul className="space-y-1 max-h-56 overflow-auto">
        {entries.map((e) => (
          <li key={e.id} className="panel-2 rounded px-2 py-1 text-xs group">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{e.site || '—'}</div>
                <div className="truncate muted">{e.login}</div>
                {reveal[e.id] && <div className="truncate font-mono text-[11px]">{e.password}</div>}
              </div>
              <button className="muted" title="Показать пароль" onClick={() => setReveal((r) => ({ ...r, [e.id]: !r[e.id] }))}>
                {reveal[e.id] ? '🙈' : '👁'}
              </button>
              <button className="muted" title="Копировать пароль" onClick={() => navigator.clipboard.writeText(e.password)}>
                ⧉
              </button>
              <button
                className="muted opacity-0 group-hover:opacity-100"
                title="Удалить"
                onClick={() => window.neuro.vault.remove(e.id).then(setEntries)}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {entries.length === 0 && <li className="muted text-xs">{tr('v.empty')}</li>}
      </ul>

      <details className="text-[10px] muted">
        <summary className="cursor-pointer">{tr('v.howto')}</summary>
        <p className="mt-1 leading-relaxed">{tr('v.howtoText')}</p>
      </details>
    </div>
  );
}
