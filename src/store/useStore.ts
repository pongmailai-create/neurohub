import { create } from 'zustand';
import type { ThemeName } from '@shared/constants';

export type TabId = 'ai' | 'search' | 'work' | 'tools' | 'settings';

export interface Accent {
  from: string;
  to: string;
}

export type Lang = 'ru' | 'en' | 'de';

export type HotkeyAction =
  | 'tabAI' | 'tabSearch' | 'tabWork' | 'tabTools' | 'tabSettings'
  | 'fullscreen' | 'find' | 'split' | 'nav' | 'sidebar' | 'topbar';

export const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  tabAI: 'Ctrl+1',
  tabSearch: 'Ctrl+2',
  tabWork: 'Ctrl+3',
  tabTools: 'Ctrl+4',
  tabSettings: 'Ctrl+5',
  fullscreen: 'F11',
  find: 'Ctrl+F',
  split: 'Ctrl+\\',
  nav: 'Ctrl+B',
  sidebar: 'Ctrl+J',
  topbar: 'Ctrl+G',
};

interface AppState {
  theme: ThemeName;
  activeTab: TabId;
  sidebarOpen: boolean;
  navOpen: boolean;
  immersive: boolean;
  navWidth: number;
  sidebarWidth: number;
  accent: Accent;
  gradient: boolean;
  topBarOpen: boolean;
  lang: Lang;
  hiddenAI: string[];
  gradientPresets: Accent[];
  hotkeys: Record<HotkeyAction, string>;
  setTheme: (t: ThemeName) => void;
  setTab: (t: TabId) => void;
  toggleSidebar: () => void;
  toggleNav: () => void;
  toggleTopBar: () => void;
  setImmersive: (v: boolean) => void;
  setNavWidth: (w: number) => void;
  setSidebarWidth: (w: number) => void;
  setAccent: (a: Accent) => void;
  setGradient: (v: boolean) => void;
  setLang: (l: Lang) => void;
  toggleHiddenAI: (id: string) => void;
  saveGradientPreset: () => void;
  removeGradientPreset: (i: number) => void;
  setHotkey: (a: HotkeyAction, combo: string) => void;
  resetHotkeys: () => void;
}

function loadHotkeys(): Record<HotkeyAction, string> {
  try {
    const raw = localStorage.getItem('neuro.hotkeys');
    if (raw) return { ...DEFAULT_HOTKEYS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_HOTKEYS };
}

function applyThemeClass(theme: ThemeName) {
  const el = document.documentElement;
  el.classList.remove('dark', 'light', 'cyberpunk', 'blackhole');
  el.classList.add(theme);
}

export function applyAccent(a: Accent) {
  const el = document.documentElement;
  el.style.setProperty('--accent', a.from);
  el.style.setProperty('--accent-2', a.to);
}

export function applyGradient(on: boolean) {
  document.documentElement.classList.toggle('no-grad', !on);
}

function loadAccent(): Accent {
  try {
    const raw = localStorage.getItem('neuro.accent');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { from: '#00f0ff', to: '#b026ff' };
}

const NAV_MIN = 56;
const NAV_MAX = 160;
const SIDE_MIN = 240;
const SIDE_MAX = 560;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const useStore = create<AppState>((set) => ({
  theme: (localStorage.getItem('neuro.theme') as ThemeName) || 'dark',
  activeTab: (localStorage.getItem('neuro.tab') as TabId) || 'ai',
  sidebarOpen: localStorage.getItem('neuro.sidebar') !== '0',
  navOpen: localStorage.getItem('neuro.nav') !== '0',
  immersive: false,
  navWidth: clamp(Number(localStorage.getItem('neuro.navW')) || 80, NAV_MIN, NAV_MAX),
  sidebarWidth: clamp(Number(localStorage.getItem('neuro.sideW')) || 320, SIDE_MIN, SIDE_MAX),
  accent: loadAccent(),
  gradient: localStorage.getItem('neuro.grad') !== '0',
  topBarOpen: true,
  lang: (localStorage.getItem('neuro.lang') as Lang) || 'ru',
  hiddenAI: JSON.parse(localStorage.getItem('neuro.hiddenAI') || '[]'),
  gradientPresets: JSON.parse(localStorage.getItem('neuro.gradPresets') || '[]'),
  hotkeys: loadHotkeys(),
  setTheme: (theme) => {
    localStorage.setItem('neuro.theme', theme);
    applyThemeClass(theme);
    set({ theme });
  },
  setTab: (activeTab) => {
    localStorage.setItem('neuro.tab', activeTab);
    set({ activeTab });
  },
  toggleSidebar: () =>
    set((s) => {
      const sidebarOpen = !s.sidebarOpen;
      localStorage.setItem('neuro.sidebar', sidebarOpen ? '1' : '0');
      return { sidebarOpen };
    }),
  toggleNav: () =>
    set((s) => {
      const navOpen = !s.navOpen;
      localStorage.setItem('neuro.nav', navOpen ? '1' : '0');
      return { navOpen };
    }),
  toggleTopBar: () => set((s) => ({ topBarOpen: !s.topBarOpen })),
  setImmersive: (immersive) => set({ immersive }),
  setGradient: (gradient) => {
    localStorage.setItem('neuro.grad', gradient ? '1' : '0');
    applyGradient(gradient);
    set({ gradient });
  },
  setNavWidth: (w) => {
    const navWidth = clamp(w, NAV_MIN, NAV_MAX);
    localStorage.setItem('neuro.navW', String(navWidth));
    set({ navWidth });
  },
  setSidebarWidth: (w) => {
    const sidebarWidth = clamp(w, SIDE_MIN, SIDE_MAX);
    localStorage.setItem('neuro.sideW', String(sidebarWidth));
    set({ sidebarWidth });
  },
  setAccent: (accent) => {
    localStorage.setItem('neuro.accent', JSON.stringify(accent));
    applyAccent(accent);
    set({ accent });
  },
  setLang: (lang) => {
    localStorage.setItem('neuro.lang', lang);
    set({ lang });
  },
  toggleHiddenAI: (id) =>
    set((s) => {
      const hiddenAI = s.hiddenAI.includes(id)
        ? s.hiddenAI.filter((x) => x !== id)
        : [...s.hiddenAI, id];
      localStorage.setItem('neuro.hiddenAI', JSON.stringify(hiddenAI));
      return { hiddenAI };
    }),
  saveGradientPreset: () =>
    set((s) => {
      if (s.gradientPresets.some((p) => p.from === s.accent.from && p.to === s.accent.to)) return s;
      const gradientPresets = [...s.gradientPresets, { ...s.accent }].slice(-24);
      localStorage.setItem('neuro.gradPresets', JSON.stringify(gradientPresets));
      return { gradientPresets };
    }),
  removeGradientPreset: (i) =>
    set((s) => {
      const gradientPresets = s.gradientPresets.filter((_, idx) => idx !== i);
      localStorage.setItem('neuro.gradPresets', JSON.stringify(gradientPresets));
      return { gradientPresets };
    }),
  setHotkey: (a, combo) =>
    set((s) => {
      const hotkeys = { ...s.hotkeys, [a]: combo };
      localStorage.setItem('neuro.hotkeys', JSON.stringify(hotkeys));
      return { hotkeys };
    }),
  resetHotkeys: () => {
    localStorage.setItem('neuro.hotkeys', JSON.stringify(DEFAULT_HOTKEYS));
    set({ hotkeys: { ...DEFAULT_HOTKEYS } });
  },
}));

// Apply persisted theme + accent + gradient immediately on module load.
applyThemeClass((localStorage.getItem('neuro.theme') as ThemeName) || 'dark');
applyAccent(loadAccent());
applyGradient(localStorage.getItem('neuro.grad') !== '0');
