// Shared constants used by both the Electron (main/preload) and renderer sides.

/**
 * "Xbox" DNS (xbox-dns.ru). Plain IPv4/IPv6 resolvers are used for Node-side
 * lookups; the DoH endpoint is what actually routes the embedded Chromium
 * (webview) traffic via app.configureHostResolver. See electron/dns.ts.
 */
export const XBOX_DNS_V4 = ['111.88.96.50', '111.88.96.51'] as const;
export const XBOX_DNS_V6 = ['2a00:ab00:1233:26::50', '2a00:ab00:1233:26::51'] as const;
export const XBOX_DNS = [...XBOX_DNS_V4, ...XBOX_DNS_V6] as const;

/** DNS-over-HTTPS endpoint — the supported way to force Chromium's resolver. */
export const XBOX_DOH = 'https://xbox-dns.ru/dns-query';

/** Hostname used to probe whether DNS resolution through XBOX_DNS works. */
export const DNS_PROBE_HOST = 'open.spotify.com';

/** Если хотя бы один из этих сайтов резолвится — DNS считаем рабочим. */
export const DNS_PROBE_HOSTS = ['claude.ai', 'chat.openai.com', 'gemini.google.com'];

/**
 * Лёгкое бесплатное авто-обновление: приложение скачивает этот JSON-манифест и
 * сравнивает версию. Хостить можно бесплатно на GitHub (raw-файл) или в Gist.
 * Формат: { "version": "0.2.0", "url": "https://.../NeuroHub Setup 0.2.0.exe", "notes": "..." }
 */
export const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/pongmailai-create/neurohub/main/latest.json';

/** Max number of clipboard entries kept in history. */
export const CLIPBOARD_HISTORY_LIMIT = 67;

/** Catalog of AI web apps shown in the AI Hub. */
export interface AIService {
  id: string;
  name: string;
  url: string;
  color: string; // tailwind-ish accent for the card
}

export const AI_SERVICES: AIService[] = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', color: '#d97757' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', color: '#10a37f' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', color: '#4285f4' },
  { id: 'qwen', name: 'Qwen', url: 'https://chat.qwen.ai', color: '#615ced' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', color: '#4d6bfe' },
  { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/chat', color: '#6467f2' },
  { id: 'grok', name: 'Grok', url: 'https://grok.com', color: '#1d9bf0' },
  { id: 'mistral', name: 'Mistral', url: 'https://chat.mistral.ai', color: '#fa520f' },
];

export const SPOTIFY_URL = 'https://open.spotify.com';

/** Домены рекламы/трекеров для встроенного блокировщика (суффиксное совпадение). */
export const AD_HOSTS: string[] = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'adservice.google.com',
  'adnxs.com',
  'adsystem.com',
  'amazon-adsystem.com',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'scorecardresearch.com',
  'quantserve.com',
  'moatads.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'casalemedia.com',
  'adsrvr.org',
  'mathtag.com',
  'bidswitch.net',
  'yieldmo.com',
  'zedo.com',
  'mgid.com',
  'propellerads.com',
  'popads.net',
  'ad.doubleclick.net',
  'hotjar.com',
  'mc.yandex.ru',
  'an.yandex.ru',
  'ads.yandex.ru',
  'facebook.net',
  'connect.facebook.net',
];

export type ThemeName = 'dark' | 'light' | 'cyberpunk' | 'blackhole';

/** IPC channel names — single source of truth for main <-> renderer contracts. */
export const IPC = {
  dnsStatus: 'dns:status',
  dnsApplyConfig: 'dns:apply',
  hashCompute: 'hash:compute',
  clipboardHistoryGet: 'clipboard:get',
  clipboardHistoryPush: 'clipboard:push', // main -> renderer (event)
  clipboardHistoryClear: 'clipboard:clear',
  screenshotSources: 'screenshot:sources',
  screenshotSave: 'screenshot:save',
  storeGet: 'store:get',
  storeSet: 'store:set',
  pluginsList: 'plugins:list',
  sessionClear: 'session:clear',
  vaultAvailable: 'vault:available',
  vaultList: 'vault:list',
  vaultSet: 'vault:set',
  vaultDelete: 'vault:delete',
  vaultImport: 'vault:import',
  adblockGet: 'adblock:get',
  adblockSet: 'adblock:set',
} as const;
