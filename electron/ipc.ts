import {
  ipcMain,
  clipboard,
  desktopCapturer,
  screen,
  dialog,
  BrowserWindow,
  app,
  session,
  safeStorage,
} from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import Store from 'electron-store';
import { IPC, CLIPBOARD_HISTORY_LIMIT } from '../shared/constants';
import { checkDnsStatus, getLastDnsStatus } from './dns';

const store = new Store({ name: 'neurohub' });

// ---------------------------------------------------------------------------
// Clipboard history — main process polls the system clipboard and pushes new
// text fragments to the renderer, keeping the last CLIPBOARD_HISTORY_LIMIT (67).
// ---------------------------------------------------------------------------
let clipboardHistory: { text: string; ts: number }[] =
  (store.get('clipboardHistory') as any[]) ?? [];
let lastClip = clipboard.readText();

function startClipboardWatcher(getWindow: () => BrowserWindow | null) {
  setInterval(() => {
    const text = clipboard.readText();
    if (text && text !== lastClip) {
      lastClip = text;
      clipboardHistory.unshift({ text, ts: Date.now() });
      clipboardHistory = clipboardHistory.slice(0, CLIPBOARD_HISTORY_LIMIT);
      store.set('clipboardHistory', clipboardHistory);
      getWindow()?.webContents.send(IPC.clipboardHistoryPush, clipboardHistory);
    }
  }, 1000);
}

// ---------------------------------------------------------------------------
// Зашифрованный сейф паролей. Записи шифруются через safeStorage (на Windows —
// DPAPI, ключ привязан к учётной записи ОС) и хранятся в electron-store.
// ---------------------------------------------------------------------------
interface VaultEntry {
  id: string;
  site: string;
  login: string;
  password: string;
}

function readVault(): VaultEntry[] {
  const enc = store.get('vault') as string | undefined;
  if (!enc) return [];
  try {
    const buf = Buffer.from(enc, 'base64');
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString('utf8');
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function writeVault(list: VaultEntry[]) {
  const json = JSON.stringify(list);
  const stored = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json).toString('base64')
    : Buffer.from(json, 'utf8').toString('base64');
  store.set('vault', stored);
}

/** Простейший разбор CSV (учитывает кавычки) → массив массивов. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function registerIpc(getWindow: () => BrowserWindow | null) {
  // ----- DNS status -----
  ipcMain.handle(IPC.dnsStatus, async () => checkDnsStatus());
  ipcMain.handle('dns:last', () => getLastDnsStatus());

  // ----- Hashing (MD5 / SHA-256) -----
  ipcMain.handle(IPC.hashCompute, (_e, text: string) => ({
    md5: crypto.createHash('md5').update(text).digest('hex'),
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
    sha1: crypto.createHash('sha1').update(text).digest('hex'),
  }));

  // ----- Screenshots (desktopCapturer) -----
  ipcMain.handle(IPC.screenshotSources, async () => {
    const { width, height } = screen.getPrimaryDisplay().size;
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width, height },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  });

  // Persist a screenshot (data URL) chosen/cropped in the renderer.
  ipcMain.handle(IPC.screenshotSave, async (_e, dataUrl: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save screenshot',
      defaultPath: path.join(
        app.getPath('pictures'),
        `neurohub-${Date.now()}.png`,
      ),
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (canceled || !filePath) return { saved: false };
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(filePath, base64, 'base64');
    return { saved: true, filePath };
  });

  // ----- Generic key/value store (notes, todos, settings, etc.) -----
  ipcMain.handle(IPC.storeGet, (_e, key: string, fallback: unknown) =>
    store.get(key, fallback),
  );
  ipcMain.handle(IPC.storeSet, (_e, key: string, value: unknown) => {
    store.set(key, value);
    return true;
  });

  // ----- Очистка данных сессии встроенного браузера -----
  ipcMain.handle(IPC.sessionClear, async (_e, what: 'cookies' | 'all') => {
    const s = session.fromPartition('persist:neuro');
    if (what === 'cookies') await s.clearStorageData({ storages: ['cookies'] });
    else await s.clearStorageData();
    return true;
  });

  // ----- Сейф паролей -----
  ipcMain.handle(IPC.vaultAvailable, () => safeStorage.isEncryptionAvailable());
  ipcMain.handle(IPC.vaultList, () => readVault());
  ipcMain.handle(IPC.vaultSet, (_e, entry: VaultEntry) => {
    const list = readVault();
    if (entry.id) {
      const i = list.findIndex((e) => e.id === entry.id);
      if (i >= 0) list[i] = entry;
      else list.push(entry);
    } else {
      list.push({ ...entry, id: crypto.randomUUID() });
    }
    writeVault(list);
    return readVault();
  });
  ipcMain.handle(IPC.vaultDelete, (_e, id: string) => {
    writeVault(readVault().filter((e) => e.id !== id));
    return readVault();
  });
  // Импорт CSV-экспорта браузера (Chrome/Edge: name,url,username,password)
  ipcMain.handle(IPC.vaultImport, (_e, csv: string) => {
    const rows = parseCsv(csv);
    if (rows.length < 2) return { imported: 0, total: readVault().length };
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const iUrl = header.indexOf('url');
    const iUser = header.findIndex((h) => h === 'username' || h === 'login');
    const iPass = header.indexOf('password');
    const list = readVault();
    let imported = 0;
    for (const r of rows.slice(1)) {
      const password = iPass >= 0 ? r[iPass] : '';
      const login = iUser >= 0 ? r[iUser] : '';
      if (!password && !login) continue;
      let site = iUrl >= 0 ? r[iUrl] : '';
      try {
        site = new URL(site).hostname;
      } catch {
        /* оставить как есть */
      }
      list.push({ id: crypto.randomUUID(), site, login, password });
      imported++;
    }
    writeVault(list);
    return { imported, total: list.length };
  });

  // ----- Plugins — scan the userData/plugins folder for manifest files -----
  ipcMain.handle(IPC.pluginsList, async () => {
    const dir = path.join(app.getPath('userData'), 'plugins');
    try {
      await fs.mkdir(dir, { recursive: true });
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const plugins = [] as { id: string; manifest: any; dir: string }[];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const manifestPath = path.join(dir, entry.name, 'plugin.json');
        try {
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
          plugins.push({ id: entry.name, manifest, dir: path.join(dir, entry.name) });
        } catch {
          /* skip folders without a valid manifest */
        }
      }
      return { dir, plugins };
    } catch (err) {
      return { dir, plugins: [], error: (err as Error).message };
    }
  });
}
