import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/constants';

/**
 * Safe, typed bridge exposed to the renderer as `window.neuro`.
 * Everything funnels through IPC — the renderer never touches Node directly.
 */
const api = {
  dns: {
    status: () => ipcRenderer.invoke(IPC.dnsStatus),
    last: () => ipcRenderer.invoke('dns:last'),
  },
  hash: (text: string) => ipcRenderer.invoke(IPC.hashCompute, text),
  clipboard: {
    get: () => ipcRenderer.invoke(IPC.clipboardHistoryGet),
    clear: () => ipcRenderer.invoke(IPC.clipboardHistoryClear),
    onPush: (cb: (history: { text: string; ts: number }[]) => void) => {
      const listener = (_e: unknown, h: any) => cb(h);
      ipcRenderer.on(IPC.clipboardHistoryPush, listener);
      return () => ipcRenderer.off(IPC.clipboardHistoryPush, listener);
    },
  },
  screenshot: {
    sources: () => ipcRenderer.invoke(IPC.screenshotSources),
    save: (dataUrl: string) => ipcRenderer.invoke(IPC.screenshotSave, dataUrl),
  },
  store: {
    get: <T>(key: string, fallback: T): Promise<T> =>
      ipcRenderer.invoke(IPC.storeGet, key, fallback),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC.storeSet, key, value),
  },
  openExternal: (u: string) => ipcRenderer.invoke('shell:open', u),
  update: {
    check: (): Promise<{ current: string; latest: string; url: string; notes: string; hasUpdate: boolean } | null> =>
      ipcRenderer.invoke('update:check'),
    onAvailable: (cb: (info: { current: string; latest: string; url: string; notes: string }) => void) => {
      const l = (_e: unknown, info: any) => cb(info);
      ipcRenderer.on('neuro:update', l);
      return () => ipcRenderer.off('neuro:update', l);
    },
  },
  translatePage: (texts: string[], tl: string): Promise<string[]> =>
    ipcRenderer.invoke('translate:texts', { texts, tl }),
  metrics: {
    get: (): Promise<{ memMB: number; cpu: number; procs: number }> =>
      ipcRenderer.invoke('metrics:get'),
  },
  plugins: {
    list: () => ipcRenderer.invoke(IPC.pluginsList),
  },
  session: {
    clear: (what: 'cookies' | 'all') => ipcRenderer.invoke(IPC.sessionClear, what),
  },
  adblock: {
    get: (): Promise<boolean> => ipcRenderer.invoke(IPC.adblockGet),
    set: (v: boolean): Promise<boolean> => ipcRenderer.invoke(IPC.adblockSet, v),
  },
  find: {
    onOpen: (cb: () => void) => {
      const l = () => cb();
      ipcRenderer.on('neuro:find-open', l);
      return () => ipcRenderer.off('neuro:find-open', l);
    },
  },
  downloads: {
    get: (): Promise<any[]> => ipcRenderer.invoke('downloads:get'),
    onUpdate: (cb: (list: any[]) => void) => {
      const l = (_e: unknown, list: any[]) => cb(list);
      ipcRenderer.on('downloads:update', l);
      return () => ipcRenderer.off('downloads:update', l);
    },
    open: (p: string) => ipcRenderer.invoke('downloads:open', p),
    reveal: (p: string) => ipcRenderer.invoke('downloads:reveal', p),
  },
  vault: {
    available: (): Promise<boolean> => ipcRenderer.invoke(IPC.vaultAvailable),
    list: (): Promise<{ id: string; site: string; login: string; password: string }[]> =>
      ipcRenderer.invoke(IPC.vaultList),
    set: (entry: { id?: string; site: string; login: string; password: string }) =>
      ipcRenderer.invoke(IPC.vaultSet, entry),
    remove: (id: string) => ipcRenderer.invoke(IPC.vaultDelete, id),
    importCsv: (csv: string): Promise<{ imported: number; total: number }> =>
      ipcRenderer.invoke(IPC.vaultImport, csv),
  },
};

contextBridge.exposeInMainWorld('neuro', api);

export type NeuroApi = typeof api;
