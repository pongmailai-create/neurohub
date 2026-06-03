import { useState, type ReactNode } from 'react';
import { useT } from '../i18n';

export function Section({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        <span>{icon}</span>
        <span>{title}</span>
        <span className="ml-auto muted text-xs">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div
          className="px-3 pb-3 pt-1 border-t anim-fade"
          style={{ borderColor: 'var(--border)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Small copy-to-clipboard button used across widgets. */
export function CopyBtn({ value, label }: { value: string; label?: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? t('c.copied') : (label ?? t('c.copy'))}
    </button>
  );
}
