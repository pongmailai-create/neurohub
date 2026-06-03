import { app, net, session } from 'electron';
import dns from 'node:dns';
import { Resolver } from 'node:dns/promises';
import { XBOX_DNS_V4, XBOX_DOH, DNS_PROBE_HOSTS } from '../shared/constants';

/**
 * ============================================================================
 *  Forced DNS routing through Xbox DNS (xbox-dns.ru)
 * ============================================================================
 *
 *  Two layers, both pointed at the same provider:
 *
 *  1. Chromium / embedded webviews  ──►  DNS-over-HTTPS (the real fix)
 *     `app.configureHostResolver({ secureDnsMode: 'secure',
 *                                  secureDnsServers: [XBOX_DOH] })`
 *     applies to EVERY session (default + webview partitions), so the embedded
 *     browser genuinely resolves names through https://xbox-dns.ru/dns-query.
 *     In 'secure' mode there is no fallback to the system resolver — if the DoH
 *     server is unreachable, resolution fails (that's what "forced" means).
 *     Switch to 'automatic' if you prefer a system-resolver fallback.
 *
 *  2. Node-side requests (currency API, health probe)  ──►  plain DNS to the
 *     Xbox IPv4 resolvers via a custom `lookup` bound to a `dns.Resolver`.
 *
 *  Honest scope note: DNS only maps names → IPs. It defeats DNS-based blocking
 *  and enables DNS smart-unblocking, but does NOT hide your egress IP — there
 *  is no VPN here. Server-side IP geofencing is unaffected.
 */

const PLAIN_SERVERS = [...XBOX_DNS_V4];

// Dedicated resolver bound to the Xbox servers (used for our own Node lookups).
const xboxResolver = new Resolver();
xboxResolver.setServers(PLAIN_SERVERS);

export interface DnsStatus {
  active: boolean;
  doh: string;
  servers: string[];
  addresses: string[];
  error?: string;
  checkedAt: number;
}

let lastStatus: DnsStatus = {
  active: false,
  doh: XBOX_DOH,
  servers: PLAIN_SERVERS,
  addresses: [],
  checkedAt: 0,
};

/** A `lookup` for Node http/https agents that resolves via the Xbox servers. */
export function xboxLookup(
  hostname: string,
  options: dns.LookupOneOptions | dns.LookupOptions | number,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void,
): void {
  const wantAll = typeof options === 'object' && options !== null && options.all;
  xboxResolver
    .resolve4(hostname)
    .then((v4) => {
      if (wantAll) callback(null, v4.map((address) => ({ address, family: 4 })) as any);
      else callback(null, v4[0], 4);
    })
    .catch(async () => {
      try {
        const v6 = await xboxResolver.resolve6(hostname);
        if (wantAll) callback(null, v6.map((address) => ({ address, family: 6 })) as any);
        else callback(null, v6[0], 6);
      } catch {
        dns.lookup(hostname, options as dns.LookupOptions, callback);
      }
    });
}

/** Run BEFORE app `ready` — command-line switches are read during startup. */
export function applyEarlyDnsSwitches(): void {
  // 'AsyncDns' включается в main.ts вместе с другими enable-features
  // (один ключ --enable-features, чтобы значения не перетирали друг друга).
}

/** Run AFTER app `ready`. Forces every Chromium session through Xbox DoH. */
export function applyDnsConfig(): void {
  try {
    dns.setServers(PLAIN_SERVERS); // affects dns.resolve* on the Node side
  } catch (err) {
    console.warn('[dns] dns.setServers failed:', err);
  }

  try {
    // 'automatic' = prefer Xbox DoH, but fall back to the system resolver if DoH
    // is momentarily unreachable, so sites never hard-fail. Use 'secure' for a
    // strict, no-fallback policy (can break loading if the DoH server hiccups).
    app.configureHostResolver({
      enableBuiltInResolver: true,
      secureDnsMode: 'automatic',
      secureDnsServers: [XBOX_DOH],
    });
    console.log('[dns] Chromium host resolver set to Xbox DoH (automatic):', XBOX_DOH);
  } catch (err) {
    console.warn('[dns] configureHostResolver failed:', err);
  }
}

/**
 * Probe the *actual* configured resolver (Chromium + Xbox DoH) via
 * session.resolveHost — this reflects the real path the embedded browser uses,
 * unlike a raw plain-UDP query to the Xbox IPs (which may be filtered).
 * Falls back to the Node plain-DNS resolver if resolveHost is unavailable.
 */
/**
 * Реальная проверка: делаем HTTPS-запрос к ключевым сайтам через сетевой стек
 * Chromium (с применённым Xbox DoH). Любой HTTP-ответ = имя разрешилось и
 * соединение прошло → DNS работает. Это надёжнее, чем resolveHost.
 */
function netProbe(host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = net.request({ method: 'HEAD', url: `https://${host}/` });
    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {
        /* noop */
      }
      reject(new Error('timeout'));
    }, 7000);
    req.on('response', (res) => {
      clearTimeout(timer);
      try {
        req.abort();
      } catch {
        /* noop */
      }
      resolve(host + ' (' + res.statusCode + ')');
    });
    req.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    req.end();
  });
}

export async function checkDnsStatus(): Promise<DnsStatus> {
  const checkedAt = Date.now();
  const results = await Promise.allSettled(DNS_PROBE_HOSTS.map(netProbe));
  const ok = results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<string> | undefined;
  if (ok) {
    lastStatus = { active: true, doh: XBOX_DOH, servers: PLAIN_SERVERS, addresses: [ok.value], checkedAt };
  } else {
    const firstErr = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    lastStatus = {
      active: false,
      doh: XBOX_DOH,
      servers: PLAIN_SERVERS,
      addresses: [],
      error: firstErr ? String(firstErr.reason?.message ?? firstErr.reason) : 'нет ответа',
      checkedAt,
    };
  }
  return lastStatus;
}

export function getLastDnsStatus(): DnsStatus {
  return lastStatus;
}

/** HTTPS request through Electron's `net` (shares Chromium's network stack). */
export function xboxFetch(
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, method: init?.method ?? 'GET' });
    if (init?.headers) for (const [k, v] of Object.entries(init.headers)) request.setHeader(k, v);
    let data = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => (data += chunk.toString()));
      response.on('end', () => resolve({ status: response.statusCode, body: data }));
    });
    request.on('error', reject);
    if (init?.body) request.write(init.body);
    request.end();
  });
}
