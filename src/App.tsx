import { useEffect, useRef } from 'react';
import { useStore, type HotkeyAction } from './store/useStore';
import { comboFromEvent } from './lib/hotkeys';
import { Nav } from './components/Nav';
import { StatusBar } from './components/StatusBar';
import { Sidebar } from './components/Sidebar';
import { AIHub } from './tabs/AIHub';
import { Search } from './tabs/Search';
import { Workspace } from './tabs/Workspace';
import { Tools } from './tabs/Tools';
import { Settings } from './tabs/Settings';
import { UpdateBanner } from './components/UpdateBanner';

export default function App() {
  const tab = useStore((s) => s.activeTab);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const navOpen = useStore((s) => s.navOpen);
  const immersive = useStore((s) => s.immersive);
  const navWidth = useStore((s) => s.navWidth);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const toggleNav = useStore((s) => s.toggleNav);
  const toggleTopBar = useStore((s) => s.toggleTopBar);
  const topBarOpen = useStore((s) => s.topBarOpen);
  const setImmersive = useStore((s) => s.setImmersive);
  const setNavWidth = useStore((s) => s.setNavWidth);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const hotkeys = useStore((s) => s.hotkeys);
  const setTab = useStore((s) => s.setTab);

  const aiVisited = useRef(false);
  const searchVisited = useRef(false);
  const workVisited = useRef(false);
  if (tab === 'ai') aiVisited.current = true;
  if (tab === 'search') searchVisited.current = true;
  if (tab === 'work') workVisited.current = true;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && immersive) {
        setImmersive(false);
        return;
      }
      // Если фокус в поле ввода — не перехватываем обычные клавиши (но Ctrl/Alt-комбо — да).
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing && !e.ctrlKey && !e.altKey && !e.metaKey) return;

      const combo = comboFromEvent(e);
      const action = (Object.keys(hotkeys) as HotkeyAction[]).find((a) => hotkeys[a] === combo);
      if (!action) return;

      const run: Record<HotkeyAction, () => void> = {
        tabAI: () => setTab('ai'),
        tabSearch: () => setTab('search'),
        tabWork: () => setTab('work'),
        tabTools: () => setTab('tools'),
        tabSettings: () => setTab('settings'),
        fullscreen: () => setImmersive(!immersive),
        find: () => window.dispatchEvent(new CustomEvent('neuro:hk-find')),
        split: () => window.dispatchEvent(new CustomEvent('neuro:hk-split')),
        nav: () => toggleNav(),
        sidebar: () => toggleSidebar(),
        topbar: () => toggleTopBar(),
      };
      e.preventDefault();
      run[action]();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [immersive, setImmersive, hotkeys, setTab, toggleNav, toggleSidebar, toggleTopBar]);

  // Перетаскивание ширины панелей
  const startDrag = (which: 'nav' | 'side') => (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      if (which === 'nav') setNavWidth(ev.clientX);
      else setSidebarWidth(window.innerWidth - ev.clientX);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const content = (
    <main className="flex-1 overflow-hidden relative">
      {aiVisited.current && (
        <div className={tab === 'ai' ? 'h-full anim-fade' : 'hidden'}>
          <AIHub />
        </div>
      )}
      {searchVisited.current && (
        <div className={tab === 'search' ? 'h-full anim-fade' : 'hidden'}>
          <Search />
        </div>
      )}
      {workVisited.current && (
        <div className={tab === 'work' ? 'h-full anim-fade' : 'hidden'}>
          <Workspace />
        </div>
      )}
      {tab === 'tools' && (
        <div key="tools" className="h-full anim-fade-up">
          <Tools />
        </div>
      )}
      {tab === 'settings' && (
        <div key="settings" className="h-full anim-fade-up">
          <Settings />
        </div>
      )}
    </main>
  );

  if (immersive) {
    return (
      <div className="h-screen w-screen overflow-hidden relative flex">
        {content}
        <button
          className="fixed top-3 right-3 z-50 btn anim-pop"
          style={{ background: 'var(--accent)', color: '#04121a', borderColor: 'var(--accent)' }}
          onClick={() => setImmersive(false)}
          title="Выйти из полного экрана (Esc)"
        >
          ⤡ Свернуть
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Левая панель */}
        <div
          className="shrink-0 transition-[width] duration-300 overflow-hidden relative"
          style={{ width: navOpen ? navWidth : 0 }}
        >
          <Nav />
        </div>

        {content}

        {/* Правая панель */}
        <div
          className="shrink-0 transition-[width] duration-300 overflow-hidden relative"
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}
        >
          <Sidebar />
        </div>

        {/* Левый край: широкая зона наведения (ресайз) + шеврон */}
        <div
          className="absolute top-0 h-full z-40 group"
          style={{ left: navOpen ? navWidth - 10 : 0, width: 22 }}
        >
          {navOpen && (
            <div
              onPointerDown={startDrag('nav')}
              className="absolute inset-0 cursor-col-resize group-hover:bg-[var(--accent)]/30 transition-colors"
            />
          )}
          <button
            onClick={toggleNav}
            title={navOpen ? 'Скрыть меню' : 'Показать меню'}
            className="absolute top-1/2 -translate-y-1/2 left-0 w-3.5 h-10 rounded-r-md text-[10px] panel-2 border opacity-0 group-hover:opacity-95 transition-opacity duration-200"
            style={{ borderLeft: 'none' }}
          >
            {navOpen ? '‹' : '›'}
          </button>
        </div>

        {/* Правый край: то же зеркально */}
        <div
          className="absolute top-0 h-full z-40 group"
          style={{ right: sidebarOpen ? sidebarWidth - 10 : 0, width: 22 }}
        >
          {sidebarOpen && (
            <div
              onPointerDown={startDrag('side')}
              className="absolute inset-0 cursor-col-resize group-hover:bg-[var(--accent)]/30 transition-colors"
            />
          )}
          <button
            onClick={toggleSidebar}
            title={sidebarOpen ? 'Скрыть утилиты' : 'Показать утилиты'}
            className="absolute top-1/2 -translate-y-1/2 right-0 w-3.5 h-10 rounded-l-md text-[10px] panel-2 border opacity-0 group-hover:opacity-95 transition-opacity duration-200"
            style={{ borderRight: 'none' }}
          >
            {sidebarOpen ? '›' : '‹'}
          </button>
        </div>

        {/* Верхний край по центру: скрыть/показать верхний бар */}
        <div
          className="absolute top-0 z-40 group"
          style={{
            left: navOpen ? navWidth : 0,
            right: sidebarOpen ? sidebarWidth : 0,
            height: 22,
          }}
        >
          <button
            onClick={toggleTopBar}
            title={topBarOpen ? 'Скрыть верхний бар' : 'Показать верхний бар'}
            className="absolute top-0 left-1/2 -translate-x-1/2 px-4 h-4 rounded-b-md text-[10px] panel-2 border opacity-0 group-hover:opacity-95 transition-opacity duration-200"
            style={{ borderTop: 'none' }}
          >
            {topBarOpen ? '▴' : '▾'}
          </button>
        </div>
      </div>
      <StatusBar />
      <UpdateBanner />
    </div>
  );
}
