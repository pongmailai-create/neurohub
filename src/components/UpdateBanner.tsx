import { useEffect, useState } from 'react';
import { useT } from '../i18n';

interface Info { current: string; latest: string; url: string; notes: string }

/** Лёгкое уведомление об обновлении: проверка манифеста + кнопка скачать. */
export function UpdateBanner() {
  const t = useT();
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    const off = window.neuro?.update?.onAvailable((i) => setInfo(i));
    // Резервная проверка из рендерера (если событие не пришло).
    window.neuro?.update?.check?.().then((r) => {
      if (r?.hasUpdate) setInfo(r);
    });
    return () => { off?.(); };
  }, []);

  if (!info) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] panel p-3 anim-pop max-w-xs shadow-lg" style={{ boxShadow: '0 8px 30px rgba(0,0,0,.4)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">⬆️</span>
        <div className="font-medium text-sm">{t('upd.title')}</div>
      </div>
      <div className="muted text-xs mb-2">
        {info.current} → <strong style={{ color: 'var(--accent)' }}>{info.latest}</strong>
        {info.notes && <div className="mt-1 whitespace-pre-wrap">{info.notes}</div>}
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-accent text-xs flex-1"
          onClick={() => { if (info.url) window.neuro?.openExternal(info.url); }}
        >
          {t('upd.download')}
        </button>
        <button className="btn text-xs" onClick={() => setInfo(null)}>{t('upd.later')}</button>
      </div>
    </div>
  );
}
