import { useStore, type TabId } from '../store/useStore';
import { useT } from '../i18n';

const TABS: { id: TabId; icon: string }[] = [
  { id: 'ai', icon: '🧠' },
  { id: 'search', icon: '🔍' },
  { id: 'work', icon: '📬' },
  { id: 'tools', icon: '🧰' },
  { id: 'settings', icon: '⚙️' },
];

export function Nav() {
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setTab);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const t = useT();

  return (
    <nav className="w-full h-full flex flex-col items-center py-3 gap-1 border-r bar-gradient">
      <div
        className="text-2xl mb-2 select-none"
        title="NeuroHub"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ⬡
      </div>
      {TABS.map((tb) => (
        <button
          key={tb.id}
          onClick={() => setTab(tb.id)}
          className="w-[88%] py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] transition-transform duration-150 hover:scale-105 active:scale-95"
          style={{
            background: activeTab === tb.id ? 'var(--accent)' : 'transparent',
            color: activeTab === tb.id ? '#04121a' : 'var(--muted)',
          }}
        >
          <span className="text-lg">{tb.icon}</span>
          {t(`nav.${tb.id}`)}
        </button>
      ))}
      <button
        onClick={toggleSidebar}
        className="mt-auto w-[88%] py-2 rounded-lg text-[10px] muted"
        title={t('nav.panel')}
      >
        ▥<br />{t('nav.panel')}
      </button>
    </nav>
  );
}
