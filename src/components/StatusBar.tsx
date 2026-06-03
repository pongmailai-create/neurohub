import { useEffect, useState } from 'react';
import { XBOX_DNS } from '@shared/constants';
import { useT } from '../i18n';

interface DnsStatus {
  active: boolean;
  servers: string[];
  addresses: string[];
  error?: string;
}

export function StatusBar() {
  const t = useT();
  const [dns, setDns] = useState<DnsStatus | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const refresh = async () => {
      if (window.neuro?.dns) setDns(await window.neuro.dns.status());
    };
    refresh();
    timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);

  const ok = dns?.active;
  return (
    <footer
      className="h-7 shrink-0 flex items-center gap-4 px-3 text-xs panel-2 border-t"
      style={{ color: 'var(--muted)' }}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: ok ? 'var(--ok)' : 'var(--err)' }}
        />
        Xbox DNS:{' '}
        <strong style={{ color: ok ? 'var(--ok)' : 'var(--err)' }}>
          {dns ? (ok ? t('sb.active') : t('sb.error')) : t('sb.checking')}
        </strong>
      </span>
      <span>{XBOX_DNS.slice(0, 2).join(' · ')}</span>
      {dns?.addresses?.length ? (
        <span>{t('sb.probe')} → {dns.addresses[0]}</span>
      ) : null}
      {dns?.error ? <span style={{ color: 'var(--err)' }}>{dns.error}</span> : null}
      <span className="ml-auto">NeuroHub v0.1</span>
    </footer>
  );
}
