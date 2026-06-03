import { useEffect, useState } from 'react';
import { useStore, type Lang, type HotkeyAction, DEFAULT_HOTKEYS } from '../store/useStore';
import { XBOX_DNS, XBOX_DOH, AI_SERVICES, type ThemeName } from '@shared/constants';
import { comboFromEvent, isCompleteCombo } from '../lib/hotkeys';
import { useT } from '../i18n';

const THEMES: { id: ThemeName; key: string }[] = [
  { id: 'dark', key: 'set.theme.dark' },
  { id: 'light', key: 'set.theme.light' },
  { id: 'cyberpunk', key: 'set.theme.cyber' },
  { id: 'blackhole', key: 'set.theme.blackhole' },
];

const GRADIENTS = [
  { name: 'Неон', from: '#00f0ff', to: '#b026ff' },
  { name: 'Закат', from: '#ff2bd6', to: '#ff8a00' },
  { name: 'Изумруд', from: '#00ffae', to: '#00b4d8' },
  { name: 'Океан', from: '#2563eb', to: '#7c3aed' },
  { name: 'Лава', from: '#ff5c5c', to: '#fcee0a' },
  { name: 'Мята', from: '#3ddc84', to: '#00f0ff' },
  { name: 'Чёрная дыра', from: '#c74a00', to: '#3c0092' },
  { name: 'Аккреция', from: '#ffb066', to: '#770000' },
];

const LANGS: { id: Lang; label: string }[] = [
  { id: 'ru', label: '🇷🇺 Русский' },
  { id: 'en', label: '🇬🇧 English' },
  { id: 'de', label: '🇩🇪 Deutsch' },
];

export function Settings() {
  const t = useT();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const accent = useStore((s) => s.accent);
  const setAccent = useStore((s) => s.setAccent);
  const gradient = useStore((s) => s.gradient);
  const setGradient = useStore((s) => s.setGradient);
  const gradientPresets = useStore((s) => s.gradientPresets);
  const saveGradientPreset = useStore((s) => s.saveGradientPreset);
  const removeGradientPreset = useStore((s) => s.removeGradientPreset);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const hiddenAI = useStore((s) => s.hiddenAI);
  const toggleHiddenAI = useStore((s) => s.toggleHiddenAI);
  const [dns, setDns] = useState<any>(null);
  const [adblock, setAdblock] = useState(true);
  const [metrics, setMetrics] = useState<{ memMB: number; cpu: number; procs: number } | null>(null);

  useEffect(() => {
    window.neuro?.dns?.status().then(setDns);
    window.neuro?.adblock?.get().then(setAdblock);
    const tick = () => window.neuro?.metrics?.get().then(setMetrics);
    tick();
    const i = setInterval(tick, 2000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto space-y-6">
      {/* Язык */}
      <section className="panel p-4 space-y-3">
        <h2 className="font-medium">{t('set.language')}</h2>
        <div className="flex gap-2">
          {LANGS.map((l) => (
            <button key={l.id} className="btn"
              style={lang === l.id ? { background: 'var(--accent)', color: '#04121a', borderColor: 'var(--accent)' } : {}}
              onClick={() => setLang(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* Оформление */}
      <section className="panel p-4 space-y-3">
        <h2 className="font-medium">{t('set.appearance')}</h2>
        <div className="flex gap-2">
          {THEMES.map((th) => (
            <button key={th.id} className="btn"
              style={theme === th.id ? { background: 'var(--accent)', color: '#04121a', borderColor: 'var(--accent)' } : {}}
              onClick={() => setTheme(th.id)}>
              {t(th.key)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm pt-1">
          <input type="checkbox" checked={gradient} onChange={(e) => setGradient(e.target.checked)} />
          {t('set.gradients')}
        </label>
        <div className="pt-2" style={{ opacity: gradient ? 1 : 0.4 }}>
          <p className="muted text-xs mb-2">{t('set.accent')}</p>
          <div className="flex flex-wrap gap-2">
            {GRADIENTS.map((g) => {
              const sel = accent.from === g.from && accent.to === g.to;
              return (
                <button key={g.name} title={g.name} onClick={() => setAccent({ from: g.from, to: g.to })}
                  className="w-12 h-8 rounded-md border transition-transform hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})`, outline: sel ? '2px solid var(--text)' : 'none', outlineOffset: '2px', borderColor: 'transparent' }} />
              );
            })}
            <label className="flex items-center gap-1 text-xs muted">
              <input type="color" value={accent.from} onChange={(e) => setAccent({ ...accent, from: e.target.value })} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
              <input type="color" value={accent.to} onChange={(e) => setAccent({ ...accent, to: e.target.value })} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
            </label>
            <button className="btn text-xs px-2 py-1" onClick={saveGradientPreset}>＋ {t('set.gradSave')}</button>
          </div>

          {gradientPresets.length > 0 && (
            <div className="pt-3">
              <p className="muted text-xs mb-2">{t('set.gradSaved')}</p>
              <div className="flex flex-wrap gap-2">
                {gradientPresets.map((g, i) => {
                  const sel = accent.from === g.from && accent.to === g.to;
                  return (
                    <div key={i} className="relative group">
                      <button onClick={() => setAccent({ from: g.from, to: g.to })}
                        className="w-12 h-8 rounded-md border transition-transform hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})`, outline: sel ? '2px solid var(--text)' : 'none', outlineOffset: '2px', borderColor: 'transparent' }} />
                      <button onClick={() => removeGradientPreset(i)} title="✕"
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] leading-none opacity-0 group-hover:opacity-100"
                        style={{ background: 'var(--err)', color: '#fff' }}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Сайты ИИ на панели */}
      <section className="panel p-4 space-y-3">
        <h2 className="font-medium">{t('set.aiSites')}</h2>
        <p className="muted text-xs">{t('set.aiSitesHint')}</p>
        <div className="flex flex-wrap gap-3">
          {AI_SERVICES.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={!hiddenAI.includes(s.id)} onChange={() => toggleHiddenAI(s.id)} />
              <span style={{ color: s.color }}>●</span>
              {s.name}
            </label>
          ))}
        </div>
      </section>

      {/* Горячие клавиши */}
      <HotkeysSection />

      {/* Системный монитор */}
      <section className="panel p-4 space-y-2">
        <h2 className="font-medium">{t('set.sysmon')}</h2>
        {metrics ? (
          <div className="flex gap-6 text-sm">
            <span>{t('set.ram')}: <strong>{metrics.memMB} MB</strong></span>
            <span>{t('set.cpu')}: <strong>{metrics.cpu}%</strong></span>
            <span className="muted">{metrics.procs} {t('set.procs')}</span>
          </div>
        ) : (
          <p className="muted text-xs">…</p>
        )}
      </section>

      {/* Блокировщик рекламы */}
      <section className="panel p-4 space-y-3">
        <h2 className="font-medium">{t('set.adblockTitle')}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={adblock} onChange={(e) => { setAdblock(e.target.checked); window.neuro?.adblock?.set(e.target.checked); }} />
          {t('set.adblockLabel')}
        </label>
      </section>

      {/* Сеть */}
      <section className="panel p-4 space-y-3">
        <h2 className="font-medium">{t('set.network')}</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: dns?.active ? 'var(--ok)' : 'var(--err)' }} />
          <span>{t('set.status')}: <strong style={{ color: dns?.active ? 'var(--ok)' : 'var(--err)' }}>{dns ? (dns.active ? t('set.active') : t('set.error')) : '…'}</strong></span>
          <button className="btn text-xs ml-2" onClick={() => window.neuro?.dns?.status().then(setDns)}>{t('set.recheck')}</button>
        </div>
        <p className="muted text-xs">DoH: {XBOX_DOH}</p>
        <p className="muted text-xs">{XBOX_DNS.join(', ')}</p>
        {dns?.error && <p className="text-xs" style={{ color: 'var(--err)' }}>{dns.error}</p>}
      </section>

      {/* Данные и куки */}
      <section className="panel p-4 space-y-3">
        <h2 className="font-medium">{t('set.cookies')}</h2>
        <div className="flex gap-2">
          <button className="btn" onClick={async () => { await window.neuro?.session?.clear('cookies'); alert('OK'); }}>{t('set.clearCookies')}</button>
          <button className="btn" onClick={async () => { if (!confirm('?')) return; await window.neuro?.session?.clear('all'); alert('OK'); }}>{t('set.clearAll')}</button>
        </div>
      </section>
    </div>
  );
}

function HotkeysSection() {
  const t = useT();
  const hotkeys = useStore((s) => s.hotkeys);
  const setHotkey = useStore((s) => s.setHotkey);
  const resetHotkeys = useStore((s) => s.resetHotkeys);
  const [recording, setRecording] = useState<HotkeyAction | null>(null);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setRecording(null); return; }
      const combo = comboFromEvent(e);
      if (isCompleteCombo(combo)) {
        setHotkey(recording, combo);
        setRecording(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [recording, setHotkey]);

  const actions = Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[];

  return (
    <section className="panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t('set.hotkeys')}</h2>
        <button className="btn text-xs" onClick={resetHotkeys}>{t('set.hkReset')}</button>
      </div>
      <p className="muted text-xs">{t('set.hkHint')}</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {actions.map((a) => (
          <div key={a} className="flex items-center justify-between gap-2 panel-2 rounded px-2 py-1.5">
            <span className="text-xs">{t(`hk.${a}`)}</span>
            <button
              className="btn text-xs px-2 py-1 font-mono min-w-[84px]"
              onClick={() => setRecording(a)}
              style={recording === a ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            >
              {recording === a ? t('set.hkPress') : hotkeys[a]}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
