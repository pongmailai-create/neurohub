import { Section } from './Section';
import { NotesWidget } from '../widgets/NotesWidget';
import { PromptManager } from '../widgets/PromptManager';
import { Translator } from '../widgets/Translator';
import { CurrencyConverter } from '../widgets/CurrencyConverter';
import { PasswordGenerator } from '../widgets/PasswordGenerator';
import { PasswordVault } from '../widgets/PasswordVault';
import { useT } from '../i18n';

export function Sidebar() {
  const t = useT();
  return (
    <aside className="w-full h-full overflow-y-auto border-l bar-gradient p-2 space-y-2 anim-slide-left">
      <h2 className="px-1 py-1 text-xs uppercase tracking-wider muted">{t('side.utils')}</h2>
      <Section title={t('side.notes')} icon="📝" defaultOpen>
        <NotesWidget />
      </Section>
      <Section title={t('side.prompts')} icon="💬">
        <PromptManager />
      </Section>
      <Section title={t('side.translator')} icon="🌍">
        <Translator />
      </Section>
      <Section title={t('side.currency')} icon="💱">
        <CurrencyConverter />
      </Section>
      <Section title={t('side.passgen')} icon="🔐">
        <PasswordGenerator />
      </Section>
      <Section title={t('side.vault')} icon="🗝️">
        <PasswordVault />
      </Section>
    </aside>
  );
}
