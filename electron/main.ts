import { app, BrowserWindow, session, ipcMain, shell } from 'electron';
import Store from 'electron-store';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDnsConfig,
  applyEarlyDnsSwitches,
  checkDnsStatus,
} from './dns';
import { registerIpc } from './ipc';
import { AI_SERVICES, AD_HOSTS, IPC, UPDATE_MANIFEST_URL } from '../shared/constants';

const cfg = new Store({ name: 'neurohub' });
let adblockOn = (cfg.get('adblock', true) as boolean) ?? true;
const adSet = new Set(AD_HOSTS);
function isAd(host: string): boolean {
  if (adSet.has(host)) return true;
  for (const a of AD_HOSTS) if (host.endsWith('.' + a)) return true;
  return false;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Прогрев БЕЗ ОЗУ: заранее резолвим DNS, открываем TCP/TLS-соединения и
 * кладём главный документ каждого сайта в дисковый кэш. webview при этом не
 * создаются — память не растёт, но первый клик по сайту открывается быстрее.
 */
function warmSites(ses: Electron.Session) {
  const urls = AI_SERVICES.map((s) => s.url);
  urls.forEach((url, i) => {
    setTimeout(
      () => {
        try {
          ses.resolveHost(new URL(url).hostname).catch(() => {});
        } catch {
          /* noop */
        }
        try {
          ses.preconnect({ url, numSockets: 2 });
        } catch {
          /* noop */
        }
        // Кладём ответ в дисковый кэш (без рендера, без ОЗУ).
        ses.fetch(url).then((r) => r.body?.cancel?.()).catch(() => {});
      },
      600 * i, // лесенкой, чтобы не нагружать сеть разом
    );
  });
}

// Vite injects these in dev; in prod we load the built files.
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
process.env.DIST = path.join(__dirname, '../dist');
process.env.PUBLIC = DEV_SERVER_URL ? path.join(__dirname, '../public') : process.env.DIST;

let mainWindow: BrowserWindow | null = null;

// Сравнение версий semver-ish: "0.2.0" > "0.1.9".
function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map((n) => parseInt(n, 10) || 0);
  const b = current.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return false;
}

// Лёгкая проверка обновления: качаем JSON-манифест и сравниваем версию.
async function checkForUpdate() {
  const current = app.getVersion();
  try {
    const res = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`);
    if (!res.ok) return { current, latest: current, url: '', notes: '', hasUpdate: false };
    const j: any = await res.json();
    const latest = String(j.version ?? current);
    return {
      current,
      latest,
      url: String(j.url ?? ''),
      notes: String(j.notes ?? ''),
      hasUpdate: isNewer(latest, current),
    };
  } catch {
    return { current, latest: current, url: '', notes: '', hasUpdate: false };
  }
}

// MUST run before `ready` — command-line switches are read during startup.
applyEarlyDnsSwitches();

// Скорость: крупный ДИСКОВЫЙ кэш (предзагрузка сайтов на диск, не в ОЗУ),
// быстрый back/forward, без лишнего расчёта перекрытия окон.
app.commandLine.appendSwitch('disk-cache-size', '524288000'); // 500 MB на диске
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('enable-features', 'AsyncDns,BackForwardCache');
// Скрываем признаки автоматизации — иногда снимает ошибку Google
// «этот браузер небезопасен» при входе во встроенном браузере.
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// Боковые кнопки мыши (назад/вперёд) и Ctrl+колесо (масштаб) для встроенных сайтов.
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() !== 'webview') return;
  const c = contents as any;
  c.on('app-command', (_ev: unknown, cmd: string) => {
    const nh = c.navigationHistory;
    if (cmd === 'browser-backward') {
      if (nh?.canGoBack?.()) nh.goBack();
      else if (c.canGoBack?.()) c.goBack();
    } else if (cmd === 'browser-forward') {
      if (nh?.canGoForward?.()) nh.goForward();
      else if (c.canGoForward?.()) c.goForward();
    }
  });
  c.on('zoom-changed', (_ev: unknown, dir: string) => {
    const z = contents.getZoomLevel();
    contents.setZoomLevel(dir === 'in' ? z + 0.5 : z - 0.5);
  });
  // Ctrl+F внутри сайта → открыть нашу панель поиска
  c.on('before-input-event', (event: any, input: any) => {
    if (input.type === 'keyDown' && input.control && (input.key === 'f' || input.key === 'F')) {
      event.preventDefault();
      mainWindow?.webContents.send('neuro:find-open');
    }
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b0f17',
    title: 'NeuroHub',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // ESM-preload (.mjs) не работает в sandbox — иначе window.neuro = undefined
      // (ломались сейф, DNS-статус, буфер и т.д.). Рендерер грузит только наши
      // локальные файлы, поэтому отключение sandbox здесь безопасно.
      sandbox: false,
      // <webview> is used to embed AI sites + Spotify; it shares this session
      // (and therefore the forced DoH resolver configuration).
      webviewTag: true,
      spellcheck: false,
      // Let hidden/background webviews throttle to reduce CPU & RAM pressure.
      backgroundThrottling: true,
    },
  });

  if (DEV_SERVER_URL) {
    // The Vite dev server may not be listening the instant Electron launches.
    // Retry the load a few times instead of failing with ERR_CONNECTION_REFUSED.
    const tryLoad = () => mainWindow?.loadURL(DEV_SERVER_URL).catch(() => {});
    mainWindow.webContents.on('did-fail-load', () => setTimeout(tryLoad, 400));
    tryLoad();
    if (process.env.NEURO_DEVTOOLS) mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'));
  }

  mainWindow.on('closed', () => (mainWindow = null));

  // Тихая проверка обновления через ~4 c после запуска.
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      const info = await checkForUpdate();
      if (info.hasUpdate) mainWindow?.webContents.send('neuro:update', info);
    }, 4000);
  });
}

app.whenReady().then(async () => {
  // Apply DNS to the default session before any embedded view loads.
  applyDnsConfig();

  // Present a clean desktop-Chrome UA so AI sites (Gemini/ChatGPT/etc.) serve the
  // full web app instead of an "unsupported browser" page. Apply ONLY to the
  // 'persist:neuro' partition the webviews use — NOT to the default session, so
  // the renderer keeps its Electron UA and our runtime detection stays correct.
  const chromeVersion = process.versions.chrome.split('.')[0];
  const CLEAN_UA =
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
    `(KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;

  const wvSession = session.fromPartition('persist:neuro');
  wvSession.setUserAgent(CLEAN_UA);

  // 1) Внедряем анти-детект preload во все встроенные страницы этой сессии.
  const preloadPath = path.join(__dirname, 'webview-preload.cjs');
  try {
    const anySes = wvSession as any;
    if (typeof anySes.registerPreloadScript === 'function') {
      anySes.registerPreloadScript({ type: 'frame', id: 'neuro-stealth', filePath: preloadPath });
    } else if (typeof anySes.setPreloads === 'function') {
      anySes.setPreloads([preloadPath]);
    }
  } catch (err) {
    console.warn('[stealth] preload register failed:', err);
  }

  // 2) Заголовки. Google блокирует любой Chromium-встроенный браузер, но пускает
  //    Firefox — поэтому для доменов Google прикидываемся Firefox (без Client
  //    Hints), а для всех остальных сайтов остаёмся Chrome (Cloudflare ок).
  const FIREFOX_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0';
  const chBrands = `"Google Chrome";v="${chromeVersion}", "Chromium";v="${chromeVersion}", "Not?A_Brand";v="99"`;
  const isGoogleHost = (host: string) =>
    host === 'google.com' ||
    host.endsWith('.google.com') ||
    host === 'accounts.youtube.com';

  wvSession.webRequest.onBeforeSendHeaders((details, cb) => {
    const h = details.requestHeaders;
    let host = '';
    try {
      host = new URL(details.url).hostname;
    } catch {
      /* noop */
    }
    if (isGoogleHost(host)) {
      h['User-Agent'] = FIREFOX_UA;
      // Firefox не шлёт Client Hints — удаляем их полностью.
      for (const k of Object.keys(h)) if (k.toLowerCase().startsWith('sec-ch-ua')) delete h[k];
    } else {
      h['User-Agent'] = CLEAN_UA;
      for (const k of Object.keys(h)) {
        const lk = k.toLowerCase();
        if (lk === 'sec-ch-ua') h[k] = chBrands;
        else if (lk === 'sec-ch-ua-full-version-list')
          h[k] = chBrands.replace(/v="(\d+)"/g, 'v="$1.0.0.0"');
        else if (lk === 'sec-ch-ua-mobile') h[k] = '?0';
        else if (lk === 'sec-ch-ua-platform') h[k] = '"Windows"';
      }
    }
    cb({ requestHeaders: h });
  });

  // 3) Блокировщик рекламы/трекеров (сетевой уровень).
  wvSession.webRequest.onBeforeRequest((details, cb) => {
    if (adblockOn) {
      try {
        if (isAd(new URL(details.url).hostname)) return cb({ cancel: true });
      } catch {
        /* noop */
      }
    }
    cb({});
  });
  ipcMain.handle(IPC.adblockGet, () => adblockOn);
  ipcMain.handle(IPC.adblockSet, (_e, v: boolean) => {
    adblockOn = v;
    cfg.set('adblock', v);
    return v;
  });

  // 4) Менеджер загрузок: системный диалог выбора папки + список с прогрессом.
  const downloads: any[] = [];
  let dlSeq = 0;
  const pushDl = () => mainWindow?.webContents.send('downloads:update', downloads.slice(0, 50));
  wvSession.on('will-download', (_e, item) => {
    const rec: any = {
      id: ++dlSeq,
      name: item.getFilename(),
      received: 0,
      total: item.getTotalBytes(),
      state: 'progressing',
      savePath: '',
    };
    downloads.unshift(rec);
    pushDl();
    item.on('updated', (_ev, state) => {
      rec.received = item.getReceivedBytes();
      rec.total = item.getTotalBytes();
      rec.state = state === 'interrupted' ? 'interrupted' : 'progressing';
      rec.savePath = item.getSavePath();
      pushDl();
    });
    item.once('done', (_ev, state) => {
      rec.state = state;
      rec.received = item.getReceivedBytes();
      rec.savePath = item.getSavePath();
      pushDl();
    });
  });
  ipcMain.handle('downloads:get', () => downloads.slice(0, 50));
  ipcMain.handle('downloads:open', (_e, p: string) => shell.openPath(p));
  ipcMain.handle('downloads:reveal', (_e, p: string) => shell.showItemInFolder(p));
  ipcMain.handle('shell:open', (_e, u: string) => shell.openExternal(u));

  ipcMain.handle('update:check', () => checkForUpdate());

  // Перевод набора строк (текстовых узлов страницы) в главном процессе —
  // обходит CSP сайта. Уникальные строки переводятся пулом, затем мапятся назад.
  ipcMain.handle('translate:texts', async (_e, payload: { texts: string[]; tl: string }) => {
    const { texts, tl } = payload;
    const uniq = Array.from(new Set(texts.filter((s) => s.trim()))).slice(0, 1200);
    const map = new Map<string, string>();
    let idx = 0;
    const worker = async () => {
      while (idx < uniq.length) {
        const s = uniq[idx++];
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(s)}`;
          const r = await fetch(url);
          const j = await r.json();
          map.set(s, (j[0] || []).map((x: any) => x[0]).join('') || s);
        } catch {
          map.set(s, s);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, uniq.length || 1) }, worker));
    return texts.map((s) => map.get(s) ?? s);
  });

  // Системный монитор: суммарные ОЗУ/ЦП всех процессов приложения.
  ipcMain.handle('metrics:get', () => {
    const list = app.getAppMetrics();
    let memKB = 0;
    let cpu = 0;
    for (const p of list) {
      memKB += p.memory.workingSetSize;
      cpu += p.cpu?.percentCPUUsage ?? 0;
    }
    return { memMB: Math.round(memKB / 1024), cpu: Math.round(cpu), procs: list.length };
  });

  registerIpc(() => mainWindow);
  await checkDnsStatus();
  createWindow();

  // Прогрев сайтов на диск (DNS + соединения + кэш), без webview в ОЗУ.
  // Запускаем чуть позже, чтобы не мешать первой отрисовке окна.
  setTimeout(() => warmSites(wvSession), 2500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
