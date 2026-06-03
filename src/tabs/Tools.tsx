import { CurrencyConverter } from '../widgets/CurrencyConverter';
import { PasswordGenerator } from '../widgets/PasswordGenerator';
import { PasswordVault } from '../widgets/PasswordVault';
import { NotesWidget } from '../widgets/NotesWidget';
import { PromptManager } from '../widgets/PromptManager';
import { Translator } from '../widgets/Translator';
import { useT } from '../i18n';

const CARDS: { key: string; icon: string; node: React.ReactNode; wide?: boolean }[] = [
  { key: 'side.currency', icon: '💱', node: <CurrencyConverter />, wide: true },
  { key: 'side.notes', icon: '📝', node: <NotesWidget /> },
  { key: 'side.prompts', icon: '💬', node: <PromptManager /> },
  { key: 'side.translator', icon: '🌍', node: <Translator /> },
  { key: 'side.passgen', icon: '🔐', node: <PasswordGenerator /> },
  { key: 'side.vault', icon: '🗝️', node: <PasswordVault /> },
];

export function Tools() {
  const t = useT();
  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {CARDS.map((c, i) => (
          <div
            key={c.key}
            className="panel p-3 space-y-2 anim-fade-up hover:-translate-y-0.5 transition-transform"
            style={{ animationDelay: `${i * 45}ms`, gridColumn: c.wide ? 'span 2' : undefined }}
          >
            <h3 className="text-sm font-medium flex items-center gap-2">
              <span>{c.icon}</span>
              {t(c.key)}
            </h3>
            {c.node}
          </div>
        ))}
      </div>
    </div>
  );
}
